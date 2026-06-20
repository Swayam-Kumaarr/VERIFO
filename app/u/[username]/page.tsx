import Link from 'next/link';

interface SubScore { label: string; score: number; icon: string; desc: string; }

// Demo data — replace with real DB fetch when live
function getMockProfile(username: string) {
  return {
    username,
    name: username.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
    avatarUrl: `https://github.com/${username}.png`,
    role: 'Full Stack Engineer',
    score: 76,
    label: 'Mostly Honest',
    verifiedAt: '2025-06-20T10:00:00Z',
    subScores: [
      { label: 'Commit Consistency', score: 17, icon: '📅', desc: 'Regular cadence, no burst days' },
      { label: 'Diff Depth',         score: 16, icon: '📐', desc: 'Meaningful file changes per commit' },
      { label: 'AI Clean',           score: 12, icon: '🤖', desc: '4 flagged commits detected' },
      { label: 'Deployment Verified',score: 15, icon: '🚀', desc: 'Live project evidence found' },
      { label: 'Resume Match',       score: 16, icon: '📋', desc: '11/14 claims verified in code' },
    ] as SubScore[],
    skills: ['React', 'TypeScript', 'Node.js', 'Python', 'MongoDB', 'Docker'],
    unverified: ['AWS', '5 years experience'],
    stats: { repos: 12, commits: 94, aiFlagged: 4, avgFiles: 4.2 },
    summary: 'Code history shows genuine development effort across 12 repositories. AI assistance detected in 4 commits. Strong frontend fundamentals with real deployment evidence.',
  };
}

function ScoreRing({ score }: { score: number }) {
  const r = 52;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  const color = score >= 80 ? '#22c55e' : score >= 60 ? '#f59e0b' : '#ef4444';
  return (
    <div className="relative w-32 h-32 flex items-center justify-center flex-shrink-0">
      <svg className="absolute inset-0 -rotate-90" viewBox="0 0 120 120">
        <circle cx="60" cy="60" r={r} fill="none" stroke="#1e1e28" strokeWidth="7" />
        <circle cx="60" cy="60" r={r} fill="none" stroke={color} strokeWidth="7"
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" />
      </svg>
      <div className="text-center z-10">
        <div className="font-mono text-3xl font-bold tabular-nums" style={{ color }}>{score}</div>
        <div className="font-mono text-[10px] text-[#3f3f46]">/100</div>
      </div>
    </div>
  );
}

