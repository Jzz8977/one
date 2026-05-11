import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Badge, Button, Input, PageHeader, Table } from '@app/ui';
import { api, unwrap } from '../lib/api';
import type { ApiResponse, PageResult } from '@app/shared';

interface AdminUserRow {
  id: string; email: string; status: string;
  nickname: string | null; creditBalance: number; createdAt: string;
}

export function UsersPage() {
  const [keyword, setKeyword] = useState('');
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['admin-users', keyword],
    queryFn: async () => unwrap(await api.get<ApiResponse<PageResult<AdminUserRow>>>(`/admin/users?keyword=${encodeURIComponent(keyword)}`)),
  });
  return (
    <div>
      <PageHeader title="用户管理" />
      <div className="mb-4 flex gap-2">
        <div className="w-72"><Input placeholder="邮箱 / 昵称" value={keyword} onChange={(e) => setKeyword(e.target.value)} /></div>
        <Button onClick={() => refetch()}>搜索</Button>
      </div>
      <Table
        rowKey={(u) => u.id}
        data={data?.items ?? []}
        loading={isLoading}
        columns={[
          { key: 'email', title: '邮箱' },
          { key: 'nickname', title: '昵称', render: (u) => u.nickname ?? '-' },
          { key: 'creditBalance', title: '积分' },
          { key: 'status', title: '状态', render: (u) => <Badge tone={u.status === 'active' ? 'green' : 'red'}>{u.status}</Badge> },
          { key: 'createdAt', title: '注册时间', render: (u) => new Date(u.createdAt).toLocaleString() },
          { key: 'op', title: '操作', render: (u) => <Link className="text-primary hover:underline" to={`/admin/users/${u.id}`}>详情</Link> },
        ]}
      />
    </div>
  );
}
