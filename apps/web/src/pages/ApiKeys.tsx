import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Badge, Button, Card, CardBody, Input, Modal, PageHeader, Table, useToast } from '@app/ui';
import { api, unwrap } from '../lib/api';
import { formatApiError } from '../lib/error';
import type { ApiKeyCreateResultDto, ApiKeyDto, ApiResponse } from '@app/shared';

export function ApiKeysPage() {
  const toast = useToast();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [created, setCreated] = useState<ApiKeyCreateResultDto | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['api-keys'],
    queryFn: async () => unwrap(await api.get<ApiResponse<ApiKeyDto[]>>('/api-keys')),
  });

  const create = async () => {
    try {
      const resp = await api.post<ApiResponse<ApiKeyCreateResultDto>>('/api-keys', { name });
      setCreated(unwrap(resp));
      setName('');
      setOpen(false);
      qc.invalidateQueries({ queryKey: ['api-keys'] });
    } catch (err) {
      toast.error(formatApiError(err, '创建失败'));
    }
  };

  const revoke = async (id: string) => {
    if (!confirm('确认禁用该 API Key？')) return;
    await api.delete(`/api-keys/${id}`);
    toast.success('已禁用');
    qc.invalidateQueries({ queryKey: ['api-keys'] });
  };

  return (
    <div>
      <PageHeader
        title="API Keys"
        description="使用 API Key 调用 OpenAI 兼容接口 /v1/chat/completions"
        actions={<Button onClick={() => setOpen(true)}>新建 API Key</Button>}
      />
      <Table
        rowKey={(k) => k.id}
        data={data ?? []}
        loading={isLoading}
        columns={[
          { key: 'name', title: '名称' },
          { key: 'prefix', title: 'Key 前缀' },
          {
            key: 'status', title: '状态',
            render: (k) => <Badge tone={k.status === 'active' ? 'green' : 'gray'}>{k.status}</Badge>,
          },
          { key: 'lastUsedAt', title: '最近使用', render: (k) => k.lastUsedAt ? new Date(k.lastUsedAt).toLocaleString() : '-' },
          { key: 'createdAt', title: '创建时间', render: (k) => new Date(k.createdAt).toLocaleString() },
          {
            key: 'op', title: '操作',
            render: (k) => k.status === 'active' ? <Button size="sm" variant="danger" onClick={() => revoke(k.id)}>禁用</Button> : '-',
          },
        ]}
      />

      <Modal open={open} onClose={() => setOpen(false)} title="新建 API Key" footer={<Button onClick={create}>创建</Button>}>
        <Input label="名称" value={name} onChange={(e) => setName(e.target.value)} placeholder="如：本地脚本" />
      </Modal>

      <Modal
        open={!!created}
        onClose={() => setCreated(null)}
        title="API Key 已创建"
        footer={<Button onClick={() => setCreated(null)}>我已复制</Button>}
      >
        <Card>
          <CardBody>
            <p className="mb-2 text-sm text-amber-600">该 Key 只展示一次，请立即复制保存。</p>
            <code className="block break-all rounded bg-foreground p-3 text-xs text-emerald-400">{created?.fullKey}</code>
          </CardBody>
        </Card>
      </Modal>
    </div>
  );
}
