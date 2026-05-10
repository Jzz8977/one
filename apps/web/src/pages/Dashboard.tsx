import { useQuery } from '@tanstack/react-query';
import { Card, CardBody, PageHeader } from '@app/ui';
import { api, unwrap } from '../lib/api';
import type { ApiResponse, CreditAccountDto } from '@app/shared';
import { useAuthStore } from '../store/auth';

export function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const { data: account } = useQuery({
    queryKey: ['credits-account'],
    queryFn: async () =>
      unwrap(await api.get<ApiResponse<CreditAccountDto>>('/credits/account')),
  });
  return (
    <div>
      <PageHeader title={`你好，${user?.nickname ?? user?.email ?? ''}`} description="欢迎回到控制台" />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card>
          <CardBody>
            <div className="text-sm text-slate-500">可用积分</div>
            <div className="mt-2 text-3xl font-semibold text-brand-700">{account?.balance ?? 0}</div>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <div className="text-sm text-slate-500">冻结积分</div>
            <div className="mt-2 text-3xl font-semibold text-amber-600">{account?.frozenBalance ?? 0}</div>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <div className="text-sm text-slate-500">账户状态</div>
            <div className="mt-2 text-2xl font-semibold text-emerald-600">正常</div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
