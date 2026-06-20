'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../components/AuthContext';
import Nav from '../components/Nav';

// ── Engineering roles ──────────────────────────────────────────────────────────

const ENGINEERING_ROLES = [
  'Front-End Engineer', 'Back-End Engineer', 'Full Stack Engineer',
  'Software Engineer in Test (QA Engineer)', 'Software Development Engineer in Test (SDET)',
  'DevOps Engineer', 'Security Engineer', 'Data Engineer', 'Cloud Architect',
  'Systems Engineer', 'Mobile Engineer', 'Technical Support Engineer', 'Game Developer',
  'Machine Learning (ML) Engineer', 'Artificial Intelligence (AI) Engineer',
  'Blockchain Engineer', 'Embedded Systems Engineer',
  'Web Application Security Engineer (WASE)', 'Site Reliability Engineer (SRE)',
  'User Experience (UX) Engineer', 'User Interface (UI) Engineer',
  'Robotics Engineer', 'Internet of Things (IoT) Engineer', 'Software Integration Engineer',
] as const;

// ── Types ──────────────────────────────────────────────────────────────────────

type Mode = 'github' | 'repo' | 'resume' | 'combined';
type Phase = 'select' | 'input' | 'pipeline' | 'result';
type StepState = 'idle' | 'running' | 'done' | 'warn';

interface LogLine { text: string; type: 'info' | 'success' | 'warn' | 'error'; }
interface StepDef { icon: string; title: string; desc: string; logs: LogLine[]; }

interface SubScore {
  label: string;
  score: number;   // out of 20
  icon: string;
  desc: string;
}

interface CaughtCommit {
  hash: string;
  message: string;
  trigger: string;
  triggerType: 'co-author' | 'generic-message' | 'file-pattern' | 'burst';
  date: string;
  pct: number;
}

interface ResultData {
  mode: Mode;
  score: number;
  label: string;
  summary: string;
  subScores: SubScore[];
  flags: { text: string; ok: boolean }[];
  details: { title: string; value: string; ok: boolean }[];
  caughtCommits: CaughtCommit[];
  username?: string;
}

// ── Pipeline step definitions ──────────────────────────────────────────────────

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
        { text: '⚠ 3 files match AI naming patterns (utils2.js, helper_v3.py)', type: 'warn' },
        { text: '→ Analyzing commit time distribution...', type: 'info' },
        { text: '→ Checking code-length vs file-type ratios...', type: 'info' },
        { text: '⚠ 1 repo: JSON file exceeds expected size by 340%', type: 'warn' },
        { text: '✓ Pattern analysis complete', type: 'success' },
      ],
    },
    {
      icon: '👥', title: 'Contributor & AI signature scan',
      desc: 'Co-author metadata · bot contributors · commit message quality',
      logs: [
        { text: '→ Scanning co-author metadata in commits...', type: 'info' },
        { text: '→ Checking for github-copilot bot contributor...', type: 'info' },
        { text: '⚠ 4 commits contain "Co-authored-by: github-copilot[bot]"', type: 'warn' },
        { text: '→ Analyzing commit message entropy...', type: 'info' },
        { text: '⚠ 11 commits use generic messages ("fix bug", "update", "wip")', type: 'warn' },
        { text: '✓ Contributor scan complete', type: 'success' },
      ],
    },
    {
      icon: '🏷️', title: 'Generating honesty score',
      desc: 'Aggregating signals · weighted sub-scores · proof ledger',
      logs: [
        { text: '→ Computing commit consistency score...', type: 'info' },
        { text: '→ Measuring diff depth across repos...', type: 'info' },
        { text: '→ Weighing AI signature penalty...', type: 'info' },
        { text: '→ Checking deployment evidence...', type: 'info' },
        { text: '→ Computing weighted total...', type: 'info' },
        { text: '✓ Proof ledger ready · score: 76/100', type: 'success' },
      ],
    },
  ];
}

function repoSteps(url: string): StepDef[] {
  const repo = url.split('/').slice(-2).join('/') || 'repository';
  return [
    {
      icon: '🔗', title: 'Connecting to repository',
      desc: 'Clone metadata · branch info · contributor list',
      logs: [
        { text: `→ Resolving ${repo}...`, type: 'info' },
        { text: '→ Checking repository visibility (public) ✓', type: 'info' },
        { text: '→ Fetching branch list and default branch...', type: 'info' },
        { text: '✓ Repository accessible · 1 contributor', type: 'success' },
      ],
    },
    {
      icon: '📦', title: 'Fetching commit history',
      desc: 'Full git log · author breakdown · diff sizes',
      logs: [
        { text: '→ Pulling full commit log...', type: 'info' },
        { text: '→ Found 47 commits across 6 branches', type: 'info' },
        { text: '→ Fetching diff stats for each commit...', type: 'info' },
        { text: '✓ 47 commits indexed · avg 4.2 files/commit', type: 'success' },
      ],
    },
    {
      icon: '🧬', title: 'Code pattern analysis',
      desc: 'File depth · naming patterns · code-to-comment ratio',
      logs: [
        { text: '→ Analyzing file tree depth...', type: 'info' },
        { text: '⚠ File structure is unusually flat for project size', type: 'warn' },
        { text: '→ Checking code-to-comment ratio...', type: 'info' },
        { text: '→ Ratio: 8.4:1 (healthy range)', type: 'info' },
        { text: '✓ Pattern scan complete', type: 'success' },
      ],
    },
    {
      icon: '👥', title: 'AI signature scan',
      desc: 'Co-author tags · message entropy · scaffolded patterns',
      logs: [
        { text: '→ Scanning commit metadata for AI signatures...', type: 'info' },
        { text: '⚠ 3 commits: "Co-authored-by: github-copilot[bot]"', type: 'warn' },
        { text: '→ Commit message entropy: 2.1 bits (low)', type: 'warn' },
        { text: '⚠ 8 commits use single-word messages', type: 'warn' },
        { text: '✓ AI scan complete', type: 'success' },
      ],
    },
    {
      icon: '🏷️', title: 'Generating score',
      desc: 'Sub-score breakdown · proof ledger entry',
      logs: [
        { text: '→ Scoring commit consistency...', type: 'info' },
        { text: '→ Scoring diff depth...', type: 'info' },
        { text: '→ Applying AI penalty (3 flagged)...', type: 'warn' },
        { text: '✓ Score: 71/100 · proof ledger ready', type: 'success' },
      ],
    },
  ];
}

