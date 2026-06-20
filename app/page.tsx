'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from './components/AuthContext';
import { useRouter } from 'next/navigation';

const MARQUEE_SKILLS = [
  'React', 'TypeScript', 'Node.js', 'Python', 'FastAPI', 'Next.js',
  'Docker', 'AWS', 'PostgreSQL', 'Go', 'Rust', 'Kubernetes',
  'React', 'TypeScript', 'Node.js', 'Python', 'FastAPI', 'Next.js',
  'Docker', 'AWS', 'PostgreSQL', 'Go', 'Rust', 'Kubernetes',
];

const DEMO_SUB_SCORES = [
  { label: 'Commit Consistency', score: 17, icon: '📅', color: '#22c55e' },
  { label: 'Diff Depth',         score: 16, icon: '📐', color: '#22c55e' },
  { label: 'AI Clean',           score: 12, icon: '🤖', color: '#f59e0b' },
  { label: 'Deployment Verified',score: 15, icon: '🚀', color: '#22c55e' },
  { label: 'Resume Match',       score: 16, icon: '📋', color: '#22c55e' },
];

const FEATURES = [
  { icon: '🔍', title: 'Commit-level analysis', desc: 'Every diff, every author, every file — scanned for authenticity signals.' },
  { icon: '🤖', title: 'AI signature detection', desc: 'Co-author metadata, generic message patterns, file naming — all flagged.' },
  { icon: '📋', title: 'Resume cross-check', desc: 'Claims like "AWS expert" or "5 years" verified directly against your repos.' },
  { icon: '⚡', title: 'Combined proof mode', desc: 'Upload resume + connect GitHub at once for the most complete picture.' },
  { icon: '🔗', title: 'Shareable proof link', desc: 'Get a public /u/yourname page to put on your résumé or LinkedIn.' },
  { icon: '📊', title: '5-dimension score', desc: 'Not just a number — broken into Consistency, Depth, AI Clean, Deployment, Match.' },
];

