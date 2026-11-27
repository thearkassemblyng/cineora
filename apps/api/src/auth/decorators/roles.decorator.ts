import { SetMetadata } from '@nestjs/common';
import { UserRoleType } from '../auth.types';

export const ROLES_KEY = 'cineora_roles';
export const Roles = (...roles: UserRoleType[]) => SetMetadata(ROLES_KEY, roles);
