import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Badge,
  Button,
  Input,
  PageHeader,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Table,
} from '@app/ui';
import { api, unwrap } from '../lib/api';
import type { ApiResponse, PageResult } from '@app/shared';

interface Row {
  id: string; orderNo: string; userId: string; userEmail: string;
  productName: string | null; amount: number; credits: number; status: string;
  createdAt: string; paidAt: string | null;
}

export function OrdersPage() {
  const [keyword, setKeyword] = useState('');
  const [status, setStatus] = useState('');
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['admin-orders', keyword, status],
    queryFn: async () => unwrap(
      await api.get<ApiResponse<PageResult<Row>>>(`/admin/orders?keyword=${encodeURIComponent(keyword)}&status=${status}`),
    ),
  });
  return (
    <div>
      <PageHeader title="订单管理" />
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="w-72"><Input placeholder="订单号 / 用户邮箱" value={keyword} onChange={(e) => setKeyword(e.target.value)} /></div>
        <Select value={status || 'all'} onValueChange={(v) => setStatus(v === 'all' ? '' : v)}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="全部状态" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部状态</SelectItem>
            <SelectItem value="pending">待支付</SelectItem>
            <SelectItem value="paid">已支付</SelectItem>
            <SelectItem value="closed">已关闭</SelectItem>
            <SelectItem value="refunded">已退款</SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={() => refetch()}>搜索</Button>
      </div>
      <Table
        rowKey={(o) => o.id}
        data={data?.items ?? []}
        loading={isLoading}
        columns={[
          { key: 'orderNo', title: '订单号' },
          { key: 'userEmail', title: '用户' },
          { key: 'productName', title: '商品' },
          { key: 'amount', title: '金额', render: (o) => `¥${(o.amount / 100).toFixed(2)}` },
          { key: 'credits', title: '积分' },
          { key: 'status', title: '状态', render: (o) => <Badge tone={o.status === 'paid' ? 'green' : 'gray'}>{o.status}</Badge> },
          { key: 'createdAt', title: '创建时间', render: (o) => new Date(o.createdAt).toLocaleString() },
        ]}
      />
    </div>
  );
}