function DemoProofCard() {
  const score = 76;
  const r = 40;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;

  return (
    <div className="relative w-full max-w-[340px] mx-auto select-none">
      {/* Glow */}
      <div className="absolute inset-0 rounded-2xl pointer-events-none" style={{ boxShadow: '0 0 60px rgba(108,99,255,0.15)' }} />

      <div className="rounded-2xl border border-[#2a2a35] bg-[#111118] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#1e1e28] bg-[#0d0d14]">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-[#6c63ff]/20 border border-[#6c63ff]/30 flex items-center justify-center text-[10px]">S</div>
            <span className="font-mono text-[11px] text-[#71717a]">swayam · Full Stack Engineer</span>
          </div>
          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded border border-[#22c55e]/20 bg-[#22c55e]/5 text-[#22c55e]">verified</span>
        </div>

        {/* Score */}
        <div className="flex items-center gap-4 px-4 pt-4 pb-3">
          <div className="relative w-[96px] h-[96px] flex items-center justify-center flex-shrink-0">
            <svg className="absolute inset-0 -rotate-90" viewBox="0 0 96 96">
              <circle cx="48" cy="48" r={r} fill="none" stroke="#1e1e28" strokeWidth="6" />
              <circle cx="48" cy="48" r={r} fill="none" stroke="#f59e0b" strokeWidth="6"
                strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" />
            </svg>
            <div className="text-center z-10">
              <div className="font-mono text-2xl font-bold text-[#f59e0b] tabular-nums">{score}</div>
              <div className="font-mono text-[9px] text-[#3f3f46]">/100</div>
            </div>
          </div>
          <div>
            <div className="text-[10px] font-mono text-[#3f3f46] mb-0.5">PROOF LEDGER · HONESTY SCORE</div>
            <div className="text-base font-bold text-white">Mostly Honest</div>
            <p className="text-[10px] font-mono text-[#52525b] mt-1 leading-relaxed">
              12 repos · 94 commits · 4 AI flags
            </p>
          </div>
        </div>

        {/* Sub-scores */}
        <div className="px-4 pb-3 flex flex-col gap-2.5">
          {DEMO_SUB_SCORES.map(s => (
            <div key={s.label} className="flex items-center gap-2.5">
              <span className="text-[11px] w-4 text-center flex-shrink-0">{s.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline justify-between mb-0.5">
                  <span className="text-[9px] font-mono text-[#71717a]">{s.label}</span>
                  <span className="font-mono text-[9px] tabular-nums" style={{ color: s.color }}>{s.score}<span className="text-[#3f3f46]">/20</span></span>
                </div>
                <div className="h-0.5 rounded-full bg-[#1e1e28]">
                  <div className="h-full rounded-full" style={{ width: `${(s.score / 20) * 100}%`, background: s.color }} />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Skills */}
        <div className="px-4 pb-3">
          <div className="text-[9px] font-mono text-[#3f3f46] mb-1.5">VERIFIED SKILLS</div>
          <div className="flex flex-wrap gap-1">
            {['React', 'TypeScript', 'Node.js', 'MongoDB', 'Python'].map(s => (
              <span key={s} className="text-[9px] font-mono px-1.5 py-0.5 rounded border border-[#22c55e]/20 bg-[#22c55e]/5 text-[#22c55e]">✓ {s}</span>
            ))}
            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded border border-[#f59e0b]/20 bg-[#f59e0b]/5 text-[#f59e0b]">⚠ AWS</span>
          </div>
        </div>

        {/* Link */}
        <div className="px-4 py-3 border-t border-[#1e1e28] bg-[#0d0d14] flex items-center justify-between">
          <span className="font-mono text-[9px] text-[#3f3f46]">nexora.app/u/swayam</span>
          <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-[#6c63ff]/15 border border-[#6c63ff]/20 text-[#a78bfa]">share →</span>
        </div>
      </div>

      {/* "DEMO" watermark */}
      <div className="absolute top-3 right-3 text-[9px] font-mono px-1.5 py-0.5 rounded bg-[#0a0a0f]/80 border border-[#2a2a35] text-[#3f3f46]">demo</div>
    </div>
  );
}

export default function LandingPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) router.replace('/dashboard');
  }, [user, loading, router]);

  if (loading) return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
      <div className="w-5 h-5 border-2 border-[#6c63ff]/30 border-t-[#6c63ff] rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white overflow-x-hidden">

      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 border-b border-[#1e1e28] bg-[#0a0a0f]/90 backdrop-blur-md" style={{ height: 52 }}>
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs text-[#6c63ff] font-bold">nexora</span>
          <span className="text-[#2a2a35] text-xs">/</span>
          <span className="font-mono text-[10px] text-[#3f3f46]">proof_of_build</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/login" className="text-xs font-mono text-[#52525b] hover:text-white transition-colors">sign in</Link>
          <Link href="/signup" className="px-3.5 py-1.5 rounded-lg bg-[#6c63ff] text-white text-xs font-semibold hover:bg-[#7c73ff] hover:-translate-y-px transition-all">
            get verified →
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-[1100px] mx-auto flex flex-col lg:flex-row items-center gap-16">

          {/* Left — copy */}
          <div className="flex-1 min-w-0">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#6c63ff]/20 bg-[#6c63ff]/8 mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e] animate-pulse" />
              <span className="text-[10px] font-mono text-[#a78bfa]">GitHub × LinkedIn for real developers</span>
            </div>

            <h1 className="text-4xl lg:text-5xl font-bold text-white leading-[1.1] tracking-tight mb-6">
              Prove what you{' '}
              <span style={{ background: 'linear-gradient(135deg, #6c63ff, #a78bfa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                actually built.
              </span>
            </h1>

            <p className="text-[#71717a] text-base leading-relaxed mb-8 max-w-[480px]">
              Not what you claimed on a résumé. Real commits, real diffs, real deployments — cross-checked against everything you say you know. One shareable link.
            </p>

            <div className="flex flex-wrap gap-3 mb-10">
              <Link href="/signup"
                className="px-6 py-3 rounded-xl bg-[#6c63ff] text-white font-semibold text-sm hover:bg-[#7c73ff] hover:-translate-y-px hover:shadow-[0_8px_30px_rgba(108,99,255,0.3)] transition-all">
                get your proof link →
              </Link>
              <Link href="/u/swayam"
                className="px-6 py-3 rounded-xl border border-[#2a2a35] text-[#71717a] text-sm font-mono hover:border-[#6c63ff]/30 hover:text-white transition-all">
                see demo proof card
              </Link>
            </div>

            <div className="flex items-center gap-6 text-[11px] font-mono text-[#3f3f46]">
              {['free to use', 'read-only GitHub scope', 'no credentials stored'].map(t => (
                <span key={t} className="flex items-center gap-1.5"><span className="text-[#22c55e]">✓</span>{t}</span>
              ))}
            </div>
          </div>

          {/* Right — demo proof card */}
          <div className="flex-shrink-0 w-full lg:w-auto">
            <DemoProofCard />
          </div>
        </div>
      </section>

      {/* Marquee */}
      <div className="border-y border-[#1e1e28] py-3 overflow-hidden">
        <div className="marquee">
          <div className="marquee-track">
            {MARQUEE_SKILLS.map((skill, i) => (
              <span key={i} className="text-[10px] font-mono text-[#2a2a35] px-3 py-1 rounded border border-[#1e1e28] flex-shrink-0">{skill}</span>
            ))}
          </div>
        </div>
      </div>

      {/* Features */}
      <section className="py-20 px-6">
        <div className="max-w-[1100px] mx-auto">
          <div className="text-center mb-12">
            <div className="text-[10px] font-mono text-[#6c63ff] mb-3">WHAT WE VERIFY</div>
            <h2 className="text-2xl font-bold text-white">Not a portfolio. A proof ledger.</h2>
            <p className="text-[#52525b] text-sm font-mono mt-3 max-w-md mx-auto">
              Every signal we collect is verifiable, reproducible, and tied to a real commit hash.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map(f => (
              <div key={f.title} className="p-5 rounded-xl border border-[#1e1e28] bg-[#111118] hover:border-[#6c63ff]/25 transition-colors">
                <div className="text-2xl mb-3">{f.icon}</div>
                <div className="text-sm font-semibold text-white mb-1">{f.title}</div>
                <p className="text-[11px] text-[#52525b] font-mono leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Two sides */}
      <section className="py-16 px-6 border-t border-[#1e1e28]">
        <div className="max-w-[900px] mx-auto grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-6 rounded-2xl border border-[#6c63ff]/20 bg-[#6c63ff]/5">
            <div className="text-2xl mb-3">👨‍💻</div>
            <div className="text-base font-bold text-white mb-2">I&apos;m a Developer</div>
            <p className="text-[#71717a] text-sm leading-relaxed mb-4">
              Submit your GitHub and get a verified proof ledger. Share your /u/name link anywhere a résumé goes. Let commits speak louder than claims.
            </p>
            <Link href="/signup?role=developer" className="text-[11px] font-mono text-[#6c63ff] hover:text-[#a78bfa] transition-colors">get verified →</Link>
          </div>
          <div className="p-6 rounded-2xl border border-[#f59e0b]/15 bg-[#f59e0b]/5">
            <div className="text-2xl mb-3">🏢</div>
            <div className="text-base font-bold text-white mb-2">I&apos;m a Client / Recruiter</div>
            <p className="text-[#71717a] text-sm leading-relaxed mb-4">
              Paste any developer&apos;s GitHub. Get an independent honesty score — no self-reporting, no résumé embellishment. Hire with evidence.
            </p>
            <Link href="/signup?role=client" className="text-[11px] font-mono text-[#f59e0b] hover:text-[#fbbf24] transition-colors">start verifying →</Link>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6 border-t border-[#1e1e28]">
        <div className="max-w-[560px] mx-auto text-center">
          <h2 className="text-2xl font-bold text-white mb-4">Your proof link is one analysis away.</h2>
          <p className="text-[#52525b] text-sm font-mono mb-8">Free · read-only access · takes 2 minutes</p>
          <Link href="/signup"
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-[#6c63ff] text-white font-semibold hover:bg-[#7c73ff] hover:-translate-y-px hover:shadow-[0_8px_30px_rgba(108,99,255,0.3)] transition-all">
            get verified for free →
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#1e1e28] px-6 py-8">
        <div className="max-w-[1100px] mx-auto flex items-center justify-between gap-4 flex-wrap">
          <span className="font-mono text-xs text-[#3f3f46]">nexora · proof_of_build · beta</span>
          <div className="flex items-center gap-4 text-[10px] font-mono text-[#2a2a35]">
            <Link href="/login" className="hover:text-[#52525b] transition-colors">sign in</Link>
            <Link href="/signup" className="hover:text-[#52525b] transition-colors">sign up</Link>
            <span>read-only GitHub scope · no credentials stored</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
