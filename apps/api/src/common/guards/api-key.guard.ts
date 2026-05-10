import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ApiKeysService } from '../../modules/api-keys/api-keys.service';

@Injectable()
export class ApiKeyAuthGuard implements CanActivate {
  constructor(private apiKeys: ApiKeysService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const auth = String(req.headers['authorization'] ?? '');
    if (!auth.startsWith('Bearer sk-')) {
      throw new UnauthorizedException('缺少 API Key');
    }
    const raw = auth.slice(7);
    const key = await this.apiKeys.findActiveByRaw(raw);
    if (!key || key.status !== 'active') throw new UnauthorizedException('API Key 无效或已禁用');
    if (key.user.status !== 'active') throw new UnauthorizedException('用户已被禁用');
    req.apiKey = { id: key.id, userId: key.userId };
    req.user = {
      id: key.userId,
      email: key.user.email,
      status: key.user.status,
      roles: ['user'],
      permissions: [],
    };
    void this.apiKeys.touchLastUsed(key.id);
    return true;
  }
}
