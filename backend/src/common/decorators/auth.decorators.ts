import { SetMetadata } from '@nestjs/common';
import { RoleName } from '../enums';

export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

export const ROLES_KEY = 'roles';
export const Roles = (...roles: RoleName[]) => SetMetadata(ROLES_KEY, roles);

export const AUDIT_KEY = 'audit_metadata';
export interface AuditMetadata {
  accion: string;
  entidad: string;
}
export const Auditar = (accion: string, entidad: string) =>
  SetMetadata(AUDIT_KEY, { accion, entidad } as AuditMetadata);

export const ALLOW_PASSWORD_CHANGE_PENDING_KEY = 'allowPasswordChangePending';
export const AllowPasswordChangePending = () =>
  SetMetadata(ALLOW_PASSWORD_CHANGE_PENDING_KEY, true);
