import { useQuery } from '@tanstack/react-query';
import { Card, CardBody, PageHeader } from '@app/ui';
import { api, unwrap } from '../lib/api';
import type { ApiResponse, DashboardStatsDto } from '@app/shared';

const STATS: Array<{ label: string; key: keyof DashboardStatsDto; format?: (v: number) => string }> = [
  { label: '总用户数', key: 'userCount' },
  { label: '今日新增', key: 'newUserToday' },
  { label: '订单总数', key: 'orderCount' },
  { label: '今日支付金额', key: 'paidAmountToday', format: (v) => `¥${(v / 100).toFixed(2)}` },
  { label: '今日 AI 调用', key: 'aiCallToday' },
  { label: '今日积分消耗', key: 'creditsConsumedToday' },
];

export function DashboardPage() {
  const { data } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: async () => unwrap(await api.get<ApiResponse<DashboardStatsDto>>('/admin/dashboard')),
  });
  return (
    <div>
      <PageHeader title="数据概览" />
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        {STATS.map((s) => (
          <Card key={s.key}>
            <CardBody>
              <div className="text-xs text-slate-500">{s.label}</div>
              <div className="mt-2 text-2xl font-semibold text-brand-700">
                {data ? (s.format ? s.format(data[s.key]) : data[s.key]) : '—'}
              </div>
            </CardBody>
          </Card>
        ))}
      </div>
    </div>
  );
}