function resumeSteps(filename: string, role: string): StepDef[] {
  return [
    {
      icon: '📄', title: 'Extracting resume content',
      desc: 'PDF parse · text extraction · section detection',
      logs: [
        { text: `→ Parsing ${filename || 'resume.pdf'}...`, type: 'info' },
        { text: '→ Detected sections: Experience, Skills, Projects, Education', type: 'info' },
        { text: `→ Role inferred: ${role || 'Software Engineer'}`, type: 'info' },
        { text: '✓ 14 skill claims · 6 experience bullets extracted', type: 'success' },
      ],
    },
    {
      icon: '🔗', title: 'Connecting to GitHub',
      desc: 'Token validation · repo list · commit history',
      logs: [
        { text: '→ Validating linked GitHub account...', type: 'info' },
        { text: '→ Found 12 repositories', type: 'info' },
        { text: '→ Indexing languages and file types...', type: 'info' },
        { text: '✓ GitHub data ready', type: 'success' },
      ],
    },
    {
      icon: '🧬', title: 'Code pattern scan',
      desc: 'AI signatures · commit quality · file patterns',
      logs: [
        { text: '→ Scanning for AI co-author signatures...', type: 'info' },
        { text: '⚠ 4 commits flagged with AI co-author', type: 'warn' },
        { text: '→ Commit message quality scan...', type: 'info' },
        { text: '✓ Pattern scan done', type: 'success' },
      ],
    },
    {
      icon: '🔎', title: 'Cross-referencing claims',
      desc: 'Resume skills vs. actual repositories · tenure check',
      logs: [
        { text: '→ Matching resume skills to GitHub languages...', type: 'info' },
        { text: '→ "React" → 38 .tsx files across 3 repos ✓', type: 'info' },
        { text: '→ "Node.js" → package.json found in 2 repos ✓', type: 'info' },
        { text: '⚠ "AWS" → 0 config files, 0 mentions in any repo ✗', type: 'warn' },
        { text: '⚠ "5 years" → earliest commit: 14 months ago ✗', type: 'warn' },
        { text: '✓ Cross-check: 11/14 claims verified', type: 'success' },
      ],
    },
    {
      icon: '🏆', title: 'Generating match report',
      desc: 'Match score · gap severity · sub-score breakdown',
      logs: [
        { text: '→ Weighing gap severity (AWS: high, tenure: medium)...', type: 'info' },
        { text: '→ Computing resume match sub-score...', type: 'info' },
        { text: '→ Building verified skill card for profile...', type: 'info' },
        { text: '✓ Score: 68/100 · 3 issues flagged · ledger ready', type: 'success' },
      ],
    },
  ];
}

function combinedSteps(username: string, filename: string, role: string): StepDef[] {
  return [
    {
      icon: '📄', title: 'Extracting resume content',
      desc: 'PDF parse · skill claims · experience bullets',
      logs: [
        { text: `→ Parsing ${filename || 'resume.pdf'}...`, type: 'info' },
        { text: '→ Sections detected: Experience, Skills, Projects', type: 'info' },
        { text: `→ Target role: ${role || 'Software Engineer'}`, type: 'info' },
        { text: '✓ 14 skill claims · 6 experience bullets extracted', type: 'success' },
      ],
    },
    {
      icon: '📡', title: 'GitHub handshake & repo fetch',
      desc: 'OAuth token · all repositories · commit history',
      logs: [
        { text: `→ Authenticated as ${username || 'user'} ✓`, type: 'info' },
        { text: '→ Found 12 repositories', type: 'info' },
        { text: '→ Indexing 94 commits across all repos', type: 'info' },
        { text: '✓ GitHub data ready', type: 'success' },
      ],
    },
    {
      icon: '🧬', title: 'Code pattern & AI scan',
      desc: 'AI signatures · commit quality · file naming',
      logs: [
        { text: '→ Scanning AI co-author metadata...', type: 'info' },
        { text: '⚠ 4 commits flagged: "Co-authored-by: github-copilot[bot]"', type: 'warn' },
        { text: '→ Commit message entropy: 2.3 bits (borderline)', type: 'warn' },
        { text: '⚠ 11 generic messages detected', type: 'warn' },
        { text: '✓ AI scan complete', type: 'success' },
      ],
    },
    {
      icon: '🔎', title: 'Cross-referencing resume vs. code',
      desc: 'Skill match · tenure verification · project evidence',
      logs: [
        { text: '→ Matching 14 resume skills to actual repositories...', type: 'info' },
        { text: '→ React ✓ · Node.js ✓ · MongoDB ✓ · Python (partial) ✓', type: 'info' },
        { text: '⚠ "AWS" → no config files, S3 imports, or IAM mentions found', type: 'warn' },
        { text: '⚠ "5 years experience" → oldest commit: 14 months ago', type: 'warn' },
        { text: '✓ 11/14 claims verified · 2 unverifiable · 1 tenure gap', type: 'success' },
      ],
    },
    {
      icon: '🏆', title: 'Generating combined proof score',
      desc: '5 sub-scores · weighted total · proof ledger',
      logs: [
        { text: '→ Commit consistency: analysing cadence...', type: 'info' },
        { text: '→ Diff depth: measuring code substance...', type: 'info' },
        { text: '→ AI clean: applying penalty for 4 flagged commits...', type: 'warn' },
        { text: '→ Deployment: checking for live project evidence...', type: 'info' },
        { text: '→ Resume match: 11/14 claims verified...', type: 'info' },
        { text: '✓ Combined score: 72/100 · proof ledger ready', type: 'success' },
      ],
    },
  ];
}

