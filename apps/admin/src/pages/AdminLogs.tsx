import { useQuery } from '@tanstack/react-query';
import { PageHeader, Table } from '@app/ui';
import { api, unwrap } from '../lib/api';
import type { ApiResponse, PageResult } from '@app/shared';

interface Log {
  id: string; adminId: string; adminEmail: string; action: string;
  target: string | null; ip: string | null; createdAt: string;
}

export function AdminLogsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin-logs'],
    queryFn: async () => unwrap(await api.get<ApiResponse<PageResult<Log>>>('/admin/logs?pageSize=50')),
  });
  return (
    <div>
      <PageHeader title="管理员操作日志" />
      <Table
        rowKey={(l) => l.id}
        data={data?.items ?? []}
        loading={isLoading}
        columns={[
          { key: 'createdAt', title: '时间', render: (l) => new Date(l.createdAt).toLocaleString() },
          { key: 'adminEmail', title: '管理员' },
          { key: 'action', title: '动作' },
          { key: 'target', title: '目标', render: (l) => l.target ?? '-' },
          { key: 'ip', title: 'IP', render: (l) => l.ip ?? '-' },
        ]}
      />
    </div>
  );
}
