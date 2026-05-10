import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Badge, Button, Card, CardBody, PageHeader, Table, useToast } from '@app/ui';
import { api, unwrap } from '../lib/api';
import { formatApiError } from '../lib/error';
import type { ApiResponse, OrderDto, PageResult, ProductDto } from '@app/shared';

export function BillingPage() {
  const toast = useToast();
  const qc = useQueryClient();
  const products = useQuery({
    queryKey: ['products'],
    queryFn: async () => unwrap(await api.get<ApiResponse<ProductDto[]>>('/products')),
  });
  const orders = useQuery({
    queryKey: ['my-orders'],
    queryFn: async () => unwrap(await api.get<ApiResponse<PageResult<OrderDto>>>('/orders?pageSize=20')),
  });

  const buy = async (productId: string) => {
    try {
      const order = unwrap(await api.post<ApiResponse<OrderDto>>('/orders', { productId, paymentMethod: 'mock' }));
      await api.post(`/payments/mock/success/${order.id}`);
      toast.success('支付成功，积分已到账');
      qc.invalidateQueries({ queryKey: ['my-orders'] });
      qc.invalidateQueries({ queryKey: ['credits-account'] });
    } catch (err) {
      toast.error(formatApiError(err, '支付失败'));
    }
  };

  return (
    <div>
      <PageHeader title="充值套餐" description="演示模式：模拟支付立即到账" />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        {products.data?.map((p) => (
          <Card key={p.id}>
            <CardBody>
              <div className="text-base font-semibold">{p.name}</div>
              <div className="mt-1 text-xs text-slate-500">{p.description}</div>
              <div className="mt-3 flex items-baseline gap-1">
                <span className="text-2xl font-bold text-brand-700">¥{(p.price / 100).toFixed(2)}</span>
                <span className="text-xs text-slate-400">/ {p.credits} 积分</span>
              </div>
              <Button className="mt-4 w-full" onClick={() => buy(p.id)}>立即购买</Button>
            </CardBody>
          </Card>
        ))}
      </div>

      <h3 className="mt-8 mb-3 text-base font-semibold">最近订单</h3>
      <Table
        rowKey={(o) => o.id}
        data={orders.data?.items ?? []}
        loading={orders.isLoading}
        columns={[
          { key: 'orderNo', title: '订单号' },
          { key: 'productName', title: '商品' },
          { key: 'amount', title: '金额', render: (o) => `¥${(o.amount / 100).toFixed(2)}` },
          { key: 'credits', title: '积分' },
          {
            key: 'status',
            title: '状态',
            render: (o) => (
              <Badge tone={o.status === 'paid' ? 'green' : o.status === 'pending' ? 'yellow' : 'gray'}>{o.status}</Badge>
            ),
          },
          { key: 'createdAt', title: '创建时间', render: (o) => new Date(o.createdAt).toLocaleString() },
        ]}
      />
    </div>
  );
}