// ── Mock results ───────────────────────────────────────────────────────────────

const MOCK_CAUGHT: CaughtCommit[] = [
  { hash: 'a1b2c3d', message: 'Co-authored-by: github-copilot[bot]', trigger: 'Co-authored-by: github-copilot[bot]', triggerType: 'co-author', date: '2024-11-12', pct: 4.3 },
  { hash: 'f4e5d6c', message: 'fix bug', trigger: 'Single-word generic commit message', triggerType: 'generic-message', date: '2024-10-28', pct: 1.1 },
  { hash: '9g8h7i6', message: 'update', trigger: 'Single-word generic commit message', triggerType: 'generic-message', date: '2024-10-15', pct: 1.1 },
  { hash: 'j1k2l3m', message: 'Co-authored-by: github-copilot[bot]', trigger: 'Co-authored-by: github-copilot[bot]', triggerType: 'co-author', date: '2024-09-30', pct: 4.3 },
];

function buildResult(mode: Mode, username?: string): ResultData {
  if (mode === 'github') return {
    mode, score: 76, label: 'Mostly Honest', username,
    summary: 'Code history shows genuine development effort. AI assistance detected in a minority of commits. File naming patterns suggest partial AI involvement in boilerplate generation.',
    subScores: [
      { label: 'Commit Consistency', score: 17, icon: '📅', desc: 'Regular cadence, no burst days' },
      { label: 'Diff Depth', score: 16, icon: '📐', desc: 'Meaningful file changes per commit' },
      { label: 'AI Clean', score: 12, icon: '🤖', desc: '4 flagged commits, 11 generic messages' },
      { label: 'Deployment Verified', score: 15, icon: '🚀', desc: 'Live project evidence found' },
      { label: 'Resume Match', score: 16, icon: '📋', desc: 'Estimated from skill diversity' },
    ],
    flags: [
      { text: 'Consistent commit cadence over 90 days', ok: true },
      { text: '4 commits co-authored by GitHub Copilot', ok: false },
      { text: 'Meaningful diff depth across repos', ok: true },
      { text: 'AI-style naming in 3 files (utils2.js, helper_v3.py)', ok: false },
      { text: 'No duplicate commit messages', ok: true },
    ],
    details: [
      { title: 'Repos analyzed', value: '12', ok: true },
      { title: 'Commits verified', value: '90/94', ok: true },
      { title: 'AI-flagged', value: '4', ok: false },
      { title: 'Avg files/commit', value: '4.2', ok: true },
    ],
    caughtCommits: MOCK_CAUGHT,
  };

  if (mode === 'repo') return {
    mode, score: 71, label: 'Partially Verified', username,
    summary: 'Single repo analysis shows genuine code with some AI-assisted commits. File structure is unusually flat for the project size, suggesting scaffolded code.',
    subScores: [
      { label: 'Commit Consistency', score: 15, icon: '📅', desc: 'Slight burst pattern detected' },
      { label: 'Diff Depth', score: 13, icon: '📐', desc: 'Flat file structure, shallow diffs' },
      { label: 'AI Clean', score: 11, icon: '🤖', desc: '3 co-author flags, low message entropy' },
      { label: 'Deployment Verified', score: 16, icon: '🚀', desc: 'README has deployment link' },
      { label: 'Resume Match', score: 16, icon: '📋', desc: 'N/A — no resume provided' },
    ],
    flags: [
      { text: 'Real commit history found', ok: true },
      { text: 'File structure is unusually flat', ok: false },
      { text: '3 commits contain Copilot signature', ok: false },
      { text: 'Code-to-comment ratio is healthy', ok: true },
      { text: 'Commit messages are low-entropy', ok: false },
    ],
    details: [
      { title: 'Total commits', value: '47', ok: true },
      { title: 'AI-flagged', value: '3', ok: false },
      { title: 'File depth score', value: '2/5', ok: false },
      { title: 'Unique authors', value: '1', ok: true },
    ],
    caughtCommits: MOCK_CAUGHT.slice(0, 3),
  };

  if (mode === 'resume') return {
    mode, score: 68, label: 'Claims Partially Match', username,
    summary: 'Resume claims match GitHub output for most skills, but 3 significant gaps were found. "AWS" and "5 years experience" are not supported by any code evidence.',
    subScores: [
      { label: 'Commit Consistency', score: 15, icon: '📅', desc: 'Regular commits over 14 months' },
      { label: 'Diff Depth', score: 14, icon: '📐', desc: 'Average diff depth across repos' },
      { label: 'AI Clean', score: 11, icon: '🤖', desc: '4 flagged commits found' },
      { label: 'Deployment Verified', score: 13, icon: '🚀', desc: 'Only 1 live project found' },
      { label: 'Resume Match', score: 15, icon: '📋', desc: '11/14 claims verified in code' },
    ],
    flags: [
      { text: 'React — verified (38 .tsx files across 3 repos)', ok: true },
      { text: 'Node.js — verified (2 repos with package.json)', ok: true },
      { text: 'MongoDB — verified (schema files in 2 repos)', ok: true },
      { text: 'AWS — NOT found in any code or config', ok: false },
      { text: '"5 years" — commit history shows 14 months', ok: false },
      { text: 'Python — partially verified (1 repo)', ok: true },
    ],
    details: [
      { title: 'Skills claimed', value: '14', ok: true },
      { title: 'Skills verified', value: '11/14', ok: true },
      { title: 'Major gaps', value: '2', ok: false },
      { title: 'Match score', value: '68%', ok: true },
    ],
    caughtCommits: MOCK_CAUGHT.slice(0, 2),
  };

  // combined
  return {
    mode, score: 72, label: 'Verified with Gaps', username,
    summary: 'Combined analysis of GitHub activity and resume claims. Most skills are backed by real code, but 2 resume claims have no evidence and AI assistance was detected in 4 commits.',
    subScores: [
      { label: 'Commit Consistency', score: 16, icon: '📅', desc: 'Consistent cadence over 90 days' },
      { label: 'Diff Depth', score: 15, icon: '📐', desc: 'Solid code substance per commit' },
      { label: 'AI Clean', score: 12, icon: '🤖', desc: '4 co-author flags, 11 generic messages' },
      { label: 'Deployment Verified', score: 14, icon: '🚀', desc: '2 live projects confirmed' },
      { label: 'Resume Match', score: 15, icon: '📋', desc: '11/14 resume claims verified' },
    ],
    flags: [
      { text: 'React · Node.js · MongoDB — all verified in repos', ok: true },
      { text: 'AWS — 0 code or config evidence found', ok: false },
      { text: '"5 years experience" — history shows 14 months', ok: false },
      { text: '4 commits co-authored by GitHub Copilot', ok: false },
      { text: 'Consistent commit cadence across all repos', ok: true },
      { text: '2 live deployment URLs found', ok: true },
    ],
    details: [
      { title: 'Skills verified', value: '11/14', ok: true },
      { title: 'AI-flagged', value: '4', ok: false },
      { title: 'Repos analyzed', value: '12', ok: true },
      { title: 'Tenure verified', value: '14 mo', ok: true },
    ],
    caughtCommits: MOCK_CAUGHT,
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
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
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

// ── Sub-score bar ──────────────────────────────────────────────────────────────

function SubScoreBar({ sub, delay }: { sub: SubScore; delay: number }) {
  const [width, setWidth] = useState(0);
  const pct = (sub.score / 20) * 100;
  const color = sub.score >= 16 ? '#22c55e' : sub.score >= 12 ? '#f59e0b' : '#ef4444';

  useEffect(() => {
    const t = setTimeout(() => setWidth(pct), delay);
    return () => clearTimeout(t);
  }, [pct, delay]);

  return (
    <div className="flex items-center gap-3">
      <div className="w-5 text-sm flex-shrink-0 text-center">{sub.icon}</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between mb-1">
          <span className="text-[10px] font-semibold text-[#a1a1aa]">{sub.label}</span>
          <span className="font-mono text-[10px] tabular-nums" style={{ color }}>
            {sub.score}<span className="text-[#3f3f46]">/20</span>
          </span>
        </div>
        <div className="h-1 rounded-full bg-[#1e1e28] overflow-hidden">
          <div className="h-full rounded-full transition-all duration-700 ease-out" style={{ width: `${width}%`, background: color }} />
        </div>
        <div className="text-[9px] font-mono text-[#3f3f46] mt-0.5">{sub.desc}</div>
      </div>
    </div>
  );
}

// ── Caught commit badge ────────────────────────────────────────────────────────

const TRIGGER_COLORS = {
  'co-author': 'border-[#ef4444]/20 bg-[#ef4444]/5 text-[#ef4444]',
  'generic-message': 'border-[#f59e0b]/20 bg-[#f59e0b]/5 text-[#f59e0b]',
  'file-pattern': 'border-[#a78bfa]/20 bg-[#a78bfa]/5 text-[#a78bfa]',
  'burst': 'border-[#f59e0b]/20 bg-[#f59e0b]/5 text-[#f59e0b]',
};

const TRIGGER_LABELS = {
  'co-author': 'AI co-author',
  'generic-message': 'Generic message',
  'file-pattern': 'File pattern',
  'burst': 'Commit burst',
};

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
    const STEP_GAP = 80;
    const LOG_GAP = 160;
    let cursor = 200;

    steps.forEach((step, si) => {
      setTimeout(() => {
        setCurrentStep(si);
        setStepStates(prev => prev.map((s, i) => i === si ? 'running' : s));
      }, cursor);
      cursor += STEP_GAP;

      step.logs.forEach(() => {
        cursor += LOG_GAP;
        const t = cursor;
        const li_copy = step.logs.indexOf(step.logs[step.logs.length - 1]);
        setTimeout(() => {
          setVisibleLogs(prev => {
            const next = [...prev];
            const nextLogs = [...next[si]];
            const idx = nextLogs.length;
            if (idx < step.logs.length) nextLogs.push(step.logs[idx]);
            next[si] = nextLogs;
            return next;
          });
        }, t);
        void li_copy;
      });

      cursor += STEP_GAP;
      const doneAt = cursor;
      setTimeout(() => {
        setStepStates(prev => prev.map((s, i) => {
          if (i !== si) return s;
          return steps[si].logs.some(l => l.type === 'warn') ? 'warn' : 'done';
        }));
      }, doneAt);
    });

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
      <div className="flex items-center gap-3">
        <div className="flex gap-1 flex-1">
          {steps.map((_, i) => {
            const s = stepStates[i];
            return (
              <div key={i} className={`h-0.5 flex-1 rounded-full transition-all duration-500 ${
                s === 'done' ? 'bg-[#22c55e]' : s === 'warn' ? 'bg-[#f59e0b]' : s === 'running' ? 'bg-[#6c63ff]' : 'bg-[#1e1e28]'
              }`} />
            );
          })}
        </div>
        <span className="font-mono text-[10px] text-[#52525b] flex-shrink-0 tabular-nums">
          {finished ? `done · ${elapsed}s` : `${elapsed}s · ${Math.max(currentStep + 1, 0)}/${steps.length}`}
        </span>
      </div>

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
                        log.type === 'error' ? 'text-[#ef4444]' : 'text-[#52525b]'
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
          view proof ledger → ({doneCount}/{steps.length} checks passed)
        </button>
      )}
    </div>
  );
}

