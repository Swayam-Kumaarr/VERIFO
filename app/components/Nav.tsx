'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from './AuthContext';

export default function Nav() {
  const { user, logout } = useAuth();
  const path = usePathname();

  const [visible, setVisible] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const lastY = useRef(0);

  // Hide on scroll down, show on scroll up
  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      if (y < 60) { setVisible(true); return; }
      setVisible(y < lastY.current);
      lastY.current = y;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Close mobile menu on route change
  useEffect(() => { setMobileOpen(false); }, [path]);

  const links = [
    { href: '/dashboard', label: 'Analyze' },
    { href: '/profile', label: 'Profile' },
  ];

  const isActive = (href: string) => path === href || path.startsWith(href + '/');

  return (
    <>
      <nav className={`fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-5 border-b border-[#1e1e28] bg-[#0a0a0f]/90 backdrop-blur-md transition-transform duration-300 ${visible ? 'translate-y-0' : '-translate-y-full'}`}
        style={{ height: 52 }}>

        {/* Left — logo + links */}
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="flex items-center gap-2 group">
            <span className="font-mono text-xs text-[#6c63ff] font-bold group-hover:text-[#a78bfa] transition-colors">nexora</span>
            <span className="text-[#2a2a35] text-xs">/</span>
            <span className="font-mono text-xs text-[#3f3f46] group-hover:text-[#52525b] transition-colors">proof_of_build</span>
          </Link>
          <div className="hidden sm:flex items-center gap-0.5">
            {links.map(l => (
              <Link key={l.href} href={l.href}
                className={`px-3 py-1.5 rounded text-xs font-mono transition-all ${isActive(l.href) ? 'text-[#a78bfa] bg-[#6c63ff]/10' : 'text-[#52525b] hover:text-[#a1a1aa] hover:bg-[#ffffff]/4'}`}>
                {l.label}
              </Link>
            ))}
          </div>
        </div>

        {/* Right — badges + avatar + logout */}
        <div className="hidden sm:flex items-center gap-3">
          {user?.role === 'client' && (
            <span className="text-[9px] font-mono px-2 py-0.5 rounded border border-[#f59e0b]/25 bg-[#f59e0b]/8 text-[#f59e0b]">client</span>
          )}
          {user?.githubConnected && (
            <span className="text-[9px] font-mono px-2 py-0.5 rounded border border-[#22c55e]/20 bg-[#22c55e]/5 text-[#22c55e] flex items-center gap-1">
              <span className="w-1 h-1 rounded-full bg-[#22c55e] animate-pulse" />
              gh connected
            </span>
          )}
          <Link href="/profile" className="flex items-center gap-2 group">
            {user?.githubAvatarUrl ? (
              <img src={user.githubAvatarUrl} alt={user.name} className="w-7 h-7 rounded-full border border-[#6c63ff]/30 group-hover:border-[#6c63ff]/70 transition-all" />
            ) : (
              <div className="w-7 h-7 rounded-full bg-[#1a1a28] border border-[#6c63ff]/30 flex items-center justify-center text-[11px] text-[#a78bfa] font-mono font-bold group-hover:border-[#6c63ff]/60 transition-colors">
                {user?.avatarInitial ?? '?'}
              </div>
            )}
            <span className="font-mono text-xs text-[#52525b] group-hover:text-[#a1a1aa] transition-colors">
              {user?.name?.split(' ')[0] ?? 'account'}
            </span>
          </Link>
          <button onClick={logout} className="text-[10px] font-mono text-[#3f3f46] hover:text-[#ef4444] transition-colors px-2 py-1 rounded hover:bg-[#ef4444]/5">
            logout
          </button>
        </div>

        {/* Mobile hamburger */}
        <button
          onClick={() => setMobileOpen(o => !o)}
          className="sm:hidden flex flex-col justify-center items-center w-8 h-8 gap-1.5"
          aria-label="Toggle menu"
        >
          <span className={`block h-px w-5 bg-[#71717a] transition-all duration-200 origin-center ${mobileOpen ? 'rotate-45 translate-y-[3px]' : ''}`} />
          <span className={`block h-px bg-[#71717a] transition-all duration-200 ${mobileOpen ? 'w-0 opacity-0' : 'w-4'}`} />
          <span className={`block h-px w-5 bg-[#71717a] transition-all duration-200 origin-center ${mobileOpen ? '-rotate-45 -translate-y-[3px]' : ''}`} />
        </button>
      </nav>

      {/* Mobile drawer */}
      <div className={`fixed inset-0 z-40 sm:hidden transition-all duration-250 ${mobileOpen ? 'pointer-events-auto' : 'pointer-events-none'}`}>
        {/* Backdrop */}
        <div className={`absolute inset-0 bg-[#0a0a0f]/80 backdrop-blur-sm transition-opacity duration-250 ${mobileOpen ? 'opacity-100' : 'opacity-0'}`}
          onClick={() => setMobileOpen(false)} />

        {/* Panel */}
        <div className={`absolute top-[52px] left-0 right-0 bg-[#0d0d14] border-b border-[#1e1e28] transition-all duration-250 ${mobileOpen ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-3'}`}>
          <div className="flex flex-col px-5 py-4 gap-1">
            {links.map((l, i) => (
              <Link key={l.href} href={l.href}
                style={{ transitionDelay: mobileOpen ? `${i * 40}ms` : '0ms' }}
                className={`px-3 py-2.5 rounded-lg text-sm font-mono transition-all ${isActive(l.href) ? 'text-[#a78bfa] bg-[#6c63ff]/10' : 'text-[#71717a] hover:text-white hover:bg-[#ffffff]/4'}`}>
                {l.label}
              </Link>
            ))}
            <div className="h-px bg-[#1e1e28] my-2" />
            <div className="flex items-center justify-between px-3 py-2">
              <div className="flex items-center gap-2.5">
                {user?.githubAvatarUrl ? (
                  <img src={user.githubAvatarUrl} alt={user?.name} className="w-7 h-7 rounded-full border border-[#6c63ff]/30" />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-[#1a1a28] border border-[#6c63ff]/30 flex items-center justify-center text-[11px] text-[#a78bfa] font-mono font-bold">
                    {user?.avatarInitial ?? '?'}
                  </div>
                )}
                <span className="font-mono text-xs text-[#71717a]">{user?.name?.split(' ')[0]}</span>
              </div>
              <button onClick={logout} className="text-[10px] font-mono text-[#3f3f46] hover:text-[#ef4444] transition-colors">logout</button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
