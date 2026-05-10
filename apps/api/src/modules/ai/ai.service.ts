import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import axios, { AxiosError } from 'axios';
import { PrismaService } from '../../prisma/prisma.service';
import { CreditsService } from '../credits/credits.service';
import { AI_USAGE_STATUS, type ChatRequestDto } from '@app/shared';
import { loadEnv } from '../../config/env';
import { pageOf, pageResult } from '../../common/utils/pagination';

interface ProviderRuntime {
  baseUrl: string;
  apiKey: string;
}

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  constructor(private prisma: PrismaService, private credits: CreditsService) {}

  async listProviders() {
    const providers = await this.prisma.aiProvider.findMany({
      where: { active: true },
      orderBy: { createdAt: 'asc' },
    });
    return providers.map((p) => ({
      id: p.id,
      code: p.code,
      name: p.name,
      baseUrl: p.baseUrl,
      active: p.active,
    }));
  }

  async listModels() {
    const models = await this.prisma.aiModel.findMany({
      where: { active: true, provider: { active: true } },
      include: { provider: true },
      orderBy: [{ provider: { name: 'asc' } }, { name: 'asc' }],
    });
    return models.map((m) => ({
      id: m.id,
      providerId: m.providerId,
      providerCode: m.provider.code,
      code: m.code,
      name: m.name,
      inputPricePerKToken: m.inputPricePerKToken,
      outputPricePerKToken: m.outputPricePerKToken,
      active: m.active,
    }));
  }

  async listUsageLogs(userId: string, query: { page?: number; pageSize?: number }) {
    const params = pageOf(query);
    const [items, total] = await this.prisma.$transaction([
      this.prisma.aiUsageLog.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip: params.skip,
        take: params.take,
      }),
      this.prisma.aiUsageLog.count({ where: { userId } }),
    ]);
    return pageResult(items.map((it) => this.toLogDto(it)), total, params);
  }

  toLogDto(it: {
    id: string; userId: string; provider: string; model: string;
    promptTokens: number; completionTokens: number; totalTokens: number;
    creditsCost: number; status: string; errorMessage: string | null; createdAt: Date;
  }) {
    return {
      id: it.id,
      userId: it.userId,
      provider: it.provider,
      model: it.model,
      promptTokens: it.promptTokens,
      completionTokens: it.completionTokens,
      totalTokens: it.totalTokens,
      creditsCost: it.creditsCost,
      status: it.status,
      errorMessage: it.errorMessage,
      createdAt: it.createdAt.toISOString(),
    };
  }

  private getRuntime(providerCode: string): ProviderRuntime {
    const env = loadEnv();
    switch (providerCode) {
      case 'openai':
        return { baseUrl: env.OPENAI_BASE_URL, apiKey: env.OPENAI_API_KEY };
      case 'openrouter':
        return { baseUrl: env.OPENROUTER_BASE_URL, apiKey: env.OPENROUTER_API_KEY };
      case 'siliconflow':
        return { baseUrl: env.SILICONFLOW_BASE_URL, apiKey: env.SILICONFLOW_API_KEY };
      default:
        return { baseUrl: '', apiKey: '' };
    }
  }

  /**
   * 估算预扣积分：按 messages 字符数 / 4 估算 prompt tokens，
   * + 上限 maxTokens 作为 completion 的最坏估计。然后再用模型价格转积分。
   */
  private estimateCredits(model: { inputPricePerKToken: number; outputPricePerKToken: number }, dto: ChatRequestDto): number {
    const charCount = dto.messages.reduce((s, m) => s + m.content.length, 0);
    const estPrompt = Math.max(64, Math.ceil(charCount / 4));
    const estCompletion = dto.maxTokens ?? 1024;
    const inputCost = Math.ceil((estPrompt * model.inputPricePerKToken) / 1000);
    const outputCost = Math.ceil((estCompletion * model.outputPricePerKToken) / 1000);
    return Math.max(1, inputCost + outputCost);
  }

  private actualCredits(
    model: { inputPricePerKToken: number; outputPricePerKToken: number },
    promptTokens: number,
    completionTokens: number,
  ): number {
    const inputCost = Math.ceil((promptTokens * model.inputPricePerKToken) / 1000);
    const outputCost = Math.ceil((completionTokens * model.outputPricePerKToken) / 1000);
    return Math.max(1, inputCost + outputCost);
  }

  async chat(opts: { userId: string; apiKeyId?: string; dto: ChatRequestDto }) {
    const model = await this.prisma.aiModel.findFirst({
      where: { code: opts.dto.model, active: true, provider: { active: true } },
      include: { provider: true },
    });
    if (!model) throw new NotFoundException(`模型 ${opts.dto.model} 不存在或未启用`);

    const runtime = this.getRuntime(model.provider.code);
    if (!runtime.apiKey) {
      throw new BadRequestException(`未配置 ${model.provider.code} 的 API Key`);
    }

    // 1. 预扣（冻结）
    const estimate = this.estimateCredits(model, opts.dto);
    await this.credits.freeze(opts.userId, estimate, 'ai-call', undefined);

    const start = Date.now();
    try {
      const url = `${runtime.baseUrl.replace(/\/+$/, '')}/chat/completions`;
      const resp = await axios.post(
        url,
        {
          model: model.code,
          messages: opts.dto.messages,
          temperature: opts.dto.temperature,
          max_tokens: opts.dto.maxTokens,
          stream: false,
        },
        {
          headers: {
            Authorization: `Bearer ${runtime.apiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 60_000,
        },
      );

      const data = resp.data as {
        id?: string;
        choices: Array<{ message: { role: string; content: string } }>;
        usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
      };
      const promptTokens = data.usage?.prompt_tokens ?? 0;
      const completionTokens = data.usage?.completion_tokens ?? 0;
      const totalTokens = data.usage?.total_tokens ?? promptTokens + completionTokens;
      const cost = this.actualCredits(model, promptTokens, completionTokens);

      // 2. 解冻 + 实际扣费
      await this.credits.settleFrozen(opts.userId, estimate, cost, 'ai-call', undefined);

      const log = await this.prisma.aiUsageLog.create({
        data: {
          userId: opts.userId,
          apiKeyId: opts.apiKeyId,
          provider: model.provider.code,
          model: model.code,
          promptTokens,
          completionTokens,
          totalTokens,
          creditsCost: cost,
          status: AI_USAGE_STATUS.SUCCESS,
          durationMs: Date.now() - start,
        },
      });

      const choice = data.choices?.[0]?.message ?? { role: 'assistant', content: '' };
      return {
        id: log.id,
        model: model.code,
        message: { role: choice.role as 'assistant', content: choice.content },
        usage: { promptTokens, completionTokens, totalTokens, creditsCost: cost },
      };
    } catch (err) {
      // 失败：全额退还冻结积分
      await this.credits.settleFrozen(opts.userId, estimate, 0, 'ai-call', undefined);
      const message = err instanceof AxiosError
        ? `AI 调用失败: ${err.response?.status ?? ''} ${err.message}`
        : err instanceof Error
        ? err.message
        : 'AI 调用失败';
      const status = err instanceof AxiosError && err.code === 'ECONNABORTED' ? AI_USAGE_STATUS.TIMEOUT : AI_USAGE_STATUS.FAILED;

      await this.prisma.aiUsageLog.create({
        data: {
          userId: opts.userId,
          apiKeyId: opts.apiKeyId,
          provider: model.provider.code,
          model: model.code,
          status,
          errorMessage: message,
          durationMs: Date.now() - start,
        },
      });
      this.logger.warn(`AI call failed user=${opts.userId} model=${model.code} ${message}`);
      throw new BadRequestException(message);
    }
  }
}
