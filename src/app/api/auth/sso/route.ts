import { getServerSession } from 'next-auth';
import { saveAuth } from '@/lib/auth';
import { secret } from '@/lib/crypto';
import { createSecureToken } from '@/lib/jwt';
import { authOptions } from '@/lib/next-auth';
import redis from '@/lib/redis';
import { parseRequest } from '@/lib/request';
import { json, unauthorized } from '@/lib/response';
import { getUserByUsername } from '@/queries/prisma/user';

export async function POST(request: Request) {
  // First try to get NextAuth session (for OAuth flow)
  const session = await getServerSession(authOptions);

  if (session?.user?.email) {
    // OAuth flow - get user from database
    const user = await getUserByUsername(session.user.email);

    if (!user) {
      return unauthorized();
    }

    // Create Umami JWT token with userId directly (works without Redis)
    const token = createSecureToken({ userId: user.id }, secret());

    return json({ user, token });
  }

  // Fallback to original behavior (for Redis-based auth)
  const { auth, error } = await parseRequest(request);

  if (error) {
    return error();
  }

  if (redis.enabled) {
    const token = await saveAuth({ userId: auth.user.id }, 86400);

    return json({ user: auth.user, token });
  }

  return unauthorized();
}
