'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../components/AuthContext';
import Nav from '../components/Nav';

// ── Engineering roles ──────────────────────────────────────────────────────────

const ENGINEERING_ROLES = [
  'Front-End Engineer',
  'Back-End Engineer',
  'Full Stack Engineer',
  'Software Engineer in Test (QA Engineer)',
  'Software Development Engineer in Test (SDET)',
  'DevOps Engineer',
  'Security Engineer',
  'Data Engineer',
  'Cloud Architect',
  'Systems Engineer',
  'Mobile Engineer',
  'Technical Support Engineer',
  'Game Developer',
  'Machine Learning (ML) Engineer',
  'Artificial Intelligence (AI) Engineer',
  'Blockchain Engineer',
  'Embedded Systems Engineer',
  'Web Application Security Engineer (WASE)',
  'Site Reliability Engineer (SRE)',
  'User Experience (UX) Engineer',
  'User Interface (UI) Engineer',
  'Robotics Engineer',
  'Internet of Things (IoT) Engineer',
  'Software Integration Engineer',
] as const;

// ── Types ──────────────────────────────────────────────────────────────────────

type Mode = 'github' | 'repo' | 'resume';
type Phase = 'select' | 'input' | 'pipeline' | 'result';
type StepState = 'idle' | 'running' | 'done' | 'warn';

interface LogLine {
  text: string;
  type: 'info' | 'success' | 'warn' | 'error';
}

interface StepDef {
  icon: string;
  title: string;
  desc: string;
  logs: LogLine[];
}

interface ResultData {
  mode: Mode;
  score: number;
  label: string;
  flags: { text: string; ok: boolean }[];
  summary: string;
  details: { title: string; value: string; ok: boolean }[];
}

// ── Mock pipeline definitions ──────────────────────────────────────────────────

function githubSteps(username: string): StepDef[] {
  return [
    {
      icon: '📡', title: 'GitHub OAuth handshake',
      desc: 'Token validation · scope check · rate limit',
      logs: [
        { text: '→ Initiating OAuth handshake...', type: 'info' },
        { text: `→ Authenticated as: ${username || 'user'}`, type: 'info' },
        { text: '→ Scope: read:user, repo (public)', type: 'info' },
        { text: '→ Rate limit: 4,992 / 5,000 remaining', type: 'info' },
        { text: '✓ Gateway connected', type: 'success' },
      ],
    },
    {
      icon: '🔍', title: 'Fetching repositories',
      desc: 'All permitted repos · commit history · file trees',
      logs: [
        { text: `→ Scanning repositories for ${username || 'user'}...`, type: 'info' },
        { text: '→ Found 12 public repositories', type: 'info' },
        { text: '→ Pulling commit history (last 90 days)', type: 'info' },
        { text: '→ Fetching file trees and languages...', type: 'info' },
        { text: '✓ 94 total commits indexed', type: 'success' },
      ],
    },
    {
      icon: '🧬', title: 'Code pattern analysis',
      desc: 'File naming · commit timing · code length ratios',
      logs: [
        { text: '→ Scanning file naming conventions...', type: 'info' },
        { text: '⚠ 3 files match common AI naming patterns (utils2.js, helper_v3.py)', type: 'warn' },
        { text: '→ Analyzing commit time distribution...', type: 'info' },
        { text: '→ Checking code-length vs file-type ratios...', type: 'info' },
        { text: '⚠ 1 repo: JSON file exceeds expected size by 340%', type: 'warn' },
        { text: '✓ Pattern analysis complete', type: 'success' },
      ],
    },
    {
      icon: '👥', title: 'Contributor & AI signature scan',
      desc: 'Co-author metadata · bot contributors · commit message patterns',
      logs: [
        { text: '→ Scanning co-author metadata in commits...', type: 'info' },
        { text: '→ Checking for github-copilot bot contributor...', type: 'info' },
        { text: '⚠ 4 commits contain "Co-authored-by: github-copilot"', type: 'warn' },
        { text: '→ Analyzing commit message entropy...', type: 'info' },
        { text: '⚠ 11 commits use generic AI-style messages ("fix bug", "update")', type: 'warn' },
        { text: '✓ Contributor scan complete', type: 'success' },
      ],
    },
    {
      icon: '🏷️', title: 'Generating honesty score',
      desc: 'Aggregating signals · Claude API analysis · proof ledger',
      logs: [
        { text: '→ Aggregating pattern signals...', type: 'info' },
        { text: '→ Sending verified commit data to Claude API [MOCKED]', type: 'info' },
        { text: '→ Computing weighted honesty score...', type: 'info' },
        { text: '→ Building proof ledger JSON...', type: 'info' },
        { text: '✓ Score: 76/100 · ledger ready', type: 'success' },
      ],
    },
  ];
}