// ── Result / Proof ledger view ────────────────────────────────────────────────

function ResultView({ data, onReset }: { data: ResultData; onReset: () => void }) {
  const [showCaught, setShowCaught] = useState(false);
  const [copied, setCopied] = useState(false);

  const modeLabel =
    data.mode === 'github' ? 'GitHub Analysis' :
    data.mode === 'repo' ? 'Repository Report' :
    data.mode === 'resume' ? 'Resume Match' : 'Combined Proof';

  const totalSubScore = data.subScores.reduce((s, x) => s + x.score, 0);

  const copyLink = () => {
    const url = `${window.location.origin}/u/${data.username ?? 'user'}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="flex flex-col gap-5">

      {/* Header — score + label */}
      <div className="flex items-center gap-5 p-5 rounded-xl border border-[#2a2a35] bg-[#111118]">
        <ScoreRing score={data.score} />
        <div className="flex-1 min-w-0">
          <div className="text-[9px] font-mono text-[#3f3f46] uppercase tracking-widest mb-1">{modeLabel} · Proof Ledger</div>
          <div className="text-lg font-bold text-white">{data.label}</div>
          <p className="text-xs text-[#52525b] mt-1.5 leading-relaxed">{data.summary}</p>
        </div>
      </div>

      {/* Sub-score breakdown */}
      <div className="rounded-xl border border-[#2a2a35] bg-[#111118] overflow-hidden">
        <div className="px-5 py-3 border-b border-[#1e1e28] flex items-center justify-between">
          <span className="text-xs font-semibold text-white">Score breakdown</span>
          <span className="font-mono text-[10px] text-[#52525b]">
            <span className="text-white tabular-nums">{totalSubScore}</span>/100
          </span>
        </div>
        <div className="px-5 py-4 flex flex-col gap-4">
          {data.subScores.map((sub, i) => (
            <SubScoreBar key={sub.label} sub={sub} delay={200 + i * 120} />
          ))}
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-4 gap-2">
        {data.details.map(d => (
          <div key={d.title} className={`p-3 rounded-lg border bg-[#111118] ${d.ok ? 'border-[#2a2a35]' : 'border-[#f59e0b]/20'}`}>
            <div className={`font-mono text-sm font-bold tabular-nums ${d.ok ? 'text-white' : 'text-[#f59e0b]'}`}>{d.value}</div>
            <div className="text-[9px] font-mono text-[#3f3f46] mt-0.5 uppercase tracking-wide leading-tight">{d.title}</div>
          </div>
        ))}
      </div>

      {/* Signal flags */}
      <div className="rounded-xl border border-[#2a2a35] bg-[#111118] overflow-hidden">
        <div className="px-5 py-3 border-b border-[#1e1e28]">
          <span className="text-xs font-semibold text-white">Signal breakdown</span>
        </div>
        <div className="divide-y divide-[#1e1e28]">
          {data.flags.map(f => (
            <div key={f.text} className="flex items-center gap-3 px-5 py-2.5">
              <span className={`text-[10px] font-mono flex-shrink-0 ${f.ok ? 'text-[#22c55e]' : 'text-[#f59e0b]'}`}>{f.ok ? '✓' : '⚠'}</span>
              <span className={`text-xs font-mono ${f.ok ? 'text-[#71717a]' : 'text-[#a1a1aa]'}`}>{f.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Caught commits — expandable */}
      {data.caughtCommits.length > 0 && (
        <div className="rounded-xl border border-[#ef4444]/15 bg-[#0d0d14] overflow-hidden">
          <button
            onClick={() => setShowCaught(o => !o)}
            className="w-full flex items-center justify-between px-5 py-3 hover:bg-[#ef4444]/3 transition-colors"
          >
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#ef4444]/10 border border-[#ef4444]/20 text-[#ef4444]">
                {data.caughtCommits.length} flagged
              </span>
              <span className="text-xs font-semibold text-white">Caught commits</span>
            </div>
            <svg className={`w-3.5 h-3.5 text-[#52525b] transition-transform ${showCaught ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {showCaught && (
            <div className="border-t border-[#ef4444]/10 divide-y divide-[#1e1e28]">
              {data.caughtCommits.map(c => (
                <div key={c.hash} className="px-5 py-3 flex items-start gap-3">
                  <span className="font-mono text-[10px] text-[#3f3f46] mt-0.5 flex-shrink-0 w-14">{c.hash}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded border ${TRIGGER_COLORS[c.triggerType]}`}>
                        {TRIGGER_LABELS[c.triggerType]}
                      </span>
                      <span className="text-[9px] font-mono text-[#3f3f46]">{c.date}</span>
                      <span className="text-[9px] font-mono text-[#3f3f46]">{c.pct.toFixed(1)}% of total</span>
                    </div>
                    <div className="text-[10px] font-mono text-[#71717a] truncate">{c.trigger}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Shareable link + actions */}
      <div className="rounded-xl border border-[#6c63ff]/20 bg-[#6c63ff]/5 p-4 flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <div className="text-[10px] font-mono text-[#6c63ff] mb-0.5">shareable proof link</div>
          <div className="font-mono text-xs text-[#a78bfa] truncate">
            {typeof window !== 'undefined' ? window.location.origin : 'https://verifo.app'}/u/{data.username ?? 'you'}
          </div>
        </div>
        <button
          onClick={copyLink}
          className={`flex-shrink-0 px-3 py-1.5 rounded-lg border text-[10px] font-mono transition-all ${
            copied
              ? 'border-[#22c55e]/40 bg-[#22c55e]/10 text-[#22c55e]'
              : 'border-[#6c63ff]/30 text-[#a78bfa] hover:bg-[#6c63ff]/10'
          }`}
        >
          {copied ? '✓ copied' : 'copy link'}
        </button>
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
  const [result, setResult] = useState<ResultData | null>(null);
  const roleDropdownRef = useRef<HTMLDivElement>(null);
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
    setResult(buildResult(mode, user?.githubUsername ?? user?.name));
    setPhase('result');
  }, [mode, user]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (roleDropdownRef.current && !roleDropdownRef.current.contains(e.target as Node)) setRoleOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const reset = () => {
    setMode(null); setPhase('select'); setRepoUrl('');
    setResumeFile(null); setResumeRole(''); setRoleOpen(false);
    setDragOver(false); setResult(null);
  };

  if (loading || !user) return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
      <div className="w-5 h-5 border-2 border-[#6c63ff]/30 border-t-[#6c63ff] rounded-full animate-spin" />
    </div>
  );

  const steps =
    mode === 'github' ? githubSteps(user.githubUsername ?? user.name) :
    mode === 'repo' ? repoSteps(repoUrl) :
    mode === 'resume' ? resumeSteps(resumeFile?.name ?? '', resumeRole) :
    mode === 'combined' ? combinedSteps(user.githubUsername ?? user.name, resumeFile?.name ?? '', resumeRole) :
    [];

  const modeTitle =
    mode === 'github' ? 'Analyzing your GitHub' :
    mode === 'repo' ? 'Analyzing repository' :
    mode === 'resume' ? 'Matching resume' : 'Combined proof analysis';

  const modeSubtitle =
    mode === 'github' ? `${user.githubUsername ?? user.name} · all repositories` :
    mode === 'repo' ? repoUrl :
    mode === 'resume' ? `${resumeFile?.name ?? 'resume.pdf'} · ${resumeRole}` :
    `${user.githubUsername ?? user.name} · ${resumeFile?.name ?? 'resume.pdf'} · ${resumeRole}`;

  // Shared role dropdown JSX
  const RoleDropdown = (
    <div ref={roleDropdownRef} className="relative">
      <button
        type="button"
        onClick={() => setRoleOpen(o => !o)}
        className={`w-full flex items-center justify-between gap-2 bg-[#0d0d14] border rounded-lg px-3 py-2.5 text-sm font-mono text-left transition-all ${
          roleOpen ? 'border-[#6c63ff]/60' : 'border-[#2a2a35] hover:border-[#3a3a45]'
        }`}
      >
        <span className={resumeRole ? 'text-white' : 'text-[#3f3f46]'}>{resumeRole || 'Select your role...'}</span>
        <svg className={`w-3.5 h-3.5 text-[#52525b] flex-shrink-0 transition-transform duration-200 ${roleOpen ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {roleOpen && (
        <div className="absolute z-50 top-full mt-1 w-full rounded-lg border border-[#2a2a35] bg-[#111118] shadow-xl overflow-hidden">
          <div className="max-h-64 overflow-y-auto">
            {ENGINEERING_ROLES.map(role => (
              <button key={role} type="button" onClick={() => { setResumeRole(role); setRoleOpen(false); }}
                className={`w-full text-left px-3 py-2 text-xs font-mono transition-colors ${
                  resumeRole === role ? 'bg-[#6c63ff]/15 text-[#a78bfa]' : 'text-[#71717a] hover:bg-[#1a1a24] hover:text-white'
                }`}>
                {resumeRole === role && <span className="text-[#6c63ff] mr-2">✓</span>}
                {role}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  // Shared PDF drop zone JSX
  const PdfZone = (
    <div
      onDragOver={e => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={e => {
        e.preventDefault(); setDragOver(false);
        const f = e.dataTransfer.files[0];
        if (f && f.type === 'application/pdf') setResumeFile(f);
      }}
      onClick={() => !resumeFile && fileInputRef.current?.click()}
      className={`relative flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed transition-all cursor-pointer
        ${resumeFile ? 'border-[#6c63ff]/50 bg-[#6c63ff]/5 cursor-default'
          : dragOver ? 'border-[#6c63ff] bg-[#6c63ff]/10 scale-[1.01]'
          : 'border-[#2a2a35] bg-[#0d0d14] hover:border-[#6c63ff]/40 hover:bg-[#6c63ff]/3'}`}
      style={{ minHeight: 160 }}
    >
      <input ref={fileInputRef} type="file" accept="application/pdf" className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) setResumeFile(f); }} />
      {resumeFile ? (
        <div className="flex flex-col items-center gap-2 px-6 py-6">
          <div className="w-10 h-10 rounded-xl bg-[#6c63ff]/15 border border-[#6c63ff]/30 flex items-center justify-center text-xl">📄</div>
          <div className="text-sm font-semibold text-white text-center">{resumeFile.name}</div>
          <div className="text-[10px] font-mono text-[#52525b]">{(resumeFile.size / 1024).toFixed(0)} KB · PDF</div>
          <button onClick={e => { e.stopPropagation(); setResumeFile(null); }}
            className="text-[10px] font-mono text-[#3f3f46] hover:text-[#ef4444] transition-colors">remove ×</button>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2 px-6 py-8 select-none">
          <div className="text-2xl">{dragOver ? '📂' : '📄'}</div>
          <div className="text-sm font-semibold text-white">{dragOver ? 'Drop it here' : 'Drop resume PDF here'}</div>
          <div className="text-[10px] font-mono text-[#3f3f46]">or click to browse · PDF only</div>
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      <Nav />
      <div className="pt-20 pb-16 px-5 max-w-[720px] mx-auto">

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 mb-6">
          <span className="font-mono text-xs text-[#6c63ff]">nexora</span>
          <span className="text-[#2a2a35]">/</span>
          <span className="font-mono text-xs text-[#52525b]">analyze</span>
          {mode && (<><span className="text-[#2a2a35]">/</span><span className="font-mono text-xs text-[#a78bfa]">{mode}</span></>)}
          {phase !== 'select' && (
            <button onClick={reset} className="ml-auto text-[10px] font-mono text-[#3f3f46] hover:text-[#a1a1aa] transition-colors">← back</button>
          )}
        </div>

        {/* ── SELECT MODE ─────────────────────────────────────────── */}
        {phase === 'select' && (
          <div className="flex flex-col gap-4">
            <div className="mb-2">
              <h1 className="text-xl font-bold text-white tracking-tight">Run a verification</h1>
              <p className="text-[#52525b] text-xs font-mono mt-1">Choose what to analyze — each check runs its own 5-step pipeline.</p>
            </div>

            {/* Primary: Combined (NEW — most powerful) */}
            <button onClick={() => { setMode('combined'); setPhase('input'); }}
              className="group text-left p-5 rounded-xl border border-[#a78bfa]/25 bg-[#a78bfa]/5 hover:border-[#a78bfa]/50 hover:bg-[#a78bfa]/8 transition-all relative overflow-hidden">
              <div className="absolute top-0 right-0 w-40 h-40 pointer-events-none" style={{ background: 'radial-gradient(circle at top right, rgba(167,139,250,0.1) 0%, transparent 70%)' }} />
              <div className="relative z-10">
                <div className="flex items-start justify-between mb-3">
                  <span className="text-2xl">⚡</span>
                  <span className="text-[9px] font-mono px-2 py-0.5 rounded border border-[#a78bfa]/30 text-[#a78bfa]">most powerful</span>
                </div>
                <div className="text-base font-bold text-white mb-1">GitHub + Resume — Combined proof</div>
                <p className="text-xs text-[#71717a] leading-relaxed mb-4">Upload your resume AND analyze your GitHub at the same time. Cross-references every claim against real commits. Full 5-sub-score breakdown.</p>
                <div className="flex flex-wrap gap-1.5">
                  {['resume claims', 'all repos', 'AI detection', 'skill gaps', 'full sub-scores'].map(t => (
                    <span key={t} className="text-[9px] font-mono px-1.5 py-0.5 rounded border border-[#a78bfa]/20 bg-[#a78bfa]/8 text-[#c4b5fd]">{t}</span>
                  ))}
                </div>
              </div>
            </button>

            {/* GitHub */}
            <button onClick={() => startPipeline('github')}
              className="group text-left p-5 rounded-xl border border-[#6c63ff]/25 bg-[#6c63ff]/5 hover:border-[#6c63ff]/50 hover:bg-[#6c63ff]/8 transition-all relative overflow-hidden">
              <div className="absolute top-0 right-0 w-40 h-40 pointer-events-none" style={{ background: 'radial-gradient(circle at top right, rgba(108,99,255,0.1) 0%, transparent 70%)' }} />
              <div className="relative z-10">
                <div className="flex items-start justify-between mb-3">
                  <span className="text-2xl">🔗</span>
                  <span className="text-[9px] font-mono px-2 py-0.5 rounded border border-[#6c63ff]/30 text-[#a78bfa]">recommended</span>
                </div>
                <div className="text-base font-bold text-white mb-1">Connect GitHub</div>
                <p className="text-xs text-[#71717a] leading-relaxed mb-4">Analyze all repositories at once. Commits, AI signatures, file naming, contributor metadata.</p>
                <div className="flex flex-wrap gap-1.5">
                  {['all repos', 'commit timing', 'AI detection', 'file patterns', 'honesty score'].map(t => (
                    <span key={t} className="text-[9px] font-mono px-1.5 py-0.5 rounded border border-[#6c63ff]/20 bg-[#6c63ff]/8 text-[#8b83f7]">{t}</span>
                  ))}
                </div>
              </div>
            </button>

            <div className="grid grid-cols-2 gap-4">
              <button onClick={() => { setMode('repo'); setPhase('input'); }}
                className="group text-left p-5 rounded-xl border border-[#2a2a35] bg-[#111118] hover:border-[#6c63ff]/30 hover:-translate-y-px transition-all">
                <span className="text-2xl block mb-3">📁</span>
                <div className="text-sm font-bold text-white mb-1">Paste a repo URL</div>
                <p className="text-xs text-[#52525b] leading-relaxed mb-4">Analyze one specific repository before sharing it.</p>
                <div className="flex flex-wrap gap-1.5">
                  {['single repo', 'file structure', 'AI signatures'].map(t => (
                    <span key={t} className="text-[9px] font-mono px-1.5 py-0.5 rounded border border-[#2a2a35] text-[#3f3f46]">{t}</span>
                  ))}
                </div>
              </button>

              <button onClick={() => { setMode('resume'); setPhase('input'); }}
                className="group text-left p-5 rounded-xl border border-[#2a2a35] bg-[#111118] hover:border-[#f59e0b]/25 hover:-translate-y-px transition-all">
                <span className="text-2xl block mb-3">📋</span>
                <div className="text-sm font-bold text-white mb-1">Match resume only</div>
                <p className="text-xs text-[#52525b] leading-relaxed mb-4">Cross-check resume claims against actual code output.</p>
                <div className="flex flex-wrap gap-1.5">
                  {['resume vs code', 'skill gaps', 'tenure check'].map(t => (
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
              <input type="text" value={repoUrl} onChange={e => setRepoUrl(e.target.value)}
                placeholder="https://github.com/username/repository" autoFocus
                onKeyDown={e => e.key === 'Enter' && repoUrl.trim() && startPipeline('repo')}
                className="flex-1 bg-transparent text-sm text-white font-mono placeholder:text-[#3f3f46] focus:outline-none" />
            </div>
            <button onClick={() => repoUrl.trim() && startPipeline('repo')} disabled={!repoUrl.trim()}
              className="w-full py-3 rounded-lg bg-[#6c63ff] text-white font-semibold text-sm hover:bg-[#7c73ff] hover:-translate-y-px transition-all disabled:opacity-40 disabled:cursor-not-allowed">
              analyze repository →
            </button>
          </div>
        )}

        {/* ── INPUT: resume ────────────────────────────────────────── */}
        {phase === 'input' && mode === 'resume' && (
          <div className="flex flex-col gap-5">
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight">Upload your resume</h1>
              <p className="text-[#52525b] text-xs font-mono mt-1">PDF only — we&apos;ll extract skills and claims automatically.</p>
            </div>
            <div>
              <label className="text-[10px] font-mono text-[#52525b] uppercase tracking-wider block mb-1.5">Your engineering role</label>
              {RoleDropdown}
            </div>
            {PdfZone}
            <button onClick={() => resumeFile && resumeRole && startPipeline('resume')}
              disabled={!resumeFile || !resumeRole}
              className="w-full py-3 rounded-lg bg-[#6c63ff] text-white font-semibold text-sm hover:bg-[#7c73ff] hover:-translate-y-px transition-all disabled:opacity-40 disabled:cursor-not-allowed">
              {!resumeRole ? 'select a role to continue' : !resumeFile ? 'upload a PDF to continue' : `analyze ${resumeFile.name} →`}
            </button>
          </div>
        )}

        {/* ── INPUT: combined ──────────────────────────────────────── */}
        {phase === 'input' && mode === 'combined' && (
          <div className="flex flex-col gap-5">
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight">Combined proof analysis</h1>
              <p className="text-[#52525b] text-xs font-mono mt-1">GitHub + resume together — the most complete verification available.</p>
            </div>

            {/* GitHub status */}
            <div className={`flex items-center gap-3 p-4 rounded-xl border ${user.githubConnected ? 'border-[#22c55e]/20 bg-[#22c55e]/5' : 'border-[#f59e0b]/20 bg-[#f59e0b]/5'}`}>
              <div className="text-xl">{user.githubConnected ? '✅' : '⚠️'}</div>
              <div className="flex-1 min-w-0">
                <div className={`text-xs font-semibold ${user.githubConnected ? 'text-[#22c55e]' : 'text-[#f59e0b]'}`}>
                  {user.githubConnected ? `GitHub connected · @${user.githubUsername}` : 'GitHub not connected'}
                </div>
                <div className="text-[10px] font-mono text-[#52525b] mt-0.5">
                  {user.githubConnected ? 'All repositories will be analyzed' : 'Connect GitHub first from your profile page'}
                </div>
              </div>
              {user.githubConnected && user.githubAvatarUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={user.githubAvatarUrl} alt="" className="w-8 h-8 rounded-full border border-[#22c55e]/30 flex-shrink-0" />
              )}
            </div>

            <div>
              <label className="text-[10px] font-mono text-[#52525b] uppercase tracking-wider block mb-1.5">Your engineering role</label>
              {RoleDropdown}
            </div>

            <div>
              <label className="text-[10px] font-mono text-[#52525b] uppercase tracking-wider block mb-1.5">Resume PDF</label>
              {PdfZone}
            </div>

            <button
              onClick={() => resumeFile && resumeRole && user.githubConnected && startPipeline('combined')}
              disabled={!resumeFile || !resumeRole || !user.githubConnected}
              className="w-full py-3 rounded-lg bg-[#a78bfa] text-white font-semibold text-sm hover:bg-[#b99dff] hover:-translate-y-px transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {!user.githubConnected ? 'connect GitHub first'
                : !resumeRole ? 'select a role to continue'
                : !resumeFile ? 'upload resume PDF to continue'
                : 'run combined proof analysis ⚡'}
            </button>
          </div>
        )}

        {/* ── PIPELINE ─────────────────────────────────────────────── */}
        {phase === 'pipeline' && mode && (
          <div className="flex flex-col gap-6">
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight">{modeTitle}</h1>
              <p className="text-[#3f3f46] text-xs font-mono mt-1">{modeSubtitle}</p>
            </div>
            <PipelineView steps={steps} onDone={handleDone} />
          </div>
        )}

        {/* ── RESULT ───────────────────────────────────────────────── */}
        {phase === 'result' && result && (
          <div className="flex flex-col gap-5">
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight">Proof ledger</h1>
              <p className="text-[#3f3f46] text-xs font-mono mt-1">{modeSubtitle}</p>
            </div>
            <ResultView data={result} onReset={reset} />
          </div>
        )}

      </div>
    </div>
  );
}
