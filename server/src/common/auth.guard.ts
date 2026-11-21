import { CanActivate, ExecutionContext, Injectable, UnauthorizedException, createParamDecorator } from '@nestjs/common';
import { getEnv } from '../env';
import { verifyJwt } from './crypto';

interface AuthedRequest {
  headers: Record<string, string | undefined>;
  userId?: string;
  username?: string;
}

async function attachUser(req: AuthedRequest): Promise<boolean> {
  const header = req.headers['authorization'] ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return false;
  const secret = getEnv().JWT_SECRET ?? 'dev-only-secret-change-me';
  const payload = await verifyJwt(token, secret);
  if (!payload || typeof payload.sub !== 'string') return false;
  req.userId = payload.sub;
  if (typeof payload.username === 'string') req.username = payload.username;
  return true;
}

@Injectable()
export class AuthGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<AuthedRequest>();
    if (!(await attachUser(req))) {
      throw new UnauthorizedException('Valid bearer token required');
    }
    return true;
  }
}

/** Attaches userId when a valid token is present, but never rejects. */
@Injectable()
export class OptionalAuthGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<AuthedRequest>();
    await attachUser(req);
    return true;
  }
}

export const CurrentUserId = createParamDecorator((_data: unknown, ctx: ExecutionContext): string | undefined => {
  return ctx.switchToHttp().getRequest<AuthedRequest>().userId;
});
