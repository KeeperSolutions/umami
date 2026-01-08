import { randomUUID } from 'crypto';
import type { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import { createUser, getUserByUsername, updateUser } from '@/queries/prisma/user';

// Configure admin emails/domains here
const ADMIN_EMAILS = process.env.ADMIN_EMAILS?.split(',').map(e => e.trim()) || [];
const ADMIN_DOMAINS = process.env.ADMIN_DOMAINS?.split(',').map(d => d.trim()) || [];

// Helper to determine if email should get admin role
function isAdminEmail(email: string): boolean {
  // Check if email is in admin list
  if (ADMIN_EMAILS.includes(email)) {
    return true;
  }

  // Check if email domain is in admin domains
  const domain = email.split('@')[1];
  if (domain && ADMIN_DOMAINS.includes(domain)) {
    return true;
  }

  return false;
}

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      if (!user.email) {
        return false;
      }

      // Check if user exists in Umami database
      const existingUser = await getUserByUsername(user.email);

      if (!existingUser) {
        // Determine role based on email
        const role = isAdminEmail(user.email) ? 'admin' : 'user';

        // Create new user in Umami with Google info
        try {
          const userId = randomUUID();
          await createUser({
            id: userId,
            username: user.email,
            password: '', // No password for OAuth users
            role: role,
          });

          // Update display name and logo if provided
          if (user.name || user.image) {
            await updateUser(userId, {
              displayName: user.name || user.email,
              logoUrl: user.image || undefined,
            });
          }
        } catch (error) {
          console.error('Error creating user:', error);
          return false;
        }
      }

      return true;
    },
    async jwt({ token, user, account }) {
      if (account && user) {
        token.email = user.email;
      }
      return token;
    },
    async session({ session, token }) {
      if (token.email) {
        session.user = {
          ...session.user,
          email: token.email as string,
        };
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  session: {
    strategy: 'jwt',
  },
};
