import { useQuery } from '@tanstack/react-query';
import { Badge, Card, CardBody, PageHeader, Table } from '@app/ui';
import { api, unwrap } from '../lib/api';
import type { ApiResponse, CreditAccountDto, CreditTransactionDto, PageResult } from '@app/shared';

const TYPE_LABEL: Record<string, string> = {
  recharge: '充值',
  consume: '消费',
  refund: '退款',
  admin_adjust: '管理员调整',
  gift: '赠送',
  freeze: '冻结',
  unfreeze: '解冻',
};

export function CreditsPage() {
  const account = useQuery({
    queryKey: ['credits-account'],
    queryFn: async () => unwrap(await api.get<ApiResponse<CreditAccountDto>>('/credits/account')),
  });
  const txs = useQuery({
    queryKey: ['credits-tx'],
    queryFn: async () => unwrap(await api.get<ApiResponse<PageResult<CreditTransactionDto>>>('/credits/transactions?pageSize=50')),
  });

  return (
    <div>
      <PageHeader title="积分明细" />
      <Card className="mb-4">
        <CardBody>
          <div className="flex gap-12">
            <div>
              <div className="text-xs text-muted-foreground">可用</div>
              <div className="text-2xl font-bold text-primary">{account.data?.balance ?? 0}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">冻结</div>
              <div className="text-2xl font-bold text-amber-600">{account.data?.frozenBalance ?? 0}</div>
            </div>
          </div>
        </CardBody>
      </Card>
      <Table
        rowKey={(t) => t.id}
        data={txs.data?.items ?? []}
        loading={txs.isLoading}
        columns={[
          {
            key: 'type', title: '类型',
            render: (t) => <Badge tone={t.amount >= 0 ? 'green' : 'gray'}>{TYPE_LABEL[t.type] ?? t.type}</Badge>,
          },
          {
            key: 'amount', title: '变动',
            render: (t) => (
              <span className={t.amount >= 0 ? 'text-emerald-600' : 'text-red-600'}>
                {t.amount >= 0 ? '+' : ''}{t.amount}
              </span>
            ),
          },
          { key: 'balanceAfter', title: '余额' },
          { key: 'remark', title: '备注', render: (t) => t.remark ?? '-' },
          { key: 'createdAt', title: '时间', render: (t) => new Date(t.createdAt).toLocaleString() },
        ]}
      />
    </div>
  );
}
