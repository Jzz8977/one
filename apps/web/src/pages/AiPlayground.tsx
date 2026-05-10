import { useEffect, useState } from 'react';
import { Button, Card, CardBody, PageHeader, Textarea, useToast } from '@app/ui';
import { api, unwrap } from '../lib/api';
import { formatApiError } from '../lib/error';
import type { AiModelDto, ApiResponse, ChatResponseDto } from '@app/shared';

export function AiPlaygroundPage() {
  const toast = useToast();
  const [models, setModels] = useState<AiModelDto[]>([]);
  const [model, setModel] = useState<string>('');
  const [prompt, setPrompt] = useState('简单介绍一下你自己');
  const [loading, setLoading] = useState(false);
  const [reply, setReply] = useState<ChatResponseDto | null>(null);

  useEffect(() => {
    api.get<ApiResponse<AiModelDto[]>>('/ai/models').then((r) => {
      const list = unwrap(r);
      setModels(list);
      if (list[0]) setModel(list[0].code);
    });
  }, []);

  const send = async () => {
    if (!model) return;
    setLoading(true);
    setReply(null);
    try {
      const resp = await api.post<ApiResponse<ChatResponseDto>>('/ai/chat', {
        model,
        messages: [{ role: 'user', content: prompt }],
      });
      setReply(unwrap(resp));
    } catch (err) {
      toast.error(formatApiError(err, '调用失败'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <PageHeader title="AI Playground" description="试用模型，按 token 扣积分" />
      <Card>
        <CardBody>
          <label className="mb-2 block text-sm font-medium">模型</label>
          <select
            className="mb-4 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
            value={model}
            onChange={(e) => setModel(e.target.value)}
          >
            {models.map((m) => (
              <option key={m.id} value={m.code}>{m.name}（{m.code}）</option>
            ))}
          </select>
          <Textarea label="Prompt" rows={5} value={prompt} onChange={(e) => setPrompt(e.target.value)} />
          <Button className="mt-4" onClick={send} loading={loading}>发送</Button>
          {reply ? (
            <div className="mt-6 rounded-md border border-slate-200 bg-slate-50 p-4">
              <div className="mb-2 text-xs text-slate-500">
                {reply.usage.promptTokens} prompt + {reply.usage.completionTokens} completion = {reply.usage.totalTokens} tokens · 消耗 {reply.usage.creditsCost} 积分
              </div>
              <div className="whitespace-pre-wrap text-sm text-slate-800">{reply.message.content}</div>
            </div>
          ) : null}
        </CardBody>
      </Card>
    </div>
  );
}
