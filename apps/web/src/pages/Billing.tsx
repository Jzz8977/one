import { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { QRCodeSVG } from 'qrcode.react';
import {
  Badge,
  Button,
  Card,
  CardBody,
  Modal,
  PageHeader,
  Spinner,
  Table,
  useToast,
} from '@app/ui';
import { api, unwrap } from '../lib/api';
import { formatApiError } from '../lib/error';
import type { ApiResponse, OrderDto, PageResult, ProductDto } from '@app/shared';

type Method = 'mock' | 'wechat';

interface QrState {
  order: OrderDto;
  productName: string;
  amount: number;
}

export function BillingPage() {
  const toast = useToast();
  const qc = useQueryClient();
  const [qr, setQr] = useState<QrState | null>(null);
  const [paid, setPaid] = useState(false);

  // 获取微信支付配置状态（按钮可不可点）
  const wechatStatus = useQuery({
    queryKey: ['wechat-status'],
    queryFn: async () => unwrap(await api.get<ApiResponse<{ ok: boolean; missing: string[] }>>('/payments/wechat/status')),
  });

  const products = useQuery({
    queryKey: ['products'],
    queryFn: async () => unwrap(await api.get<ApiResponse<ProductDto[]>>('/products')),
  });
  const orders = useQuery({
    queryKey: ['my-orders'],
    queryFn: async () => unwrap(await api.get<ApiResponse<PageResult<OrderDto>>>('/orders?pageSize=20')),
  });

  // QR 弹窗打开后启动轮询
  const pollRef = useRef<number | null>(null);
  useEffect(() => {
    if (!qr) {
      if (pollRef.current) window.clearInterval(pollRef.current);
      pollRef.current = null;
      return;
    }
    setPaid(false);
    const tick = async () => {
      try {
        const order = unwrap(await api.get<ApiResponse<OrderDto>>(`/orders/${qr.order.id}`));
        if (order.status === 'paid') {
          setPaid(true);
          if (pollRef.current) window.clearInterval(pollRef.current);
          pollRef.current = null;
          toast.success('支付成功，积分已到账');
          qc.invalidateQueries({ queryKey: ['my-orders'] });
          qc.invalidateQueries({ queryKey: ['credits-account'] });
          window.setTimeout(() => setQr(null), 1500);
        }
      } catch {}
    };
    pollRef.current = window.setInterval(tick, 2500);
    return () => {
      if (pollRef.current) window.clearInterval(pollRef.current);
    };
  }, [qr, toast, qc]);

  const buy = async (product: ProductDto, method: Method) => {
    try {
      const order = unwrap(
        await api.post<ApiResponse<OrderDto>>('/orders', { productId: product.id, paymentMethod: method }),
      );
      if (method === 'mock') {
        await api.post(`/payments/mock/success/${order.id}`);
        toast.success('支付成功，积分已到账');
        qc.invalidateQueries({ queryKey: ['my-orders'] });
        qc.invalidateQueries({ queryKey: ['credits-account'] });
      } else if (method === 'wechat') {
        if (!order.codeUrl) {
          toast.error('微信下单未返回二维码地址');
          return;
        }
        setQr({ order, productName: product.name, amount: product.price });
      }
    } catch (err) {
      toast.error(formatApiError(err, '下单失败'));
    }
  };

  return (
    <div>
      <PageHeader title="充值套餐" description="支持模拟支付（演示）和微信扫码支付" />

      {!wechatStatus.data?.ok && wechatStatus.data ? (
        <Card className="mb-4 border-amber-200 bg-amber-50">
          <CardBody>
            <div className="text-sm text-amber-800">
              <strong>微信支付未配置完整：</strong>
              {wechatStatus.data.missing.join('，')}
              <span className="ml-1">（仅「模拟支付」可用）</span>
            </div>
          </CardBody>
        </Card>
      ) : null}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        {products.data?.map((p) => (
          <Card key={p.id}>
            <CardBody>
              <div className="text-base font-semibold">{p.name}</div>
              <div className="mt-1 text-xs text-muted-foreground">{p.description}</div>
              <div className="mt-3 flex items-baseline gap-1">
                <span className="text-2xl font-bold text-primary">¥{(p.price / 100).toFixed(2)}</span>
                <span className="text-xs text-muted-foreground">/ {p.credits} 积分</span>
              </div>
              <div className="mt-4 flex gap-2">
                <Button className="flex-1" variant="outline" onClick={() => buy(p, 'mock')}>
                  模拟支付
                </Button>
                <Button
                  className="flex-1"
                  onClick={() => buy(p, 'wechat')}
                  disabled={!wechatStatus.data?.ok}
                  title={!wechatStatus.data?.ok ? '微信支付未配置' : undefined}
                >
                  微信支付
                </Button>
              </div>
            </CardBody>
          </Card>
        ))}
      </div>

      <h3 className="mb-3 mt-8 text-base font-semibold">最近订单</h3>
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

      <Modal
        open={!!qr}
        onClose={() => setQr(null)}
        title="微信扫码支付"
        description={qr ? `${qr.productName} · ¥${(qr.amount / 100).toFixed(2)}` : ''}
      >
        {qr ? (
          <div className="flex flex-col items-center gap-3 py-2">
            {paid ? (
              <div className="text-2xl font-semibold text-emerald-600">✓ 支付成功</div>
            ) : (
              <>
                <div className="rounded-lg border bg-white p-4">
                  <QRCodeSVG value={qr.order.codeUrl ?? ''} size={220} />
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Spinner /> 等待用户扫码并完成支付...
                </div>
                <div className="text-xs text-muted-foreground">订单号：{qr.order.orderNo}</div>
              </>
            )}
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
