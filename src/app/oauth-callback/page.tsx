'use client';

import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useEffect } from 'react';
import { setClientAuthToken } from '@/lib/client';
import { setUser } from '@/store/app';

export default function OAuthCallback() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    const completeOAuthLogin = async () => {
      if (status === 'loading') {
        return;
      }

      if (status === 'unauthenticated' || !session?.user?.email) {
        // No session, redirect to login
        router.push('/login');
        return;
      }

      try {
        console.log('[OAuth Callback] Calling SSO endpoint...');

        // Call Umami's SSO endpoint to get a proper Umami JWT token
        const response = await fetch('/api/auth/sso', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        console.log('[OAuth Callback] SSO response status:', response.status);

        if (!response.ok) {
          const errorText = await response.text();
          console.error('[OAuth Callback] SSO error:', errorText);
          throw new Error(`Failed to create Umami session: ${response.status}`);
        }

        const data = await response.json();
        console.log('[OAuth Callback] SSO data received:', {
          hasToken: !!data.token,
          hasUser: !!data.user,
          userId: data.user?.id,
        });

        if (data.token && data.user) {
          // Set Umami's auth token
          setClientAuthToken(data.token);
          setUser(data.user);

          console.log('[OAuth Callback] Token and user set, redirecting to dashboard...');

          // Small delay to ensure token is saved
          await new Promise(resolve => setTimeout(resolve, 100));

          // Redirect to dashboard
          router.push('/');
        } else {
          throw new Error('Invalid response from SSO endpoint');
        }
      } catch (error) {
        console.error('[OAuth Callback] Error:', error);
        router.push('/login');
      }
    };

    completeOAuthLogin();
  }, [session, status, router]);

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        flexDirection: 'column',
        gap: '1rem',
      }}
    >
      <div>Completing sign in...</div>
      <div style={{ fontSize: '0.875rem', color: '#666' }}>
        Please wait while we set up your session
      </div>
    </div>
  );
}
