import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'requiredRoles';
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);

export const PERMISSIONS_KEY = 'requiredPermissions';
export const Permissions = (...perms: string[]) => SetMetadata(PERMISSIONS_KEY, perms);
