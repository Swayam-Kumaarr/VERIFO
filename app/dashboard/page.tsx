'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../components/AuthContext';
import Nav from '../components/Nav';

const API = 'http://localhost:8000';

// ── Types ──────────────────────────────────────────────────────────────────────

type Phase = 'form' | 'pipeline' | 'result' | 'error';

interface FormState {
  name: string;
  email: string;
  age: string;
  githubUrl: string;
  deploymentUrls: string[];
  miscLinks: string[];
  resumeText: string;
  miscNotes: string;
}

interface AnalysisStatus {
  id: string;
  submission_id: string;
  status: 'pending' | 'running' | 'done' | 'failed';
  current_step: number;
  step_label: string | null;
  step_logs: string[];
  error: string | null;
}

interface SkillItem { name: string; evidence: string; }
interface ProjectItem {
  name: string;
  repo_url?: string;
  deploy_url?: string;
  stack: string[];
  blurb: string;
  verified: boolean;
}
interface LinkItem { url: string; kind: string; live: boolean; note?: string; }

interface ResumePayload {
  name: string;
  email?: string;
  github_url?: string;
  github_username?: string;
  verified_at: string;
  headline: string;
  summary: string;
  skills: SkillItem[];
  projects: ProjectItem[];
  links_verified?: LinkItem[];
  red_flags?: string[];
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function classifyLog(line: string): 'success' | 'warn' | 'error' | 'info' {
  if (line.startsWith('✓') || line.includes('✓')) return 'success';
  if (line.startsWith('⚠')) return 'warn';
  if (line.startsWith('✗')) return 'error';
  return 'info';
}

// ── Pipeline view ──────────────────────────────────────────────────────────────

function PipelineView({ status, elapsed }: { status: AnalysisStatus | null; elapsed: number }) {
  const logsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    logsRef.current?.scrollTo({ top: logsRef.current.scrollHeight, behavior: 'smooth' });
  }, [status?.step_logs.length]);

  const logs = status?.step_logs ?? [];
  const label = status?.step_label ?? 'Booting agent';
  const calls = status?.current_step ?? 0;
  const state = status?.status ?? 'pending';

  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-xl border border-[#6c63ff]/25 bg-[#6c63ff]/5 p-5">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className={`absolute inline-flex h-full w-full rounded-full opacity-60 ${state === 'running' ? 'bg-[#6c63ff] animate-ping' : ''}`} />
              <span className={`relative inline-flex h-2 w-2 rounded-full ${state === 'running' ? 'bg-[#6c63ff]' : state === 'done' ? 'bg-[#22c55e]' : 'bg-[#52525b]'}`} />
            </span>
            <span className="text-sm font-semibold text-white">{label}</span>
          </div>
          <span className="font-mono text-[10px] text-[#52525b] tabular-nums">{elapsed}s · {calls} calls</span>
        </div>
        <p className="text-[10px] font-mono text-[#52525b]">
          agent is calling tools to investigate github, verify deployments, and ground every skill in real evidence
        </p>
      </div>

      <div ref={logsRef} className="rounded-xl border border-[#2a2a35] bg-[#0a0a10] p-4 max-h-[480px] overflow-y-auto font-mono text-[11px] space-y-1">
        {logs.length === 0 && <div className="text-[#3f3f46]">waiting for first tool call…</div>}
        {logs.map((line, i) => {
          const t = classifyLog(line);
          return (
            <div key={i} className={
              t === 'success' ? 'text-[#22c55e]' :
              t === 'warn' ? 'text-[#f59e0b]' :
              t === 'error' ? 'text-[#ef4444]' :
              'text-[#71717a]'
            }>{line}</div>
          );
        })}
        {state === 'running' && <div className="text-[#3f3f46]">▋</div>}
      </div>
    </div>
  );
}

// ── Result view ────────────────────────────────────────────────────────────────

