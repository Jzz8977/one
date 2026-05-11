import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Button,
  Card,
  CardBody,
  Input,
  Label,
  Modal,
  PageHeader,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Table,
  useToast,
} from '@app/ui';
import { api, unwrap } from '../lib/api';
import type { ApiResponse } from '@app/shared';

interface Provider { id: string; code: string; name: string; baseUrl: string; active: boolean; }
interface Model {
  id: string; providerId: string; code: string; name: string;
  inputPricePerKToken: number; outputPricePerKToken: number; active: boolean;
  provider: { code: string; name: string };
}

export function AiProvidersPage() {
  const toast = useToast();
  const qc = useQueryClient();
  const [modelOpen, setModelOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<Model>>({ active: true });

  const providers = useQuery({
    queryKey: ['admin-providers'],
    queryFn: async () => unwrap(await api.get<ApiResponse<Provider[]>>('/admin/ai/providers')),
  });
  const models = useQuery({
    queryKey: ['admin-models'],
    queryFn: async () => unwrap(await api.get<ApiResponse<Model[]>>('/admin/ai/models')),
  });

  const saveModel = async () => {
    try {
      await api.post('/admin/ai/models', editing);
      toast.success('已保存');
      setModelOpen(false);
      setEditing({ active: true });
      qc.invalidateQueries({ queryKey: ['admin-models'] });
    } catch (err) {
      toast.error((err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? '保存失败');
    }
  };

  return (
    <div>
      <PageHeader title="AI 模型与供应商" actions={<Button onClick={() => setModelOpen(true)}>新增模型</Button>} />
      <Card className="mb-4">
        <CardBody>
          <h3 className="mb-3 font-semibold">供应商</h3>
          <Table
            rowKey={(p) => p.id}
            data={providers.data ?? []}
            columns={[
              { key: 'code', title: 'Code' },
              { key: 'name', title: '名称' },
              { key: 'baseUrl', title: 'Base URL' },
              { key: 'active', title: '启用', render: (p) => (p.active ? '是' : '否') },
            ]}
          />
        </CardBody>
      </Card>
      <Card>
        <CardBody>
          <h3 className="mb-3 font-semibold">模型</h3>
          <Table
            rowKey={(m) => m.id}
            data={models.data ?? []}
            columns={[
              { key: 'provider', title: '供应商', render: (m) => m.provider.name },
              { key: 'code', title: 'Model Code' },
              { key: 'name', title: '名称' },
              { key: 'in', title: '入价/1K', render: (m) => m.inputPricePerKToken },
              { key: 'out', title: '出价/1K', render: (m) => m.outputPricePerKToken },
              { key: 'active', title: '启用', render: (m) => (m.active ? '是' : '否') },
            ]}
          />
        </CardBody>
      </Card>

      <Modal open={modelOpen} onClose={() => setModelOpen(false)} title="新增/编辑模型" footer={<Button onClick={saveModel}>保存</Button>}>
        <div className="space-y-3">
          <div className="grid w-full items-center gap-1.5">
            <Label>供应商</Label>
            <Select
              value={editing.providerId ?? ''}
              onValueChange={(v) => setEditing({ ...editing, providerId: v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="请选择" />
              </SelectTrigger>
              <SelectContent>
                {providers.data?.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Input label="Model Code" value={editing.code ?? ''} onChange={(e) => setEditing({ ...editing, code: e.target.value })} />
          <Input label="名称" value={editing.name ?? ''} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
          <Input label="入价（积分/1K tokens）" type="number" value={editing.inputPricePerKToken ?? 0} onChange={(e) => setEditing({ ...editing, inputPricePerKToken: Number(e.target.value) })} />
          <Input label="出价（积分/1K tokens）" type="number" value={editing.outputPricePerKToken ?? 0} onChange={(e) => setEditing({ ...editing, outputPricePerKToken: Number(e.target.value) })} />
        </div>
      </Modal>
    </div>
  );
}
