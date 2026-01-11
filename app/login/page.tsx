'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Spinner from '../components/Spinner';
import Toast from '../components/Toast';

function LoginForm() {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Check if already authenticated with timeout
    const timeoutId = setTimeout(() => {
      setChecking(false); // Fallback: stop checking after 3 seconds
    }, 3000);

    checkAuth().finally(() => {
      clearTimeout(timeoutId);
    });

    return () => clearTimeout(timeoutId);
  }, []);

          const checkAuth = async () => {
            try {
              const response = await fetch('/api/auth/check', {
                credentials: 'include',
              });
              const data = await response.json();
              
              if (data.authenticated) {
                // Already logged in, redirect to reviews page or redirect URL
                // Don't redirect to '/' (landing page) for authenticated users
                const redirect = searchParams.get('redirect');
                if (redirect && redirect !== '/') {
                  router.push(redirect);
                } else {
                  router.push('/reviews'); // Redirect to reviews page instead of landing page
                }
              } else {
                setChecking(false);
              }
            } catch (error) {
              console.error('Auth check error:', error);
              setChecking(false);
            }
          };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
        credentials: 'include', // Ensure cookies are sent
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Login failed');
      }

              // Redirect to reviews page or the redirect URL
              // Don't redirect to '/' (landing page) for authenticated users
              const redirect = searchParams.get('redirect');
              if (redirect && redirect !== '/') {
                router.push(redirect);
              } else {
                router.push('/reviews'); // Redirect to reviews page instead of landing page
              }
    } catch (err) {
      setMessage({ 
        type: 'error', 
        text: err instanceof Error ? err.message : 'Invalid password' 
      });
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        backgroundColor: '#f9fafb',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Spinner size={32} />
          <span style={{ color: '#6b7280', fontSize: '1rem' }}>Checking authentication...</span>
        </div>
      </div>
    );
  }

  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      backgroundColor: '#f9fafb',
      padding: '2rem',
    }}>
      <Toast message={message} onClose={() => setMessage(null)} />
      
      <div style={{
        width: '100%',
        maxWidth: '400px',
        padding: '2rem',
        backgroundColor: 'white',
        borderRadius: '0.5rem',
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
        border: '1px solid #e5e7eb',
      }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold', marginBottom: '0.5rem', color: '#1f2937' }}>
            Fathom-Linear Integration
          </h1>
          <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>
            Enter your password to continue
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div>
            <label 
              htmlFor="password" 
              style={{ 
                display: 'block', 
                fontSize: '0.875rem', 
                fontWeight: 600, 
                color: '#1f2937', 
                marginBottom: '0.5rem' 
              }}
            >
              Password
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              required
              autoFocus
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #d1d5db',
                borderRadius: '0.5rem',
                fontSize: '1rem',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <button
            type="submit"
            disabled={loading || !password.trim()}
            style={{
              width: '100%',
              padding: '0.75rem',
              fontSize: '1rem',
              backgroundColor: loading || !password.trim() ? '#d1d5db' : '#2563eb',
              color: 'white',
              border: 'none',
              borderRadius: '0.5rem',
              cursor: loading || !password.trim() ? 'not-allowed' : 'pointer',
              opacity: loading || !password.trim() ? 0.6 : 1,
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
            }}
          >
            {loading ? (
              <>
                <Spinner size={16} />
                <span>Logging in...</span>
              </>
            ) : (
              'Log in'
            )}
          </button>
        </form>

        <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid #e5e7eb' }}>
          <p style={{ color: '#6b7280', fontSize: '0.75rem', textAlign: 'center' }}>
            Set ADMIN_PASSWORD environment variable to configure authentication
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div style={{ 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        backgroundColor: '#f9fafb',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Spinner size={32} />
          <span style={{ color: '#6b7280', fontSize: '1rem' }}>Loading...</span>
        </div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