function repoSteps(repoUrl: string): StepDef[] {
  const repoName = repoUrl.split('/').slice(-1)[0] || 'repository';
  return [
    {
      icon: '📡', title: 'Validating repository',
      desc: 'URL check · access verification · repo metadata',
      logs: [
        { text: `→ Resolving: ${repoUrl || 'repository URL'}`, type: 'info' },
        { text: '→ Checking repository visibility (public/private)...', type: 'info' },
        { text: '→ Fetching repo metadata...', type: 'info' },
        { text: `✓ Repository "${repoName}" found and accessible`, type: 'success' },
      ],
    },
    {
      icon: '🔍', title: 'Pulling commit history',
      desc: 'Full git log · author breakdown · diff sizes',
      logs: [
        { text: '→ Fetching full commit log...', type: 'info' },
        { text: '→ Found 47 commits across 3 branches', type: 'info' },
        { text: '→ Parsing diff sizes per commit...', type: 'info' },
        { text: '→ Mapping author email to contributor list...', type: 'info' },
        { text: '✓ Commit history indexed', type: 'success' },
      ],
    },
    {
      icon: '🧬', title: 'File & code analysis',
      desc: 'File structure · naming patterns · code length ratios',
      logs: [
        { text: '→ Walking file tree...', type: 'info' },
        { text: '→ Checking file naming against AI pattern library...', type: 'info' },
        { text: '→ Measuring code-to-comment ratio per file...', type: 'info' },
        { text: '⚠ File management structure is unusually flat (no subfolders)', type: 'warn' },
        { text: '→ Checking for oversized files vs file type...', type: 'info' },
        { text: '✓ File analysis complete', type: 'success' },
      ],
    },
    {
      icon: '👥', title: 'AI signature detection',
      desc: 'Co-author scan · bot contributors · commit message entropy',
      logs: [
        { text: '→ Scanning for AI co-author signatures...', type: 'info' },
        { text: '⚠ "Co-authored-by: github-copilot" found in 3 commits', type: 'warn' },
        { text: '→ Checking commit message patterns...', type: 'info' },
        { text: '→ Analyzing commit time clustering...', type: 'info' },
        { text: '✓ Signature scan complete', type: 'success' },
      ],
    },
    {
      icon: '🏷️', title: 'Generating repo report',
      desc: 'Honesty score · red flags · verified skills',
      logs: [
        { text: '→ Weighing signal severity...', type: 'info' },
        { text: '→ Sending to Claude API for summary [MOCKED]', type: 'info' },
        { text: '→ Generating per-file honesty breakdown...', type: 'info' },
        { text: '✓ Report ready · score: 71/100', type: 'success' },
      ],
    },
  ];
}

function resumeSteps(filename: string, role: string): StepDef[] {
  return [
    {
      icon: '📄', title: 'PDF extraction',
      desc: 'Parsing PDF · stripping layout · recovering raw text',
      logs: [
        { text: `→ Reading "${filename || 'resume.pdf'}"...`, type: 'info' },
        { text: '→ Detected PDF version 1.6, 2 pages', type: 'info' },
        { text: '→ Extracting text layer (pdfplumber)...', type: 'info' },
        { text: '→ Stripping headers, footers, column artifacts...', type: 'info' },
        { text: '✓ 847 tokens extracted from PDF', type: 'success' },
      ],
    },
    {
      icon: '🧠', title: 'RAG keyword extraction',
      desc: 'Role-targeted skill keywords · contribution claims',
      logs: [
        { text: '→ Chunking resume into semantic segments...', type: 'info' },
        { text: `→ Role context: ${role} — loading role-specific tech taxonomy...`, type: 'info' },
        { text: '→ Running embedding similarity on skill vectors...', type: 'info' },
        { text: '→ Extracted skills: React, Node.js, Python, MongoDB, AWS, Docker', type: 'info' },
        { text: '→ Found 6 project contribution claims in experience section', type: 'info' },
        { text: '✓ 14 distinct skill claims · 6 project claims indexed', type: 'success' },
      ],
    },
    {
      icon: '🔗', title: 'Fetching GitHub activity',
      desc: 'Commit history · languages used · repo contribution map',
      logs: [
        { text: '→ Connecting to GitHub API...', type: 'info' },
        { text: '→ Fetching all public repositories...', type: 'info' },
        { text: '→ Indexing commit history (last 2 years)...', type: 'info' },
        { text: '→ Building per-language commit breakdown...', type: 'info' },
        { text: '✓ 3 repos · 94 commits · JS 62%, Python 28%, other 10%', type: 'success' },
      ],
    },
    {
      icon: '🧬', title: 'Cross-checking claims vs commits',
      desc: 'Matching each resume claim to actual code evidence',
      logs: [
        { text: '→ Sending claim vectors + commit data to Claude API [MOCKED]', type: 'info' },
        { text: '→ Claim "React" → 38 .tsx/.jsx files, 41 commits ✓', type: 'info' },
        { text: '→ Claim "AWS" → 0 config files, 0 mentions in any repo ✗', type: 'warn' },
        { text: '⚠ Claim "5 years experience" → earliest commit: 14 months ago', type: 'warn' },
        { text: '→ Claim "MongoDB" → found in schema files across 2 repos ✓', type: 'info' },
        { text: '→ Claim "Docker" → Dockerfile found in 1 repo ✓', type: 'info' },
        { text: '✓ Cross-check complete · 2 unverified claims · 1 tenure mismatch', type: 'success' },
      ],
    },
    {
      icon: '🏆', title: 'Generating match report',
      desc: 'Match score · gap severity · verified skill card',
      logs: [
        { text: '→ Weighing gap severity (AWS: high, tenure: medium)...', type: 'info' },
        { text: '→ Computing verified-to-claimed ratio...', type: 'info' },
        { text: '→ Building skill evidence map for profile card...', type: 'info' },
        { text: '✓ Match score: 68/100 · 3 issues flagged · report ready', type: 'success' },
      ],
    },
  ];
}

