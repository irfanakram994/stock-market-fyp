'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, Crown, Loader, Lock, Mail, Eye, EyeOff } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';

export default function SuperAdminLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [forgotMessage, setForgotMessage] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const checkExistingSession = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (data.session?.user?.email) {
          try {
            const res = await fetch('/api/super-admin/auth/verify', {
              method: 'POST',
              credentials: 'omit',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${data.session.access_token}`,
              },
              body: JSON.stringify({ email: data.session.user.email }),
            });

            if (!res.ok) {
              return;
            }

            const verifyData = await res.json();
            if (verifyData.success) {
              router.push('/super-admin');
              return;
            }
          } catch (verifyError) {
            console.error('Super admin session verification failed:', verifyError);
          }
        }
      } catch (sessionError) {
        console.error('Error checking existing super admin session:', sessionError);
      } finally {
        setCheckingAuth(false);
      }
    };

    checkExistingSession();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setForgotMessage('');
    setLoading(true);

    try {
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) {
        setError(signInError.message);
        setLoading(false);
        return;
      }

      const accessToken = signInData.session?.access_token;
      if (!accessToken) {
        await supabase.auth.signOut();
        setError('Unable to establish a secure session. Please try again.');
        setLoading(false);
        return;
      }

      const res = await fetch('/api/super-admin/auth/signin', {
        method: 'POST',
        credentials: 'omit',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ email }),
      });
      const result = await res.json();

      if (result.success) {
        router.push('/super-admin');
      } else {
        await supabase.auth.signOut();
        setError(result.error || result.message || 'Access denied');
      }
    } catch {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    setError('');
    setForgotMessage('');

    if (!email.trim()) {
      setError('Enter your registered email first, then click Forgot Password.');
      return;
    }

    setForgotLoading(true);
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          role: 'super-admin',
        }),
      });

      const result = await res.json();
      if (!res.ok || !result.success) {
        setError(result.error || 'Failed to process forgot password request.');
        return;
      }

      setForgotMessage(result.message || 'Password reset email sent.');
    } catch {
      setError('Failed to process forgot password request. Please try again.');
    } finally {
      setForgotLoading(false);
    }
  };

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-950 flex items-center justify-center">
        <Loader className="w-8 h-8 animate-spin text-fuchsia-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-purple-500 to-fuchsia-500 rounded-2xl mb-4 shadow-xl shadow-fuchsia-500/20">
            <Crown className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Super Admin Panel</h1>
          <p className="text-gray-400">TradeFlux Highest Authority Console</p>
        </div>

        <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-8 backdrop-blur-sm">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="flex items-center space-x-2 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            {forgotMessage && (
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
                <p className="text-emerald-300 text-sm">{forgotMessage}</p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-slate-900/50 border border-slate-600/50 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-fuchsia-500/50 focus:border-fuchsia-500/50 transition-all"
                  placeholder="superadmin@tradeflux.com"
                  required
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-300">Password</label>
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  disabled={forgotLoading}
                  className="text-xs text-fuchsia-300 hover:text-fuchsia-200 disabled:opacity-50"
                >
                  {forgotLoading ? 'Sending...' : 'Forgot Password?'}
                </button>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-12 py-3 bg-slate-900/50 border border-slate-600/50 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-fuchsia-500/50 focus:border-fuchsia-500/50 transition-all"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-300"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-purple-500 to-fuchsia-500 text-white font-semibold rounded-lg hover:from-purple-600 hover:to-fuchsia-600 transition-all duration-200 flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader className="w-5 h-5 animate-spin" />
                  <span>Signing in...</span>
                </>
              ) : (
                <>
                  <Lock className="w-5 h-5" />
                  <span>Sign In to Super Admin Panel</span>
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
