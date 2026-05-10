import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Badge, Button, Card, CardBody, Input, PageHeader, useToast } from '@app/ui';
import { api, unwrap } from '../lib/api';
import type { ApiResponse } from '@app/shared';

interface UserDetail {
  id: string; email: string; status: string; phone: string | null;
  nickname: string | null; bio: string | null;
  creditBalance: number; roles: string[]; createdAt: string;
  lastLoginAt: string | null;
}

export function UserDetailPage() {
  const { id = '' } = useParams();
  const toast = useToast();
  const qc = useQueryClient();
  const [amount, setAmount] = useState('');
  const [remark, setRemark] = useState('');

  const { data } = useQuery({
    queryKey: ['admin-user', id],
    queryFn: async () => unwrap(await api.get<ApiResponse<UserDetail>>(`/admin/users/${id}`)),
  });

  const setStatus = async (status: string) => {
    await api.patch(`/admin/users/${id}/status`, { status });
    toast.success('已更新');
    qc.invalidateQueries({ queryKey: ['admin-user', id] });
  };

  const adjust = async () => {
    const n = Number(amount);
    if (!n) return toast.error('请输入金额');
    try {
      await api.post(`/admin/users/${id}/credits/adjust`, { amount: n, remark });
      toast.success('调整成功');
      setAmount(''); setRemark('');
      qc.invalidateQueries({ queryKey: ['admin-user', id] });
    } catch (err) {
      toast.error((err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? '失败');
    }
  };

  if (!data) return <div>加载中...</div>;

  return (
    <div>
      <PageHeader title={`用户：${data.email}`} description={`注册于 ${new Date(data.createdAt).toLocaleString()}`} />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card>
          <CardBody>
            <div className="space-y-2 text-sm">
              <div>状态：<Badge tone={data.status === 'active' ? 'green' : 'red'}>{data.status}</Badge></div>
              <div>角色：{data.roles.join(', ') || '-'}</div>
              <div>昵称：{data.nickname ?? '-'}</div>
              <div>积分余额：<span className="font-semibold text-brand-700">{data.creditBalance}</span></div>
              <div>最近登录：{data.lastLoginAt ? new Date(data.lastLoginAt).toLocaleString() : '-'}</div>
            </div>
            <div className="mt-4 flex gap-2">
              {data.status === 'active' ? (
                <Button variant="danger" size="sm" onClick={() => setStatus('disabled')}>禁用账号</Button>
              ) : (
                <Button size="sm" onClick={() => setStatus('active')}>启用账号</Button>
              )}
            </div>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <h3 className="mb-3 font-semibold">手动调整积分</h3>
            <div className="space-y-3">
              <Input label="金额（正数加，负数减）" value={amount} onChange={(e) => setAmount(e.target.value)} />
              <Input label="备注" value={remark} onChange={(e) => setRemark(e.target.value)} />
              <Button onClick={adjust}>提交调整</Button>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
