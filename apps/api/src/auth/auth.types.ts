import { Request } from 'express';

export type UserRoleType = 'CREATOR' | 'PRODUCER' | 'ADMIN';

export interface JwtUserPayload {
  sub: string;
  email: string;
  role: UserRoleType;
}

export interface AuthenticatedRequest extends Request {
  user: JwtUserPayload;
}