// ── Mock results ───────────────────────────────────────────────────────────────

function buildResult(mode: Mode): ResultData {
  if (mode === 'github') return {
    mode, score: 76, label: 'Mostly Honest',
    summary: 'Code history shows genuine development effort. AI assistance detected in a minority of commits. File naming patterns suggest partial AI involvement in boilerplate generation.',
    flags: [
      { text: 'Consistent commit cadence over 90 days', ok: true },
      { text: '4 commits co-authored by GitHub Copilot', ok: false },
      { text: 'Meaningful diff depth across repos', ok: true },
      { text: 'AI-style naming in 3 files', ok: false },
      { text: '1 JSON file unusually oversized', ok: false },
      { text: 'No duplicate commit messages', ok: true },
    ],
    details: [
      { title: 'Repos analyzed', value: '12', ok: true },
      { title: 'Verified commits', value: '90 / 94', ok: true },
      { title: 'AI-flagged commits', value: '4', ok: false },
      { title: 'Avg files / commit', value: '4.2', ok: true },
    ],
  };

  if (mode === 'repo') return {
    mode, score: 71, label: 'Partially Verified',
    summary: 'Single repo analysis shows genuine code with some AI-assisted commits. File structure is unusually flat for the project size, which may indicate scaffolded code.',
    flags: [
      { text: 'Real commit history found', ok: true },
      { text: 'File structure is unusually flat', ok: false },
      { text: '3 commits contain Copilot signature', ok: false },
      { text: 'Code-to-comment ratio is healthy', ok: true },
      { text: 'Commit messages are low-entropy', ok: false },
    ],
    details: [
      { title: 'Total commits', value: '47', ok: true },
      { title: 'AI-flagged commits', value: '3', ok: false },
      { title: 'File depth score', value: '2 / 5', ok: false },
      { title: 'Unique authors', value: '1', ok: true },
    ],
  };

  return {
    mode, score: 68, label: 'Claims Partially Match',
    summary: 'Resume claims match GitHub output for most skills, but 3 significant gaps were found. "AWS" and "5 years experience" claims are not supported by any code evidence.',
    flags: [
      { text: 'React — verified (38 files touched)', ok: true },
      { text: 'Node.js — verified (2 repos)', ok: true },
      { text: 'MongoDB — verified (2 repos)', ok: true },
      { text: 'AWS — NOT found in any code or config', ok: false },
      { text: '"5 years" — commit history shows 14 months', ok: false },
      { text: 'Python — partially verified (1 repo)', ok: true },
    ],
    details: [
      { title: 'Skills claimed', value: '14', ok: true },
      { title: 'Skills verified', value: '11 / 14', ok: true },
      { title: 'Major gaps', value: '2', ok: false },
      { title: 'Match score', value: '68%', ok: true },
    ],
  };
}

// ── Score ring ─────────────────────────────────────────────────────────────────

function ScoreRing({ score }: { score: number }) {
  const [displayed, setDisplayed] = useState(0);
  const r = 36;
  const circ = 2 * Math.PI * r;
  const offset = circ - (displayed / 100) * circ;
  const color = score >= 80 ? '#22c55e' : score >= 60 ? '#f59e0b' : '#ef4444';

  useEffect(() => {
    let i = 0;
    const iv = setInterval(() => {
      i += 2;
      setDisplayed(Math.min(i, score));
      if (i >= score) clearInterval(iv);
    }, 18);
    return () => clearInterval(iv);
  }, [score]);

  return (
    <div className="relative w-24 h-24 flex items-center justify-center flex-shrink-0">
      <svg className="absolute inset-0 -rotate-90" viewBox="0 0 88 88">
        <circle cx="44" cy="44" r={r} fill="none" stroke="#1e1e28" strokeWidth="6" />
        <circle cx="44" cy="44" r={r} fill="none" stroke={color} strokeWidth="6"
          strokeDasharray={circ} strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.05s linear' }}
        />
      </svg>
      <div className="text-center z-10">
        <div className="font-mono text-xl font-bold tabular-nums" style={{ color }}>{displayed}</div>
        <div className="font-mono text-[9px] text-[#3f3f46]">/100</div>
      </div>
    </div>
  );
}

