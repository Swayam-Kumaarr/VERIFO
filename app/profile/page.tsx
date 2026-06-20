'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../components/AuthContext';
import { useToast } from '../components/ToastContext';
import Nav from '../components/Nav';

function GitHubIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
      <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
    </svg>
  );
}

export default function ProfilePage() {
  const { user, loading, logout, loginWithGitHub, disconnectGitHub, refreshUser } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [user, loading, router]);

  useEffect(() => {
    if (user) {
      setName(user.name);
      setEmail(user.email);
    }
  }, [user]);

  if (loading || !user) return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
      <div className="w-5 h-5 border-2 border-[#6c63ff]/30 border-t-[#6c63ff] rounded-full animate-spin" />
    </div>
  );

  const joined = new Date(user.joinedAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  const handleSave = async () => {
    if (!name.trim()) { showToast('Name cannot be empty', 'error'); return; }
    setSaving(true);
    try {
      await fetch('http://localhost:8000/api/auth/me', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), email: email.trim() }),
      });
      await refreshUser();
      showToast('Profile saved', 'success');
    } catch {
      showToast('Failed to save profile', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDisconnect = async () => {
    await disconnectGitHub();
    showToast('GitHub disconnected', 'info');
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      <Nav />
      <div className="pt-20 pb-16 px-5 max-w-[640px] mx-auto page-enter">

        <div className="mb-8">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono text-xs text-[#6c63ff]">nexora</span>
            <span className="text-[#2a2a35]">/</span>
            <span className="font-mono text-xs text-[#52525b]">account</span>
            <span className="text-[#2a2a35]">/</span>
            <span className="font-mono text-xs text-[#a78bfa]">profile</span>
          </div>
          <h1 className="text-xl font-bold text-white tracking-tight">Account settings</h1>
          <p className="text-[#3f3f46] text-xs font-mono mt-1">Joined {joined}</p>
        </div>

        {/* Avatar block */}
        <div className="flex items-center gap-4 p-5 rounded-xl border border-[#2a2a35] bg-[#111118] mb-6 reveal visible">
          {user.githubAvatarUrl ? (
            <img src={user.githubAvatarUrl} alt={user.name} className="w-14 h-14 rounded-full border-2 border-[#6c63ff]/40" />
          ) : (
            <div className="w-14 h-14 rounded-full bg-[#1a1a28] border-2 border-[#6c63ff]/40 flex items-center justify-center text-2xl font-bold text-[#a78bfa] font-mono flex-shrink-0">
              {user.avatarInitial}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="font-bold text-white text-base truncate">{user.name}</div>
            <div className="text-xs font-mono text-[#52525b] mt-0.5 truncate">{user.email}</div>
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              <span className={`text-[9px] font-mono px-2 py-0.5 rounded border ${user.role === 'client' ? 'border-[#f59e0b]/25 bg-[#f59e0b]/8 text-[#f59e0b]' : 'border-[#6c63ff]/25 bg-[#6c63ff]/8 text-[#a78bfa]'}`}>
                {user.role}
              </span>
              {user.githubConnected && (
                <span className="text-[9px] font-mono px-2 py-0.5 rounded border border-[#22c55e]/20 bg-[#22c55e]/5 text-[#22c55e] flex items-center gap-1">
                  <span className="w-1 h-1 rounded-full bg-[#22c55e]" />
                  GitHub connected
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Personal info */}
        <div className="rounded-xl border border-[#2a2a35] bg-[#111118] overflow-hidden mb-4 reveal visible">
          <div className="px-5 py-3.5 border-b border-[#1e1e28]">
            <span className="text-xs font-semibold text-white">Personal information</span>
          </div>
          <div className="p-5 flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-mono text-[#52525b] uppercase tracking-wider">Full name</label>
                <div className="flex items-center gap-2 bg-[#0d0d14] border border-[#2a2a35] rounded-lg px-3 py-2.5 focus-within:border-[#6c63ff]/60 transition-all">
                  <input
                    type="text" value={name} onChange={e => setName(e.target.value)}
                    className="flex-1 bg-transparent text-sm text-white font-mono placeholder:text-[#3f3f46] focus:outline-none"
                  />
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-mono text-[#52525b] uppercase tracking-wider">Role</label>
                <div className="flex items-center gap-2 bg-[#0d0d14] border border-[#2a2a35] rounded-lg px-3 py-2.5">
                  <span className={`text-sm font-mono ${user.role === 'client' ? 'text-[#f59e0b]' : 'text-[#a78bfa]'}`}>
                    {user.role === 'client' ? '🏢 Client' : '👨‍💻 Developer'}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-mono text-[#52525b] uppercase tracking-wider">Email address</label>
              <div className="flex items-center gap-2 bg-[#0d0d14] border border-[#2a2a35] rounded-lg px-3 py-2.5 focus-within:border-[#6c63ff]/60 transition-all">
                <input
                  type="email" value={email} onChange={e => setEmail(e.target.value)}
                  className="flex-1 bg-transparent text-sm text-white font-mono placeholder:text-[#3f3f46] focus:outline-none"
                />
              </div>
            </div>
            <button
              onClick={handleSave} disabled={saving}
              className="self-start px-4 py-2 rounded-lg text-xs font-mono font-medium transition-all bg-[#6c63ff] text-white hover:bg-[#7c73ff] hover:-translate-y-px disabled:opacity-50"
            >
              {saving ? 'saving...' : 'save changes'}
            </button>
          </div>
        </div>

        {/* GitHub connection */}
        <div className="rounded-xl border border-[#2a2a35] bg-[#111118] overflow-hidden mb-4 reveal visible">
          <div className="px-5 py-3.5 border-b border-[#1e1e28]">
            <span className="text-xs font-semibold text-white">GitHub connection</span>
          </div>
          <div className="p-5">
            {user.githubConnected ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {user.githubAvatarUrl ? (
                    <img src={user.githubAvatarUrl} alt={user.githubUsername} className="w-9 h-9 rounded-full border border-[#22c55e]/25" />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-[#1a1a28] border border-[#22c55e]/25 flex items-center justify-center text-white">
                      <GitHubIcon />
                    </div>
                  )}
                  <div>
                    <div className="text-sm font-medium text-white">@{user.githubUsername}</div>
                    <div className="text-[10px] font-mono text-[#22c55e] mt-0.5">✓ connected · read + repo scope</div>
                  </div>
                </div>
                <button
                  onClick={handleDisconnect}
                  className="text-[10px] font-mono text-[#3f3f46] hover:text-[#ef4444] transition-colors border border-[#2a2a35] hover:border-[#ef4444]/30 px-2.5 py-1.5 rounded"
                >
                  disconnect
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-[#71717a]">No GitHub account connected</div>
                  <div className="text-[10px] font-mono text-[#3f3f46] mt-0.5">Connect to unlock commit analysis and proof ledger</div>
                </div>
                <button
                  onClick={loginWithGitHub}
                  className="flex items-center gap-2 px-3.5 py-2 rounded-lg border border-[#2a2a35] bg-[#0d0d14] text-white text-xs font-mono hover:border-[#6c63ff]/40 hover:-translate-y-px transition-all"
                >
                  <GitHubIcon /> Connect
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Danger zone */}
        <div className="rounded-xl border border-[#ef4444]/15 bg-[#0d0d14] overflow-hidden reveal visible">
          <div className="px-5 py-3.5 border-b border-[#ef4444]/10">
            <span className="text-xs font-semibold text-[#ef4444]">Danger zone</span>
          </div>
          <div className="p-5 flex items-center justify-between">
            <div>
              <div className="text-sm text-white">Sign out of all devices</div>
              <div className="text-[10px] font-mono text-[#3f3f46] mt-0.5">Clears your session from this browser</div>
            </div>
            <button
              onClick={logout}
              className="px-3.5 py-2 rounded-lg border border-[#ef4444]/25 text-[#ef4444] text-xs font-mono hover:bg-[#ef4444]/5 transition-all"
            >
              logout →
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
