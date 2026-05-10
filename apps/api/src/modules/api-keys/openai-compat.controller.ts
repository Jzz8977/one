import { Body, Controller, Post, Req, UseGuards, UsePipes } from '@nestjs/common';
import type { Request } from 'express';
import { Public } from '../../common/decorators/public.decorator';
import { ApiKeyAuthGuard } from '../../common/guards/api-key.guard';
import { ZodValidationPipe } from '../../common/pipes/zod.pipe';
import { chatRequestSchema, type ChatRequestDto } from '@app/shared';
import { AiService } from '../ai/ai.service';

/**
 * 兼容 OpenAI 风格的 v1/chat/completions —— 使用 API Key 鉴权。
 * 路径不带 /api 前缀（main.ts setGlobalPrefix exclude），方便外部调用。
 */
@Public()
@UseGuards(ApiKeyAuthGuard)
@Controller('v1')
export class OpenAiCompatController {
  constructor(private ai: AiService) {}

  @Post('chat/completions')
  @UsePipes(new ZodValidationPipe(chatRequestSchema))
  async chat(@Body() dto: ChatRequestDto, @Req() req: Request & { user: { id: string }; apiKey?: { id: string } }) {
    const result = await this.ai.chat({ userId: req.user.id, apiKeyId: req.apiKey?.id, dto });
    // 构造 OpenAI 风格响应
    return {
      id: `chatcmpl-${result.id}`,
      object: 'chat.completion',
      created: Math.floor(Date.now() / 1000),
      model: result.model,
      choices: [
        {
          index: 0,
          message: result.message,
          finish_reason: 'stop',
        },
      ],
      usage: {
        prompt_tokens: result.usage.promptTokens,
        completion_tokens: result.usage.completionTokens,
        total_tokens: result.usage.totalTokens,
        credits_cost: result.usage.creditsCost,
      },
    };
  }
}
