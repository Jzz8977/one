import { useQuery } from '@tanstack/react-query';
import { Badge, PageHeader, Table } from '@app/ui';
import { api, unwrap } from '../lib/api';
import type { AiUsageLogDto, ApiResponse, PageResult } from '@app/shared';

export function UsageLogsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['usage-logs'],
    queryFn: async () => unwrap(await api.get<ApiResponse<PageResult<AiUsageLogDto>>>('/ai/usage-logs?pageSize=50')),
  });
  return (
    <div>
      <PageHeader title="调用日志" />
      <Table
        rowKey={(l) => l.id}
        data={data?.items ?? []}
        loading={isLoading}
        columns={[
          { key: 'createdAt', title: '时间', render: (l) => new Date(l.createdAt).toLocaleString() },
          { key: 'provider', title: 'Provider' },
          { key: 'model', title: '模型' },
          { key: 'totalTokens', title: 'Tokens', render: (l) => `${l.promptTokens}/${l.completionTokens}/${l.totalTokens}` },
          { key: 'creditsCost', title: '积分' },
          {
            key: 'status', title: '状态',
            render: (l) => <Badge tone={l.status === 'success' ? 'green' : 'red'}>{l.status}</Badge>,
          },
          { key: 'errorMessage', title: '错误', render: (l) => l.errorMessage ?? '-' },
        ]}
      />
    </div>
  );
}
