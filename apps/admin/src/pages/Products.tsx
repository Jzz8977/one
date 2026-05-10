import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Input, Modal, PageHeader, Table, useToast } from '@app/ui';
import { api, unwrap } from '../lib/api';
import type { ApiResponse, ProductDto } from '@app/shared';

export function ProductsPage() {
  const toast = useToast();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<Partial<ProductDto>>({ active: true, sort: 0 });
  const { data, isLoading } = useQuery({
    queryKey: ['admin-products'],
    queryFn: async () => unwrap(await api.get<ApiResponse<ProductDto[]>>('/admin/products')),
  });

  const save = async () => {
    try {
      if (edit.id) {
        await api.patch(`/admin/products/${edit.id}`, edit);
      } else {
        await api.post('/admin/products', edit);
      }
      toast.success('已保存');
      setOpen(false);
      setEdit({ active: true, sort: 0 });
      qc.invalidateQueries({ queryKey: ['admin-products'] });
    } catch (err) {
      toast.error((err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? '保存失败');
    }
  };

  const remove = async (id: string) => {
    if (!confirm('确认下架？')) return;
    await api.delete(`/admin/products/${id}`);
    qc.invalidateQueries({ queryKey: ['admin-products'] });
  };

  return (
    <div>
      <PageHeader title="套餐管理" actions={<Button onClick={() => { setEdit({ active: true, sort: 0 }); setOpen(true); }}>新建套餐</Button>} />
      <Table
        rowKey={(p) => p.id}
        data={data ?? []}
        loading={isLoading}
        columns={[
          { key: 'name', title: '名称' },
          { key: 'price', title: '价格', render: (p) => `¥${(p.price / 100).toFixed(2)}` },
          { key: 'credits', title: '积分' },
          { key: 'active', title: '上架', render: (p) => (p.active ? '是' : '否') },
          { key: 'sort', title: '排序' },
          {
            key: 'op', title: '操作',
            render: (p) => (
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => { setEdit(p); setOpen(true); }}>编辑</Button>
                <Button size="sm" variant="danger" onClick={() => remove(p.id)}>下架</Button>
              </div>
            ),
          },
        ]}
      />
      <Modal open={open} onClose={() => setOpen(false)} title={edit.id ? '编辑套餐' : '新建套餐'} footer={<Button onClick={save}>保存</Button>}>
        <div className="space-y-3">
          <Input label="名称" value={edit.name ?? ''} onChange={(e) => setEdit({ ...edit, name: e.target.value })} />
          <Input label="描述" value={edit.description ?? ''} onChange={(e) => setEdit({ ...edit, description: e.target.value })} />
          <Input label="价格（分）" type="number" value={edit.price ?? 0} onChange={(e) => setEdit({ ...edit, price: Number(e.target.value) })} />
          <Input label="积分" type="number" value={edit.credits ?? 0} onChange={(e) => setEdit({ ...edit, credits: Number(e.target.value) })} />
          <Input label="排序" type="number" value={edit.sort ?? 0} onChange={(e) => setEdit({ ...edit, sort: Number(e.target.value) })} />
        </div>
      </Modal>
    </div>
  );
}
