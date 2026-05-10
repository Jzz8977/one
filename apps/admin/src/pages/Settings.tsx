import { useEffect, useState } from 'react';
import { Button, Card, CardBody, Input, PageHeader, useToast } from '@app/ui';
import { api, unwrap } from '../lib/api';
import type { ApiResponse } from '@app/shared';

const FIELDS: Array<{ key: string; label: string; placeholder?: string }> = [
  { key: 'site.name', label: '站点名称' },
  { key: 'site.logo', label: 'Logo URL' },
  { key: 'auth.register_enabled', label: '允许注册（true/false）' },
  { key: 'auth.default_register_credits', label: '注册赠送积分' },
  { key: 'payment.enabled', label: '允许支付（true/false）' },
  { key: 'ai.default_model', label: '默认 AI 模型' },
  { key: 'system.maintenance', label: '维护模式（true/false）' },
];

export function SettingsPage() {
  const toast = useToast();
  const [data, setData] = useState<Record<string, string>>({});

  useEffect(() => {
    api.get<ApiResponse<Record<string, string>>>('/admin/settings').then((r) => setData(unwrap(r)));
  }, []);

  const save = async () => {
    const items = Object.entries(data).map(([key, value]) => ({ key, value: String(value ?? '') }));
    await api.put('/admin/settings', { items });
    toast.success('已保存');
  };

  return (
    <div>
      <PageHeader title="系统配置" actions={<Button onClick={save}>保存全部</Button>} />
      <Card>
        <CardBody>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {FIELDS.map((f) => (
              <Input key={f.key} label={f.label} value={data[f.key] ?? ''} onChange={(e) => setData({ ...data, [f.key]: e.target.value })} />
            ))}
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