function ResultView({ data, submissionId, onReset }: { data: ResumePayload; submissionId: string; onReset: () => void }) {
  const liveCount = (data.links_verified ?? []).filter(l => l.live).length;
  const verifiedProjects = data.projects.filter(p => p.verified).length;

  return (
    <div className="flex flex-col gap-5">
      {/* Header card */}
      <div className="rounded-xl border border-[#6c63ff]/25 bg-gradient-to-br from-[#6c63ff]/10 to-transparent p-6">
        <div className="text-[9px] font-mono text-[#a78bfa] uppercase tracking-widest mb-2">Proof-of-Build resume</div>
        <h2 className="text-2xl font-bold text-white tracking-tight">{data.name}</h2>
        <p className="text-sm text-[#a1a1aa] mt-1">{data.headline}</p>
        <p className="text-xs text-[#71717a] mt-3 leading-relaxed">{data.summary}</p>

        <div className="grid grid-cols-4 gap-2 mt-5">
          <Stat value={String(data.skills.length)} label="skills" />
          <Stat value={`${verifiedProjects}/${data.projects.length}`} label="projects verified" />
          <Stat value={String(liveCount)} label="live links" />
          <Stat value={String((data.red_flags ?? []).length)} label="red flags" warn={(data.red_flags ?? []).length > 0} />
        </div>
      </div>

      {/* Skills */}
      {data.skills.length > 0 && (
        <Section title="Verified skills">
          <div className="flex flex-wrap gap-2">
            {data.skills.map((s, i) => (
              <div key={i} className="group relative">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#6c63ff]/10 border border-[#6c63ff]/25 text-xs text-[#a78bfa] font-mono">
                  <span className="text-[#22c55e]">✓</span>{s.name}
                </span>
                <div className="absolute left-0 top-full mt-1 z-20 hidden group-hover:block w-72 p-2.5 rounded-md bg-[#0a0a10] border border-[#2a2a35] text-[10px] text-[#a1a1aa] font-mono leading-relaxed shadow-xl">
                  {s.evidence}
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Projects */}
      {data.projects.length > 0 && (
        <Section title="Projects">
          <div className="flex flex-col gap-2">
            {data.projects.map((p, i) => (
              <div key={i} className={`rounded-lg border p-4 ${p.verified ? 'border-[#22c55e]/20 bg-[#0d1a0d]/30' : 'border-[#2a2a35] bg-[#111118]'}`}>
                <div className="flex items-baseline justify-between gap-2 flex-wrap">
                  <span className="text-sm font-semibold text-white">{p.name}</span>
                  <span className={`text-[10px] font-mono ${p.verified ? 'text-[#22c55e]' : 'text-[#71717a]'}`}>
                    {p.verified ? '✓ verified' : 'unverified'}
                  </span>
                </div>
                {p.stack.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {p.stack.map(t => (
                      <span key={t} className="text-[9px] font-mono px-1.5 py-0.5 rounded border border-[#2a2a35] text-[#71717a]">{t}</span>
                    ))}
                  </div>
                )}
                <p className="text-xs text-[#a1a1aa] mt-2 leading-relaxed">{p.blurb}</p>
                <div className="flex flex-wrap gap-3 mt-2 text-[10px] font-mono">
                  {p.repo_url && <a href={p.repo_url} target="_blank" rel="noreferrer" className="text-[#6c63ff] hover:text-[#a78bfa] truncate max-w-[280px]">↗ {p.repo_url}</a>}
                  {p.deploy_url && <a href={p.deploy_url} target="_blank" rel="noreferrer" className="text-[#22c55e] hover:text-[#4ade80] truncate max-w-[280px]">↗ {p.deploy_url}</a>}
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Links */}
      {(data.links_verified ?? []).length > 0 && (
        <Section title="Link verification">
          <div className="rounded-xl border border-[#2a2a35] bg-[#111118] overflow-hidden divide-y divide-[#1e1e28]">
            {(data.links_verified ?? []).map((l, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-2.5">
                <span className={`text-[10px] font-mono flex-shrink-0 w-4 ${l.live ? 'text-[#22c55e]' : 'text-[#ef4444]'}`}>
                  {l.live ? '✓' : '✗'}
                </span>
                <span className="text-[10px] font-mono text-[#3f3f46] uppercase tracking-wide flex-shrink-0 w-16">{l.kind}</span>
                <a href={l.url} target="_blank" rel="noreferrer" className="text-xs font-mono text-[#a1a1aa] truncate hover:text-white">{l.url}</a>
                {l.note && <span className="text-[10px] font-mono text-[#52525b] ml-auto truncate max-w-[180px]">{l.note}</span>}
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Red flags */}
      {(data.red_flags ?? []).length > 0 && (
        <Section title="Red flags">
          <div className="rounded-xl border border-[#f59e0b]/20 bg-[#1a140d]/40 p-4 space-y-1.5">
            {(data.red_flags ?? []).map((f, i) => (
              <div key={i} className="text-xs font-mono text-[#fbbf24]">⚠ {f}</div>
            ))}
          </div>
        </Section>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        <button onClick={onReset} className="flex-1 py-2.5 rounded-lg border border-[#2a2a35] text-[#a1a1aa] text-xs font-mono hover:text-white hover:border-[#6c63ff]/30 transition-all">
          ← run another
        </button>
        <a
          href={`${API}/api/result/${submissionId}/pdf`}
          target="_blank"
          rel="noreferrer"
          className="flex-1 py-2.5 rounded-lg bg-[#6c63ff] text-white text-xs font-mono text-center hover:bg-[#7c73ff] transition-all"
        >
          download PDF →
        </a>
      </div>
    </div>
  );
}

function Stat({ value, label, warn }: { value: string; label: string; warn?: boolean }) {
  return (
    <div className={`p-2.5 rounded-lg border ${warn ? 'border-[#f59e0b]/25 bg-[#1a140d]/30' : 'border-[#2a2a35] bg-[#111118]'}`}>
      <div className={`font-mono text-base font-bold tabular-nums ${warn ? 'text-[#f59e0b]' : 'text-white'}`}>{value}</div>
      <div className="text-[9px] font-mono text-[#3f3f46] mt-0.5 uppercase tracking-wide">{label}</div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10px] font-mono text-[#52525b] uppercase tracking-widest mb-2">{title}</div>
      {children}
    </div>
  );
}

// ── Multi-URL input ────────────────────────────────────────────────────────────

function UrlList({ label, placeholder, values, onChange, accent }: {
  label: string;
  placeholder: string;
  values: string[];
  onChange: (v: string[]) => void;
  accent: string;
}) {
  const set = (i: number, v: string) => {
    const next = [...values];
    next[i] = v;
    onChange(next);
  };
  const remove = (i: number) => onChange(values.filter((_, j) => j !== i));
  const add = () => onChange([...values, '']);

  return (
    <div>
      <label className="text-[10px] font-mono text-[#52525b] uppercase tracking-wider block mb-1.5">{label}</label>
      <div className="space-y-1.5">
        {values.map((v, i) => (
          <div key={i} className="flex items-center gap-2 bg-[#0d0d14] border border-[#2a2a35] rounded-lg px-3 py-2 focus-within:border-[#6c63ff]/60 transition-all">
            <input
              value={v}
              onChange={e => set(i, e.target.value)}
              placeholder={placeholder}
              className="flex-1 bg-transparent text-xs text-white font-mono placeholder:text-[#3f3f46] focus:outline-none"
            />
            <button onClick={() => remove(i)} className="text-[#3f3f46] hover:text-[#ef4444] text-xs font-mono">×</button>
          </div>
        ))}
        <button onClick={add} className={`text-[10px] font-mono ${accent} hover:opacity-80 transition-opacity`}>
          + add {values.length === 0 ? '' : 'another'}
        </button>
      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [phase, setPhase] = useState<Phase>('form');
  const [form, setForm] = useState<FormState>({
    name: '', email: '', age: '',
    githubUrl: '', deploymentUrls: [], miscLinks: [],
    resumeText: '', miscNotes: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [submissionId, setSubmissionId] = useState<string | null>(null);
  const [status, setStatus] = useState<AnalysisStatus | null>(null);
  const [result, setResult] = useState<ResumePayload | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);

  // Auth gate
  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [user, loading, router]);

  // Prefill from user
  useEffect(() => {
    if (user) {
      setForm(f => ({
        ...f,
        name: f.name || user.name,
        email: f.email || user.email,
        githubUrl: f.githubUrl || (user.githubUsername ? `https://github.com/${user.githubUsername}` : ''),
      }));
    }
  }, [user]);

  // Elapsed timer during pipeline
  useEffect(() => {
    if (phase !== 'pipeline') return;
    const iv = setInterval(() => setElapsed(e => e + 1), 1000);
    return () => clearInterval(iv);
  }, [phase]);

  // Poll status
  useEffect(() => {
    if (phase !== 'pipeline' || !submissionId) return;
    let cancelled = false;

    const poll = async () => {
      try {
        const res = await fetch(`${API}/api/analyze/${submissionId}/status`);
        if (!res.ok) throw new Error(`status ${res.status}`);
        const s: AnalysisStatus = await res.json();
        if (cancelled) return;
        setStatus(s);

        if (s.status === 'done') {
          const rr = await fetch(`${API}/api/result/${submissionId}`);
          if (!rr.ok) throw new Error(`result ${rr.status}`);
          const r = await rr.json();
          if (cancelled) return;
          setResult(r.payload);
          setPhase('result');
        } else if (s.status === 'failed') {
          setErrorMsg(s.error || 'Analysis failed.');
          setPhase('error');
        }
      } catch (e) {
        if (!cancelled) {
          console.error(e);
        }
      }
    };

    poll();
    const iv = setInterval(poll, 1200);
    return () => { cancelled = true; clearInterval(iv); };
  }, [phase, submissionId]);

  const hasMeaningfulInput =
    form.githubUrl.trim() ||
    form.deploymentUrls.some(u => u.trim()) ||
    form.miscLinks.some(u => u.trim()) ||
    form.resumeText.trim();

  const canSubmit = form.name.trim() && form.email.trim() && hasMeaningfulInput && !submitting;

  const submit = useCallback(async () => {
    setSubmitting(true);
    setErrorMsg(null);
    try {
      const body = {
        name: form.name.trim(),
        email: form.email.trim(),
        age: form.age.trim() ? Number(form.age) : null,
        github_url: form.githubUrl.trim() || null,
        deployment_urls: form.deploymentUrls.map(u => u.trim()).filter(Boolean),
        misc_links: form.miscLinks.map(u => u.trim()).filter(Boolean),
        resume_text: form.resumeText.trim() || null,
        misc_notes: form.miscNotes.trim() || null,
      };
      const sr = await fetch(`${API}/api/submission/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!sr.ok) throw new Error(`submission failed: ${sr.status}`);
      const sub = await sr.json();
      const id = sub.id;
      setSubmissionId(id);

      const ar = await fetch(`${API}/api/analyze/${id}`, { method: 'POST' });
      if (!ar.ok) throw new Error(`analyze failed: ${ar.status}`);

      setElapsed(0);
      setPhase('pipeline');
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : String(e));
      setPhase('error');
    } finally {
      setSubmitting(false);
    }
  }, [form]);

  const reset = () => {
    setPhase('form');
    setSubmissionId(null);
    setStatus(null);
    setResult(null);
    setErrorMsg(null);
    setElapsed(0);
  };

  if (loading || !user) return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
      <div className="w-5 h-5 border-2 border-[#6c63ff]/30 border-t-[#6c63ff] rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      <Nav />
      <div className="pt-20 pb-16 px-5 max-w-[760px] mx-auto">

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 mb-6">
          <span className="font-mono text-xs text-[#6c63ff]">nexora</span>
          <span className="text-[#2a2a35]">/</span>
          <span className="font-mono text-xs text-[#52525b]">verify</span>
          {phase !== 'form' && (
            <button onClick={reset} className="ml-auto text-[10px] font-mono text-[#3f3f46] hover:text-[#a1a1aa] transition-colors">
              ← back
            </button>
          )}
        </div>

        {/* ── FORM ──────────────────────────────────────────────── */}
        {phase === 'form' && (
          <div className="flex flex-col gap-6">
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">Build your verified resume</h1>
              <p className="text-[#52525b] text-xs font-mono mt-1.5">
                Drop in what you have. Our agent investigates your GitHub, checks every deployment, and outputs a resume grounded in real evidence.
              </p>
            </div>

            {/* Identity */}
            <div className="grid grid-cols-2 gap-3">
              <Field label="name *" value={form.name} onChange={v => setForm({ ...form, name: v })} placeholder="Jane Doe" />
              <Field label="email *" value={form.email} onChange={v => setForm({ ...form, email: v })} placeholder="jane@example.com" type="email" />
              <Field label="age" value={form.age} onChange={v => setForm({ ...form, age: v.replace(/\D/g, '') })} placeholder="optional" type="text" />
              <Field label="github profile" value={form.githubUrl} onChange={v => setForm({ ...form, githubUrl: v })} placeholder="github.com/jane" />
            </div>

            {/* Links */}
            <UrlList
              label="deployment urls"
              placeholder="https://my-app.vercel.app"
              values={form.deploymentUrls}
              onChange={v => setForm({ ...form, deploymentUrls: v })}
              accent="text-[#22c55e]"
            />
            <UrlList
              label="misc links (portfolio, blog, etc)"
              placeholder="https://janedoe.dev"
              values={form.miscLinks}
              onChange={v => setForm({ ...form, miscLinks: v })}
              accent="text-[#a78bfa]"
            />

            {/* Textareas */}
            <div>
              <label className="text-[10px] font-mono text-[#52525b] uppercase tracking-wider block mb-1.5">resume / experience (paste anything)</label>
              <textarea
                value={form.resumeText}
                onChange={e => setForm({ ...form, resumeText: e.target.value })}
                rows={5}
                placeholder="Paste your resume text, bullet points, things you've worked on…"
                className="w-full bg-[#0d0d14] border border-[#2a2a35] rounded-lg px-3 py-2.5 text-xs text-white font-mono placeholder:text-[#3f3f46] focus:outline-none focus:border-[#6c63ff]/60 transition-all resize-y"
              />
            </div>

            <div>
              <label className="text-[10px] font-mono text-[#52525b] uppercase tracking-wider block mb-1.5">misc notes</label>
              <textarea
                value={form.miscNotes}
                onChange={e => setForm({ ...form, miscNotes: e.target.value })}
                rows={3}
                placeholder="Anything else worth knowing — clubs, awards, side projects, etc."
                className="w-full bg-[#0d0d14] border border-[#2a2a35] rounded-lg px-3 py-2.5 text-xs text-white font-mono placeholder:text-[#3f3f46] focus:outline-none focus:border-[#6c63ff]/60 transition-all resize-y"
              />
            </div>

            <button
              onClick={submit}
              disabled={!canSubmit}
              className="w-full py-3 rounded-lg bg-[#6c63ff] text-white font-semibold text-sm hover:bg-[#7c73ff] hover:-translate-y-px transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(108,99,255,0.2)]"
            >
              {submitting ? 'starting…' :
               !form.name.trim() || !form.email.trim() ? 'name + email required' :
               !hasMeaningfulInput ? 'add at least one github / deployment / resume' :
               'run verification →'}
            </button>
          </div>
        )}

        {/* ── PIPELINE ────────────────────────────────────────────── */}
        {phase === 'pipeline' && (
          <div className="flex flex-col gap-6">
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight">Verifying {form.name}</h1>
              <p className="text-[#3f3f46] text-xs font-mono mt-1">
                {form.githubUrl ? `${form.githubUrl} · ` : ''}{form.deploymentUrls.filter(Boolean).length} deployments · {form.miscLinks.filter(Boolean).length} misc
              </p>
            </div>
            <PipelineView status={status} elapsed={elapsed} />
          </div>
        )}

        {/* ── RESULT ─────────────────────────────────────────────── */}
        {phase === 'result' && result && submissionId && (
          <div className="flex flex-col gap-5">
            <ResultView data={result} submissionId={submissionId} onReset={reset} />
          </div>
        )}

        {/* ── ERROR ──────────────────────────────────────────────── */}
        {phase === 'error' && (
          <div className="flex flex-col gap-4">
            <div className="rounded-xl border border-[#ef4444]/30 bg-[#1a0d0d]/40 p-5">
              <div className="text-sm font-semibold text-[#ef4444] mb-1">Verification failed</div>
              <div className="text-xs font-mono text-[#a1a1aa] break-words">{errorMsg}</div>
              {status?.step_logs && status.step_logs.length > 0 && (
                <div className="mt-3 max-h-40 overflow-y-auto font-mono text-[10px] text-[#71717a] space-y-0.5">
                  {status.step_logs.map((l, i) => <div key={i}>{l}</div>)}
                </div>
              )}
            </div>
            <button onClick={reset} className="w-full py-2.5 rounded-lg border border-[#2a2a35] text-[#a1a1aa] text-xs font-mono hover:text-white hover:border-[#6c63ff]/30 transition-all">
              ← try again
            </button>
          </div>
        )}

      </div>
    </div>
  );
}

// ── Tiny field wrapper ─────────────────────────────────────────────────────────

function Field({ label, value, onChange, placeholder, type = 'text' }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  type?: string;
}) {
  return (
    <div>
      <label className="text-[10px] font-mono text-[#52525b] uppercase tracking-wider block mb-1.5">{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-[#0d0d14] border border-[#2a2a35] rounded-lg px-3 py-2.5 text-xs text-white font-mono placeholder:text-[#3f3f46] focus:outline-none focus:border-[#6c63ff]/60 transition-all"
      />
    </div>
  );
}
