'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../components/AuthContext';

function GitHubIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
      <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
    </svg>
  );
}

function EyeIcon({ off }: { off?: boolean }) {
  return off ? (
    <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

export default function LoginPage() {
  const { user, loading, login, loginWithGitHub } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [githubLoading, setGithubLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!loading && user) router.replace('/dashboard');
  }, [user, loading, router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) { setError('both fields required'); return; }
    setError(''); setSubmitting(true);
    try { await login(email, password); }
    catch (err) { setError(err instanceof Error ? err.message : 'login failed'); setSubmitting(false); }
  };

  const handleGitHub = () => {
    setGithubLoading(true);
    loginWithGitHub(); // redirects browser, loading state stays until redirect
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex">
      {/* Left panel — branding */}
      <div className="hidden lg:flex flex-col justify-between w-[420px] flex-shrink-0 border-r border-[#1e1e28] p-10 relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: 'linear-gradient(#6c63ff 1px, transparent 1px), linear-gradient(90deg, #6c63ff 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(108,99,255,0.08) 0%, transparent 70%)' }} />

        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-2">
            <span className="font-mono text-sm text-[#6c63ff] font-bold">nexora</span>
            <span className="font-mono text-[10px] px-1.5 py-0.5 rounded border border-[#6c63ff]/25 text-[#a78bfa]">beta</span>
          </div>
          <p className="font-mono text-[10px] text-[#3f3f46]">proof_of_build</p>
        </div>

        <div className="relative z-10 flex flex-col gap-6">
          <div>
            <h2 className="text-2xl font-bold text-white leading-tight tracking-tight">
              Verify what developers actually built.
            </h2>
            <p className="text-[#52525b] text-sm mt-3 leading-relaxed">
              Not what they claimed on a résumé. Real commits, real diffs, real deployments — cross-checked against what they say they know.
            </p>
          </div>

          <div className="flex flex-col gap-3">
            {[
              { icon: '🔍', title: 'Commit-level analysis', desc: 'Every diff, every author, every file touched' },
              { icon: '🤝', title: 'Client verification', desc: 'Hire with confidence — not guesswork' },
              { icon: '🏷️', title: 'Honesty score', desc: 'Resume claims vs. actual code output' },
            ].map(f => (
              <div key={f.title} className="flex items-start gap-3 p-3 rounded-lg border border-[#1e1e28] bg-[#111118]/60">
                <span className="text-base flex-shrink-0 mt-0.5">{f.icon}</span>
                <div>
                  <div className="text-sm font-semibold text-white">{f.title}</div>
                  <div className="text-[11px] text-[#52525b] font-mono mt-0.5">{f.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10 flex flex-col gap-3">
          {/* Infinite marquee — tech stack */}
          <div className="marquee -mx-10">
            <div className="marquee-track">
              {['React', 'Next.js', 'TypeScript', 'Python', 'FastAPI', 'Node.js', 'Docker', 'AWS', 'Tailwind', 'PostgreSQL',
                'React', 'Next.js', 'TypeScript', 'Python', 'FastAPI', 'Node.js', 'Docker', 'AWS', 'Tailwind', 'PostgreSQL'].map((t, i) => (
                <span key={i} className="text-[9px] font-mono text-[#2a2a35] px-2.5 py-1 rounded border border-[#1e1e28] flex-shrink-0">{t}</span>
              ))}
            </div>
          </div>
          <p className="text-[10px] font-mono text-[#2a2a35]">read-only token scope · no credentials stored</p>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-[380px] flex flex-col gap-7">

          {/* Mobile logo */}
          <div className="lg:hidden">
            <span className="font-mono text-sm text-[#6c63ff] font-bold">nexora</span>
            <span className="font-mono text-[10px] text-[#3f3f46] ml-2">/ proof_of_build</span>
          </div>

          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">Welcome back</h1>
            <p className="text-[#52525b] text-sm mt-1">Sign in to your account to continue.</p>
          </div>

          {/* GitHub button */}
          <button
            onClick={handleGitHub}
            disabled={githubLoading || submitting}
            className="w-full flex items-center justify-center gap-2.5 py-2.5 rounded-lg border border-[#2a2a35] bg-[#111118] text-white text-sm font-medium transition-all hover:border-[#6c63ff]/40 hover:bg-[#18181f] hover:-translate-y-px active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {githubLoading
              ? <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              : <GitHubIcon />}
            {githubLoading ? 'Connecting...' : 'Continue with GitHub'}
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-[#1e1e28]" />
            <span className="text-[10px] font-mono text-[#3f3f46]">or sign in with email</span>
            <div className="flex-1 h-px bg-[#1e1e28]" />
          </div>

          {/* Email/password form */}
          <form onSubmit={handleLogin} className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-mono text-[#52525b] uppercase tracking-wider">Email</label>
              <div className="flex items-center gap-2 bg-[#0d0d14] border border-[#2a2a35] rounded-lg px-3 py-2.5 focus-within:border-[#6c63ff]/60 transition-all">
                <input
                  type="email" value={email}
                  onChange={e => { setEmail(e.target.value); setError(''); }}
                  placeholder="you@example.com" autoComplete="email"
                  className="flex-1 bg-transparent text-sm text-white font-mono placeholder:text-[#3f3f46] focus:outline-none"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-mono text-[#52525b] uppercase tracking-wider">Password</label>
                <button type="button" className="text-[10px] font-mono text-[#6c63ff] hover:text-[#a78bfa] transition-colors">
                  forgot password?
                </button>
              </div>
              <div className="flex items-center gap-2 bg-[#0d0d14] border border-[#2a2a35] rounded-lg px-3 py-2.5 focus-within:border-[#6c63ff]/60 transition-all">
                <input
                  type={showPass ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••" autoComplete="current-password"
                  className="flex-1 bg-transparent text-sm text-white font-mono placeholder:text-[#3f3f46] focus:outline-none"
                />
                <button type="button" onClick={() => setShowPass(s => !s)} className="text-[#3f3f46] hover:text-[#71717a] transition-colors flex-shrink-0">
                  <EyeIcon off={showPass} />
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-[#ef4444]/20 bg-[#ef4444]/5 text-[#ef4444] text-xs font-mono">
                <span>✗</span> {error}
              </div>
            )}

            <button
              type="submit" disabled={submitting || githubLoading}
              className="w-full py-2.5 rounded-lg bg-[#6c63ff] text-white font-semibold text-sm transition-all hover:bg-[#7c73ff] hover:-translate-y-px hover:shadow-[0_4px_20px_rgba(108,99,255,0.3)] active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed mt-1"
            >
              {submitting
                ? <span className="flex items-center justify-center gap-2"><span className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin" />signing in...</span>
                : 'Sign in'}
            </button>
          </form>

          <p className="text-center text-xs text-[#3f3f46] font-mono">
            don&apos;t have an account?{' '}
            <Link href="/signup" className="text-[#6c63ff] hover:text-[#a78bfa] transition-colors">sign up</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
