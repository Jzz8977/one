import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Badge, Button, Input, PageHeader, Table } from '@app/ui';
import { api, unwrap } from '../lib/api';
import type { ApiResponse, PageResult } from '@app/shared';

interface Row {
  id: string; userId: string; userEmail: string; provider: string; model: string;
  promptTokens: number; completionTokens: number; totalTokens: number;
  creditsCost: number; status: string; errorMessage: string | null;
  durationMs: number | null; createdAt: string;
}

export function AiLogsPage() {
  const [keyword, setKeyword] = useState('');
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['admin-ai-logs', keyword],
    queryFn: async () => unwrap(await api.get<ApiResponse<PageResult<Row>>>(`/admin/ai/logs?keyword=${encodeURIComponent(keyword)}`)),
  });
  return (
    <div>
      <PageHeader title="AI 调用日志" />
      <div className="mb-4 flex gap-2">
        <div className="w-72"><Input placeholder="用户邮箱 / 模型" value={keyword} onChange={(e) => setKeyword(e.target.value)} /></div>
        <Button onClick={() => refetch()}>搜索</Button>
      </div>
      <Table
        rowKey={(l) => l.id}
        data={data?.items ?? []}
        loading={isLoading}
        columns={[
          { key: 'createdAt', title: '时间', render: (l) => new Date(l.createdAt).toLocaleString() },
          { key: 'userEmail', title: '用户' },
          { key: 'model', title: '模型', render: (l) => `${l.provider}/${l.model}` },
          { key: 'tokens', title: 'Tokens', render: (l) => `${l.promptTokens}/${l.completionTokens}/${l.totalTokens}` },
          { key: 'creditsCost', title: '积分' },
          { key: 'duration', title: '耗时', render: (l) => l.durationMs ? `${l.durationMs}ms` : '-' },
          { key: 'status', title: '状态', render: (l) => <Badge tone={l.status === 'success' ? 'green' : 'red'}>{l.status}</Badge> },
        ]}
      />
    </div>
  );
}
