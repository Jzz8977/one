import { useEffect, useState } from 'react';
import { Button, Card, CardBody, Input, PageHeader, Textarea, useToast } from '@app/ui';
import { api, unwrap } from '../lib/api';
import { formatApiError } from '../lib/error';
import type { ApiResponse } from '@app/shared';

interface Profile {
  nickname: string | null;
  avatar: string | null;
  bio: string | null;
}

export function ProfilePage() {
  const toast = useToast();
  const [data, setData] = useState<Profile>({ nickname: '', avatar: '', bio: '' });
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get<ApiResponse<Profile>>('/users/me/profile').then((r) => setData(unwrap(r)));
  }, []);

  const save = async () => {
    setLoading(true);
    try {
      await api.patch('/users/me/profile', data);
      toast.success('已保存');
    } catch (err) {
      toast.error(formatApiError(err, '保存失败'));
    } finally {
      setLoading(false);
    }
  };

  const changePwd = async () => {
    try {
      await api.post('/auth/change-password', { oldPassword, newPassword });
      toast.success('密码已修改，请重新登录');
      setOldPassword(''); setNewPassword('');
    } catch (err) {
      toast.error(formatApiError(err, '修改失败'));
    }
  };

  return (
    <div>
      <PageHeader title="个人资料" />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card>
          <CardBody>
            <h3 className="mb-4 font-semibold">基本信息</h3>
            <div className="space-y-3">
              <Input label="昵称" value={data.nickname ?? ''} onChange={(e) => setData({ ...data, nickname: e.target.value })} />
              <Input label="头像 URL" value={data.avatar ?? ''} onChange={(e) => setData({ ...data, avatar: e.target.value })} />
              <Textarea label="简介" rows={3} value={data.bio ?? ''} onChange={(e) => setData({ ...data, bio: e.target.value })} />
              <Button onClick={save} loading={loading}>保存</Button>
            </div>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <h3 className="mb-4 font-semibold">修改密码</h3>
            <div className="space-y-3">
              <Input label="原密码" type="password" value={oldPassword} onChange={(e) => setOldPassword(e.target.value)} />
              <Input label="新密码" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} hint="至少 8 位，包含字母和数字" />
              <Button onClick={changePwd}>更新密码</Button>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