export default function PublicProfile({ params }: { params: { username: string } }) {
  const profile = getMockProfile(params.username);
  const totalSub = profile.subScores.reduce((s, x) => s + x.score, 0);
  const verifiedDate = new Date(profile.verifiedAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  const scoreColor = profile.score >= 80 ? '#22c55e' : profile.score >= 60 ? '#f59e0b' : '#ef4444';

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">

      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-5 border-b border-[#1e1e28] bg-[#0a0a0f]/90 backdrop-blur-md" style={{ height: 52 }}>
        <Link href="/" className="font-mono text-xs text-[#6c63ff] font-bold hover:text-[#a78bfa] transition-colors">
          nexora <span className="text-[#2a2a35]">/</span> <span className="text-[#52525b]">proof_of_build</span>
        </Link>
        <div className="flex items-center gap-3">
          <Link href="/signup" className="text-[10px] font-mono text-[#52525b] hover:text-white transition-colors">get verified →</Link>
          <Link href="/login" className="text-[10px] font-mono px-3 py-1.5 rounded border border-[#6c63ff]/30 text-[#a78bfa] hover:bg-[#6c63ff]/10 transition-colors">sign in</Link>
        </div>
      </nav>

      <div className="pt-20 pb-16 px-5 max-w-[680px] mx-auto">

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 mb-8 text-[10px] font-mono">
          <span className="text-[#3f3f46]">nexora</span>
          <span className="text-[#2a2a35]">/</span>
          <span className="text-[#3f3f46]">u</span>
          <span className="text-[#2a2a35]">/</span>
          <span className="text-[#a78bfa]">{profile.username}</span>
          <span className="ml-auto text-[#2a2a35]">verified {verifiedDate}</span>
        </div>

        {/* Hero — avatar + score */}
        <div className="flex items-center gap-6 p-6 rounded-2xl border border-[#2a2a35] bg-[#111118] mb-5 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 pointer-events-none opacity-40"
            style={{ background: `radial-gradient(circle at top right, ${scoreColor}18 0%, transparent 65%)` }} />

          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={profile.avatarUrl} alt={profile.name} onError={e => { (e.target as HTMLImageElement).src = ''; }}
            className="w-16 h-16 rounded-full border-2 flex-shrink-0" style={{ borderColor: scoreColor + '60' }} />

          <div className="flex-1 min-w-0">
            <div className="text-xl font-bold text-white">{profile.name}</div>
            <div className="text-sm text-[#71717a] font-mono mt-0.5">@{profile.username}</div>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <span className="text-[9px] font-mono px-2 py-0.5 rounded border border-[#6c63ff]/25 bg-[#6c63ff]/8 text-[#a78bfa]">{profile.role}</span>
              <span className="text-[9px] font-mono px-2 py-0.5 rounded border border-[#22c55e]/20 bg-[#22c55e]/5 text-[#22c55e] flex items-center gap-1">
                <span className="w-1 h-1 rounded-full bg-[#22c55e]" />
                nexora verified
              </span>
            </div>
          </div>

          <ScoreRing score={profile.score} />
        </div>

        {/* Score label + summary */}
        <div className="p-5 rounded-xl border border-[#2a2a35] bg-[#111118] mb-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="font-mono text-2xl font-bold tabular-nums" style={{ color: scoreColor }}>{profile.score}</div>
            <div>
              <div className="text-sm font-bold text-white">{profile.label}</div>
              <div className="text-[10px] font-mono text-[#3f3f46]">honesty score · {totalSub}/100 across 5 dimensions</div>
            </div>
          </div>
          <p className="text-xs text-[#71717a] leading-relaxed">{profile.summary}</p>
        </div>

        {/* Sub-score breakdown */}
        <div className="rounded-xl border border-[#2a2a35] bg-[#111118] overflow-hidden mb-5">
          <div className="px-5 py-3 border-b border-[#1e1e28] flex items-center justify-between">
            <span className="text-xs font-semibold text-white">Score breakdown</span>
            <span className="font-mono text-[10px] text-[#52525b]"><span className="text-white">{totalSub}</span>/100</span>
          </div>
          <div className="px-5 py-4 flex flex-col gap-4">
            {profile.subScores.map(sub => {
              const pct = (sub.score / 20) * 100;
              const c = sub.score >= 16 ? '#22c55e' : sub.score >= 12 ? '#f59e0b' : '#ef4444';
              return (
                <div key={sub.label} className="flex items-center gap-3">
                  <div className="w-5 text-sm text-center flex-shrink-0">{sub.icon}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between mb-1">
                      <span className="text-[10px] font-semibold text-[#a1a1aa]">{sub.label}</span>
                      <span className="font-mono text-[10px] tabular-nums" style={{ color: c }}>
                        {sub.score}<span className="text-[#3f3f46]">/20</span>
                      </span>
                    </div>
                    <div className="h-1 rounded-full bg-[#1e1e28] overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: c }} />
                    </div>
                    <div className="text-[9px] font-mono text-[#3f3f46] mt-0.5">{sub.desc}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-4 gap-2 mb-5">
          {[
            { label: 'Repos', value: profile.stats.repos },
            { label: 'Commits', value: profile.stats.commits },
            { label: 'AI flagged', value: profile.stats.aiFlagged },
            { label: 'Files/commit', value: profile.stats.avgFiles },
          ].map(s => (
            <div key={s.label} className="p-3 rounded-lg border border-[#2a2a35] bg-[#111118] text-center">
              <div className="font-mono text-sm font-bold text-white tabular-nums">{s.value}</div>
              <div className="text-[9px] font-mono text-[#3f3f46] mt-0.5 uppercase">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Verified skills */}
        <div className="rounded-xl border border-[#2a2a35] bg-[#111118] overflow-hidden mb-5">
          <div className="px-5 py-3 border-b border-[#1e1e28]">
            <span className="text-xs font-semibold text-white">Verified skills</span>
          </div>
          <div className="p-5 flex flex-col gap-3">
            <div className="flex flex-wrap gap-2">
              {profile.skills.map(s => (
                <span key={s} className="flex items-center gap-1.5 text-xs font-mono px-2.5 py-1 rounded-lg border border-[#22c55e]/20 bg-[#22c55e]/5 text-[#22c55e]">
                  <span className="text-[10px]">✓</span> {s}
                </span>
              ))}
            </div>
            {profile.unverified.length > 0 && (
              <div>
                <div className="text-[10px] font-mono text-[#3f3f46] mb-2">claimed but unverified in code:</div>
                <div className="flex flex-wrap gap-2">
                  {profile.unverified.map(s => (
                    <span key={s} className="flex items-center gap-1.5 text-xs font-mono px-2.5 py-1 rounded-lg border border-[#f59e0b]/20 bg-[#f59e0b]/5 text-[#f59e0b]">
                      <span className="text-[10px]">⚠</span> {s}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* CTA footer */}
        <div className="p-5 rounded-xl border border-[#6c63ff]/20 bg-[#6c63ff]/5 flex items-center justify-between gap-4">
          <div>
            <div className="text-sm font-semibold text-white mb-0.5">Get your own verified proof link</div>
            <div className="text-[10px] font-mono text-[#52525b]">Free · takes 2 minutes · no résumé fluff</div>
          </div>
          <Link href="/signup"
            className="flex-shrink-0 px-4 py-2 rounded-lg bg-[#6c63ff] text-white text-xs font-semibold hover:bg-[#7c73ff] hover:-translate-y-px transition-all whitespace-nowrap">
            get verified →
          </Link>
        </div>

      </div>
    </div>
  );
}