// ── Pipeline screen ────────────────────────────────────────────────────────────

function PipelineView({ steps, onDone }: { steps: StepDef[]; onDone: () => void }) {
  const [stepStates, setStepStates] = useState<StepState[]>(steps.map(() => 'idle'));
  const [visibleLogs, setVisibleLogs] = useState<LogLine[][]>(steps.map(() => []));
  const [elapsed, setElapsed] = useState(0);
  const [currentStep, setCurrentStep] = useState(-1);
  const [finished, setFinished] = useState(false);
  const logsEndRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000);

    const STEP_GAP = 80;   // ms before first log of each step
    const LOG_GAP  = 160;  // ms between each log line

    let cursor = 200; // ms from mount

    steps.forEach((step, si) => {
      // Mark step as running
      setTimeout(() => {
        setCurrentStep(si);
        setStepStates(prev => prev.map((s, i) => i === si ? 'running' : s));
      }, cursor);
      cursor += STEP_GAP;

      // Reveal logs one by one
      step.logs.forEach((log) => {
        cursor += LOG_GAP;
        const t = cursor;
        setTimeout(() => {
          setVisibleLogs(prev => {
            const next = [...prev];
            next[si] = [...next[si], log];
            return next;
          });
        }, t);
      });

      // Mark step done
      cursor += STEP_GAP;
      const doneAt = cursor;
      setTimeout(() => {
        setStepStates(prev => prev.map((s, i) => {
          if (i !== si) return s;
          return steps[si].logs.some(l => l.type === 'warn') ? 'warn' : 'done';
        }));
      }, doneAt);
    });

    // Pipeline complete
    cursor += 150;
    setTimeout(() => {
      if (timerRef.current) clearInterval(timerRef.current);
      setFinished(true);
    }, cursor);

    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [visibleLogs]);

  const doneCount = stepStates.filter(s => s === 'done' || s === 'warn').length;

  return (
    <div className="flex flex-col gap-6">
      {/* Progress bar */}
      <div className="flex items-center gap-3">
        <div className="flex gap-1 flex-1">
          {steps.map((_, i) => {
            const s = stepStates[i];
            return (
              <div key={i} className={`h-0.5 flex-1 rounded-full transition-all duration-500 ${
                s === 'done' ? 'bg-[#22c55e]' :
                s === 'warn' ? 'bg-[#f59e0b]' :
                s === 'running' ? 'bg-[#6c63ff]' : 'bg-[#1e1e28]'
              }`} />
            );
          })}
        </div>
        <span className="font-mono text-[10px] text-[#52525b] flex-shrink-0 tabular-nums">
          {finished ? `done · ${elapsed}s` : `${elapsed}s · ${Math.max(currentStep + 1, 0)}/${steps.length}`}
        </span>
      </div>

      {/* Steps */}
      <div className="relative flex flex-col gap-0">
        <div className="absolute left-[18px] top-8 bottom-8 w-px bg-[#1e1e28]" />

        {steps.map((step, si) => {
          const state = stepStates[si];
          const logs = visibleLogs[si];

          return (
            <div key={si} className="relative flex gap-4 pb-5 last:pb-0">
              <div className={`relative flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center z-10 text-base transition-all duration-300
                ${state === 'idle' ? 'bg-[#0d0d14] border border-[#1e1e28] opacity-30' : ''}
                ${state === 'running' ? 'bg-[#0d0d14] border-2 border-[#6c63ff] shadow-[0_0_10px_rgba(108,99,255,0.25)]' : ''}
                ${state === 'done' ? 'bg-[#0d1a0d] border-2 border-[#22c55e]' : ''}
                ${state === 'warn' ? 'bg-[#1a140d] border-2 border-[#f59e0b]' : ''}
              `}>
                {state === 'running' && <span className="absolute inset-[-4px] rounded-full border border-[#6c63ff]/20 animate-ping" />}
                {step.icon}
              </div>

              <div className="flex-1 min-w-0 pt-1.5">
                <div className="flex items-baseline gap-2 flex-wrap">
                  <span className={`text-sm font-semibold ${state === 'idle' ? 'text-[#3f3f46]' : 'text-white'}`}>{step.title}</span>
                  {state === 'done' && <span className="text-[#22c55e] text-[10px] font-mono">✓ done</span>}
                  {state === 'warn' && <span className="text-[#f59e0b] text-[10px] font-mono">⚠ warnings</span>}
                  {state === 'running' && <span className="text-[#6c63ff] text-[10px] font-mono animate-pulse">● running</span>}
                </div>
                <p className={`text-[10px] font-mono mt-0.5 ${state === 'idle' ? 'text-[#2a2a35]' : 'text-[#52525b]'}`}>{step.desc}</p>

                {logs.length > 0 && (
                  <div className="mt-2 rounded-md bg-[#0a0a10] border border-[#1e1e28] px-3 py-2 font-mono text-[11px] space-y-1">
                    {logs.map((log, li) => (
                      <div key={li} className={
                        log.type === 'success' ? 'text-[#22c55e]' :
                        log.type === 'warn' ? 'text-[#f59e0b]' :
                        log.type === 'error' ? 'text-[#ef4444]' :
                        'text-[#52525b]'
                      }>{log.text}</div>
                    ))}
                    {state === 'running' && <div className="text-[#3f3f46]">▋</div>}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div ref={logsEndRef} />

      {finished && (
        <button
          onClick={onDone}
          className="w-full py-3 rounded-lg bg-[#6c63ff] text-white font-semibold text-sm hover:bg-[#7c73ff] hover:-translate-y-px transition-all active:translate-y-0 shadow-[0_0_20px_rgba(108,99,255,0.2)]"
        >
          view results → ({doneCount}/{steps.length} checks passed)
        </button>
      )}
    </div>
  );
}

// ── Result view ────────────────────────────────────────────────────────────────

function ResultView({ data, onReset }: { data: ResultData; onReset: () => void }) {
  const modeLabel = data.mode === 'github' ? 'GitHub Analysis' : data.mode === 'repo' ? 'Repository Report' : 'Resume Match';

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-5 p-5 rounded-xl border border-[#2a2a35] bg-[#111118]">
        <ScoreRing score={data.score} />
        <div className="flex-1 min-w-0">
          <div className="text-[9px] font-mono text-[#3f3f46] uppercase tracking-widest mb-1">{modeLabel} · Honesty score</div>
          <div className="text-lg font-bold text-white">{data.label}</div>
          <p className="text-xs text-[#52525b] mt-1.5 leading-relaxed">{data.summary}</p>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2">
        {data.details.map(d => (
          <div key={d.title} className={`p-3 rounded-lg border bg-[#111118] ${d.ok ? 'border-[#2a2a35]' : 'border-[#f59e0b]/20'}`}>
            <div className={`font-mono text-sm font-bold tabular-nums ${d.ok ? 'text-white' : 'text-[#f59e0b]'}`}>{d.value}</div>
            <div className="text-[9px] font-mono text-[#3f3f46] mt-0.5 uppercase tracking-wide leading-tight">{d.title}</div>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-[#2a2a35] bg-[#111118] overflow-hidden">
        <div className="px-5 py-3 border-b border-[#1e1e28]">
          <span className="text-xs font-semibold text-white">Signal breakdown</span>
        </div>
        <div className="divide-y divide-[#1e1e28]">
          {data.flags.map(f => (
            <div key={f.text} className="flex items-center gap-3 px-5 py-2.5">
              <span className={`text-[10px] font-mono flex-shrink-0 w-4 ${f.ok ? 'text-[#22c55e]' : 'text-[#f59e0b]'}`}>
                {f.ok ? '✓' : '⚠'}
              </span>
              <span className={`text-xs font-mono ${f.ok ? 'text-[#71717a]' : 'text-[#a1a1aa]'}`}>{f.text}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={onReset}
          className="flex-1 py-2.5 rounded-lg border border-[#2a2a35] text-[#52525b] text-xs font-mono hover:text-white hover:border-[#6c63ff]/30 transition-all"
        >
          ← run another check
        </button>
        <button className="flex-1 py-2.5 rounded-lg bg-[#111118] border border-[#2a2a35] text-[#52525b] text-xs font-mono hover:text-white hover:border-[#6c63ff]/30 transition-all">
          download report →
        </button>
      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [mode, setMode] = useState<Mode | null>(null);
  const [phase, setPhase] = useState<Phase>('select');
  const [repoUrl, setRepoUrl] = useState('');
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [resumeRole, setResumeRole] = useState('');
  const [roleOpen, setRoleOpen] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const roleDropdownRef = useRef<HTMLDivElement>(null);
  const [result, setResult] = useState<ResultData | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [user, loading, router]);

  const startPipeline = useCallback((m: Mode) => {
    setMode(m);
    setPhase('pipeline');
  }, []);

  const handleDone = useCallback(() => {
    if (!mode) return;
    setResult(buildResult(mode));
    setPhase('result');
  }, [mode]);

  // Close role dropdown when clicking outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (roleDropdownRef.current && !roleDropdownRef.current.contains(e.target as Node)) {
        setRoleOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const reset = () => {
    setMode(null);
    setPhase('select');
    setRepoUrl('');
    setResumeFile(null);
    setResumeRole('');
    setRoleOpen(false);
    setDragOver(false);
    setResult(null);
  };

  if (loading || !user) return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
      <div className="w-5 h-5 border-2 border-[#6c63ff]/30 border-t-[#6c63ff] rounded-full animate-spin" />
    </div>
  );

  const steps = mode === 'github'
    ? githubSteps(user.githubUsername ?? user.name)
    : mode === 'repo'
    ? repoSteps(repoUrl)
    : resumeSteps(resumeFile?.name ?? '', resumeRole);

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      <Nav />
      <div className="pt-20 pb-16 px-5 max-w-[720px] mx-auto">

        {/* Breadcrumb + back */}
        <div className="flex items-center gap-2 mb-6">
          <span className="font-mono text-xs text-[#6c63ff]">nexora</span>
          <span className="text-[#2a2a35]">/</span>
          <span className="font-mono text-xs text-[#52525b]">analyze</span>
          {mode && (
            <>
              <span className="text-[#2a2a35]">/</span>
              <span className="font-mono text-xs text-[#a78bfa]">{mode}</span>
            </>
          )}
          {phase !== 'select' && (
            <button onClick={reset} className="ml-auto text-[10px] font-mono text-[#3f3f46] hover:text-[#a1a1aa] transition-colors">
              ← back
            </button>
          )}
        </div>

        {/* ── SELECT MODE ─────────────────────────────────────────── */}
        {phase === 'select' && (
          <div className="flex flex-col gap-4">
            <div className="mb-2">
              <h1 className="text-xl font-bold text-white tracking-tight">Run a verification</h1>
              <p className="text-[#52525b] text-xs font-mono mt-1">Choose what to analyze — each check runs its own independent 5-step pipeline.</p>
            </div>

            {/* Primary: GitHub */}
            <button
              onClick={() => startPipeline('github')}
              className="group text-left p-5 rounded-xl border border-[#6c63ff]/25 bg-[#6c63ff]/5 hover:border-[#6c63ff]/50 hover:bg-[#6c63ff]/8 transition-all relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-40 h-40 pointer-events-none" style={{ background: 'radial-gradient(circle at top right, rgba(108,99,255,0.1) 0%, transparent 70%)' }} />
              <div className="relative z-10">
                <div className="flex items-start justify-between mb-3">
                  <span className="text-2xl">🔗</span>
                  <span className="text-[9px] font-mono px-2 py-0.5 rounded border border-[#6c63ff]/30 text-[#a78bfa]">recommended</span>
                </div>
                <div className="text-base font-bold text-white mb-1">Connect GitHub</div>
                <p className="text-xs text-[#71717a] leading-relaxed mb-4">Analyze all your repositories at once. Checks commit patterns, AI signatures, file naming, code-length ratios, and contributor metadata across your entire account.</p>
                <div className="flex flex-wrap gap-1.5">
                  {['all repos', 'commit timing', 'AI detection', 'file patterns', 'honesty score'].map(t => (
                    <span key={t} className="text-[9px] font-mono px-1.5 py-0.5 rounded border border-[#6c63ff]/20 bg-[#6c63ff]/8 text-[#8b83f7]">{t}</span>
                  ))}
                </div>
              </div>
            </button>

            <div className="grid grid-cols-2 gap-4">
              {/* Repo */}
              <button
                onClick={() => { setMode('repo'); setPhase('input'); }}
                className="group text-left p-5 rounded-xl border border-[#2a2a35] bg-[#111118] hover:border-[#6c63ff]/30 hover:-translate-y-px transition-all"
              >
                <span className="text-2xl block mb-3">📁</span>
                <div className="text-sm font-bold text-white mb-1">Paste a repo URL</div>
                <p className="text-xs text-[#52525b] leading-relaxed mb-4">Analyze one specific repository. Good for checking a single project before sharing it.</p>
                <div className="flex flex-wrap gap-1.5">
                  {['single repo', 'file structure', 'AI signatures'].map(t => (
                    <span key={t} className="text-[9px] font-mono px-1.5 py-0.5 rounded border border-[#2a2a35] text-[#3f3f46]">{t}</span>
                  ))}
                </div>
              </button>

              {/* Resume */}
              <button
                onClick={() => { setMode('resume'); setPhase('input'); }}
                className="group text-left p-5 rounded-xl border border-[#2a2a35] bg-[#111118] hover:border-[#f59e0b]/25 hover:-translate-y-px transition-all"
              >
                <span className="text-2xl block mb-3">📋</span>
                <div className="text-sm font-bold text-white mb-1">Match resume</div>
                <p className="text-xs text-[#52525b] leading-relaxed mb-4">Paste your resume and cross-check it against your actual GitHub output. Finds gaps between claims and code.</p>
                <div className="flex flex-wrap gap-1.5">
                  {['resume vs code', 'skill gaps', 'Claude API'].map(t => (
                    <span key={t} className="text-[9px] font-mono px-1.5 py-0.5 rounded border border-[#f59e0b]/15 text-[#78716c]">{t}</span>
                  ))}
                </div>
              </button>
            </div>
          </div>
        )}

        {/* ── INPUT: repo ──────────────────────────────────────────── */}
        {phase === 'input' && mode === 'repo' && (
          <div className="flex flex-col gap-5">
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight">Paste a repository URL</h1>
              <p className="text-[#52525b] text-xs font-mono mt-1">GitHub, GitLab, or Bitbucket — public repositories only</p>
            </div>
            <div className="flex items-center gap-2 bg-[#0d0d14] border border-[#2a2a35] rounded-lg px-3 py-3 focus-within:border-[#6c63ff]/60 transition-all">
              <span className="font-mono text-xs text-[#3f3f46] flex-shrink-0">url</span>
              <input
                type="text" value={repoUrl} onChange={e => setRepoUrl(e.target.value)}
                placeholder="https://github.com/username/repository"
                autoFocus
                onKeyDown={e => e.key === 'Enter' && repoUrl.trim() && startPipeline('repo')}
                className="flex-1 bg-transparent text-sm text-white font-mono placeholder:text-[#3f3f46] focus:outline-none"
              />
            </div>
            <button
              onClick={() => repoUrl.trim() && startPipeline('repo')}
              disabled={!repoUrl.trim()}
              className="w-full py-3 rounded-lg bg-[#6c63ff] text-white font-semibold text-sm hover:bg-[#7c73ff] hover:-translate-y-px transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              analyze repository →
            </button>
          </div>
        )}

        {/* ── INPUT: resume ────────────────────────────────────────── */}
        {phase === 'input' && mode === 'resume' && (
          <div className="flex flex-col gap-5">
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight">Upload your resume</h1>
              <p className="text-[#52525b] text-xs font-mono mt-1">PDF only — we'll extract skills and claims automatically.</p>
            </div>

            {/* Role dropdown */}
            <div>
              <label className="text-[10px] font-mono text-[#52525b] uppercase tracking-wider block mb-1.5">Your engineering role</label>
              <div ref={roleDropdownRef} className="relative">
                <button
                  type="button"
                  onClick={() => setRoleOpen(o => !o)}
                  className={`w-full flex items-center justify-between gap-2 bg-[#0d0d14] border rounded-lg px-3 py-2.5 text-sm font-mono text-left transition-all ${
                    roleOpen ? 'border-[#6c63ff]/60' : 'border-[#2a2a35] hover:border-[#3a3a45]'
                  }`}
                >
                  <span className={resumeRole ? 'text-white' : 'text-[#3f3f46]'}>
                    {resumeRole || 'Select your role...'}
                  </span>
                  <svg
                    className={`w-3.5 h-3.5 text-[#52525b] flex-shrink-0 transition-transform duration-200 ${roleOpen ? 'rotate-180' : ''}`}
                    fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {roleOpen && (
                  <div className="absolute z-50 top-full mt-1 w-full rounded-lg border border-[#2a2a35] bg-[#111118] shadow-xl overflow-hidden">
                    <div className="max-h-64 overflow-y-auto">
                      {ENGINEERING_ROLES.map(role => (
                        <button
                          key={role}
                          type="button"
                          onClick={() => { setResumeRole(role); setRoleOpen(false); }}
                          className={`w-full text-left px-3 py-2 text-xs font-mono transition-colors ${
                            resumeRole === role
                              ? 'bg-[#6c63ff]/15 text-[#a78bfa]'
                              : 'text-[#71717a] hover:bg-[#1a1a24] hover:text-white'
                          }`}
                        >
                          {resumeRole === role && <span className="text-[#6c63ff] mr-2">✓</span>}
                          {role}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Drop zone */}
            <div
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={e => {
                e.preventDefault();
                setDragOver(false);
                const f = e.dataTransfer.files[0];
                if (f && f.type === 'application/pdf') setResumeFile(f);
              }}
              onClick={() => !resumeFile && fileInputRef.current?.click()}
              className={`relative flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed transition-all cursor-pointer
                ${resumeFile
                  ? 'border-[#6c63ff]/50 bg-[#6c63ff]/5 cursor-default'
                  : dragOver
                  ? 'border-[#6c63ff] bg-[#6c63ff]/10 scale-[1.01]'
                  : 'border-[#2a2a35] bg-[#0d0d14] hover:border-[#6c63ff]/40 hover:bg-[#6c63ff]/3'
                }`}
              style={{ minHeight: 200 }}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={e => {
                  const f = e.target.files?.[0];
                  if (f) setResumeFile(f);
                }}
              />

              {resumeFile ? (
                <div className="flex flex-col items-center gap-3 px-6 py-8">
                  <div className="w-12 h-12 rounded-xl bg-[#6c63ff]/15 border border-[#6c63ff]/30 flex items-center justify-center text-2xl">📄</div>
                  <div className="text-center">
                    <div className="text-sm font-semibold text-white">{resumeFile.name}</div>
                    <div className="text-[10px] font-mono text-[#52525b] mt-0.5">
                      {(resumeFile.size / 1024).toFixed(0)} KB · PDF
                    </div>
                  </div>
                  <button
                    onClick={e => { e.stopPropagation(); setResumeFile(null); }}
                    className="text-[10px] font-mono text-[#3f3f46] hover:text-[#ef4444] transition-colors"
                  >
                    remove ×
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3 px-6 py-10 select-none">
                  <div className="w-12 h-12 rounded-xl bg-[#1e1e28] border border-[#2a2a35] flex items-center justify-center text-2xl">
                    {dragOver ? '📂' : '📄'}
                  </div>
                  <div className="text-center">
                    <div className="text-sm font-semibold text-white">{dragOver ? 'Drop it here' : 'Drop your resume PDF here'}</div>
                    <div className="text-[10px] font-mono text-[#3f3f46] mt-1">or click to browse · PDF only</div>
                  </div>
                  <div className="flex gap-3 mt-1">
                    {['role auto-detected', 'skills extracted', 'claims indexed'].map(t => (
                      <span key={t} className="text-[9px] font-mono px-1.5 py-0.5 rounded border border-[#2a2a35] text-[#3f3f46]">{t}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* What we extract */}
            {!resumeFile && (
              <div className="grid grid-cols-3 gap-2">
                {[
                  { icon: '🎯', label: 'Role detection', desc: 'Job title inferred from content' },
                  { icon: '🏷️', label: 'Skill keywords', desc: 'Tech extracted via RAG embeddings' },
                  { icon: '📝', label: 'Contribution claims', desc: 'Experience bullets cross-checked' },
                ].map(item => (
                  <div key={item.label} className="p-3 rounded-lg border border-[#1e1e28] bg-[#0d0d14]">
                    <div className="text-base mb-1.5">{item.icon}</div>
                    <div className="text-[10px] font-semibold text-[#a1a1aa]">{item.label}</div>
                    <div className="text-[9px] font-mono text-[#3f3f46] mt-0.5 leading-relaxed">{item.desc}</div>
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={() => resumeFile && resumeRole && startPipeline('resume')}
              disabled={!resumeFile || !resumeRole}
              className="w-full py-3 rounded-lg bg-[#6c63ff] text-white font-semibold text-sm hover:bg-[#7c73ff] hover:-translate-y-px transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {!resumeRole
                ? 'select a role to continue'
                : !resumeFile
                ? 'upload a PDF to continue'
                : `analyze ${resumeFile.name} →`}
            </button>
          </div>
        )}

        {/* ── PIPELINE ─────────────────────────────────────────────── */}
        {phase === 'pipeline' && mode && (
          <div className="flex flex-col gap-6">
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight">
                {mode === 'github' ? 'Analyzing your GitHub' : mode === 'repo' ? 'Analyzing repository' : 'Matching resume'}
              </h1>
              <p className="text-[#3f3f46] text-xs font-mono mt-1">
                {mode === 'github'
                  ? `${user.githubUsername ?? user.name} · all repositories`
                  : mode === 'repo'
                  ? repoUrl
                  : `${resumeFile?.name ?? 'resume.pdf'} · ${resumeRole}`}
              </p>
            </div>
            <PipelineView steps={steps} onDone={handleDone} />
          </div>
        )}

        {/* ── RESULT ───────────────────────────────────────────────── */}
        {phase === 'result' && result && (
          <div className="flex flex-col gap-5">
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight">Analysis complete</h1>
              <p className="text-[#3f3f46] text-xs font-mono mt-1">
                {mode === 'github'
                  ? `${user.githubUsername ?? user.name} · all repositories`
                  : mode === 'repo'
                  ? repoUrl
                  : `${resumeRole} · ${resumeFile?.name ?? 'resume.pdf'}`}
              </p>
            </div>
            <ResultView data={result} onReset={reset} />
          </div>
        )}

      </div>
    </div>
  );
}
