"use client";
import * as React from "react";
import { toast } from "sonner";
import {
  AlertTriangle,
  Check,
  CircleHelp,
  Copy,
  FileWarning,
  Info,
  Quote,
  RefreshCw,
  Sparkles,
  Wand2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge, Card, SkillBadge } from "@/components/ui/primitives";
import type { StoredAnalysis } from "@/lib/ai/schema";
import { cn, formatDate } from "@/lib/utils/index";

export interface AnalysisMeta {
  id: string;
  provider: string;
  model: string | null;
  created_at: string;
  result: StoredAnalysis;
  stale?: boolean;
}

type Status =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "error"; code: string; message: string };

const SUPPORT_STYLE = {
  strong: "bg-success-bg text-success-fg",
  partial: "bg-warning-bg text-warning-fg",
  none: "bg-error-bg text-error-fg",
} as const;

const ALIGN_STYLE: Record<string, string> = {
  Strong: "bg-success-bg text-success-fg",
  Moderate: "bg-warning-bg text-warning-fg",
  Limited: "bg-error-bg text-error-fg",
  "Insufficient information": "bg-[#ecebf0] text-[#4b4d5c]",
};

function CopyButton({ text, label }: { text: string; label: string }) {
  const [done, setDone] = React.useState(false);
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setDone(true);
          setTimeout(() => setDone(false), 1500);
        } catch {
          toast.error("Could not copy to the clipboard.");
        }
      }}
    >
      {done ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
      {done ? "Copied" : label}
    </Button>
  );
}

export function AnalysisPanel({
  applicationId,
  jobTitle,
  initial,
  hasResumeText,
  aiConfigured,
}: {
  applicationId: string;
  jobTitle: string;
  initial: AnalysisMeta | null;
  hasResumeText: boolean;
  aiConfigured: boolean;
}) {
  const [analysis, setAnalysis] = React.useState<AnalysisMeta | null>(initial);
  const [status, setStatus] = React.useState<Status>({ kind: "idle" });

  async function run(force: boolean) {
    setStatus({ kind: "loading" });
    try {
      const res = await fetch("/api/ai/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ application_id: applicationId, force }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setStatus({ kind: "error", code: body.code ?? "error", message: body.error ?? "Analysis failed." });
        return;
      }
      setAnalysis(body.analysis);
      setStatus({ kind: "idle" });
      toast.success(body.cached ? "Showing saved analysis (inputs unchanged)" : "Analysis complete");
    } catch {
      setStatus({ kind: "error", code: "network", message: "Network error. Check your connection and try again." });
    }
  }

  const loading = status.kind === "loading";

  return (
    <Card className="p-6" id="ai">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-bold">
            <Sparkles className="h-5 w-5 text-accent" aria-hidden /> AI insights
          </h2>
          <p className="text-xs text-muted">
            For <strong className="text-ink">{jobTitle}</strong> · model-generated observations to review, not verified facts
          </p>
        </div>
        <Button onClick={() => run(Boolean(analysis))} loading={loading} disabled={!hasResumeText || !aiConfigured}>
          {analysis ? <RefreshCw className="h-4 w-4" /> : <Wand2 className="h-4 w-4" />}
          {analysis ? "Reanalyze" : "Analyze Candidate"}
        </Button>
      </div>

      <div aria-live="polite" className="mt-4">
        {!aiConfigured && (
          <Notice icon={Info} tone="neutral" title="AI analysis is not configured">
            Add <code>GEMINI_API_KEY</code> to the server environment to enable it. Everything else in HireFlow keeps working.
          </Notice>
        )}
        {aiConfigured && !hasResumeText && (
          <Notice icon={FileWarning} tone="warning" title="No resume text available">
            Upload a text-based PDF or .txt resume (edit this candidate) so the assistant has something to analyze. Scanned images are not supported.
          </Notice>
        )}
        {loading && (
          <div role="status" className="space-y-3">
            <p className="text-sm text-muted">Analyzing resume against the job requirements…</p>
            <div className="skeleton h-4 w-full" />
            <div className="skeleton h-4 w-5/6" />
            <div className="skeleton h-24 w-full" />
          </div>
        )}
        {status.kind === "error" && (
          <Notice
            icon={AlertTriangle}
            tone="error"
            title={status.code === "rate_limited" ? "Rate limit reached" : "Analysis unavailable"}
          >
            {status.message}
          </Notice>
        )}
        {!loading && !analysis && aiConfigured && hasResumeText && status.kind !== "error" && (
          <p className="rounded-[12px] border border-dashed border-line bg-[#faf9f6] p-5 text-center text-sm text-muted">
            No analysis yet. Run one to see matching skills, gaps with evidence, and suggested interview questions.
          </p>
        )}
      </div>

      {analysis && !loading && <AnalysisView analysis={analysis} />}
    </Card>
  );
}

function Notice({
  icon: Icon,
  tone,
  title,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  tone: "neutral" | "warning" | "error";
  title: string;
  children: React.ReactNode;
}) {
  const style = {
    neutral: "bg-[#f3f1ec] text-ink",
    warning: "bg-warning-bg text-warning-fg",
    error: "bg-error-bg text-error-fg",
  }[tone];
  return (
    <div role={tone === "error" ? "alert" : undefined} className={cn("flex gap-3 rounded-[12px] p-4 text-sm", style)}>
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <div>
        <p className="font-bold">{title}</p>
        <p className="mt-0.5">{children}</p>
      </div>
    </div>
  );
}

function Section({ title, icon: Icon, children, action }: { title: string; icon: React.ComponentType<{ className?: string }>; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <section className="mt-6">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-bold">
          <Icon className="h-4 w-4 text-accent" aria-hidden />
          {title}
        </h3>
        {action}
      </div>
      {children}
    </section>
  );
}

export function AnalysisView({ analysis }: { analysis: AnalysisMeta }) {
  const r = analysis.result;
  const al = r.requirements_alignment;
  return (
    <div className="mt-2">
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
        <span>Last analyzed {formatDate(analysis.created_at, "MMM d, yyyy 'at' h:mm a")}</span>
        <span>·</span>
        <span>
          {analysis.provider}
          {analysis.model ? ` (${analysis.model})` : ""}
        </span>
        {analysis.stale && <Badge className="bg-warning-bg text-warning-fg">Inputs changed — reanalyze</Badge>}
      </div>

      <Section
        title="Summary"
        icon={Sparkles}
        action={<CopyButton text={r.summary} label="Copy summary" />}
      >
        <p className="text-sm leading-relaxed">{r.summary}</p>
      </Section>

      {al && (
        <Section title="Requirements alignment" icon={Check}>
          <div className="rounded-[12px] border border-line bg-[#faf9f6] p-4">
            <div className="flex flex-wrap items-center gap-3">
              <Badge className={cn("text-sm", ALIGN_STYLE[al.label])}>{al.label}</Badge>
              <p className="text-xs text-muted">Qualitative band — not a probability of hiring success.</p>
            </div>
            <ul className="mt-3 space-y-2">
              {al.criteria.map((c) => (
                <li key={c.name} className="text-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">
                      {c.name} <span className="font-normal text-muted">({c.weight}% weight)</span>
                    </span>
                    <span className="tabular text-xs text-muted">{c.score === null ? "Not assessed" : `${Math.round(c.score * 100)}%`}</span>
                  </div>
                  <div className="mt-1 h-1.5 rounded-full bg-[#e8e6e1]">
                    <div className="h-full rounded-full bg-accent" style={{ width: `${(c.score ?? 0) * 100}%` }} />
                  </div>
                  <p className="mt-1 text-xs text-muted">{c.note}</p>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-muted">{al.method}</p>
          </div>
        </Section>
      )}

      <Section title="Matching skills" icon={Check}>
        {r.matching_skills.length ? (
          <div className="flex flex-wrap gap-1.5">
            {r.matching_skills.map((s) => (
              <SkillBadge key={s}>{s}</SkillBadge>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted">No required skills were clearly supported by the resume.</p>
        )}
      </Section>

      <Section title="Missing or unclear requirements" icon={CircleHelp}>
        {r.missing_or_unclear_requirements.length ? (
          <ul className="list-disc space-y-1 pl-5 text-sm">
            {r.missing_or_unclear_requirements.map((m) => (
              <li key={m}>{m}</li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted">Nothing flagged.</p>
        )}
      </Section>

      <Section title="Evidence" icon={Quote}>
        <ul className="space-y-3">
          {r.evidence.map((e, i) => (
            <li key={i} className="rounded-[12px] border border-line p-3 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-semibold">{e.requirement}</span>
                <Badge className={SUPPORT_STYLE[e.support]}>{e.support === "none" ? "No support" : `${e.support} support`}</Badge>
              </div>
              {e.excerpt && <blockquote className="mt-2 border-l-2 border-accent pl-3 text-muted">“{e.excerpt}”</blockquote>}
              <p className="mt-2">{e.explanation}</p>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-xs text-muted">
          Experience: <strong className="capitalize text-ink">{r.experience_alignment.level}</strong> — {r.experience_alignment.explanation}
        </p>
      </Section>

      <Section
        title="Suggested interview questions"
        icon={CircleHelp}
        action={<CopyButton text={r.interview_questions.map((q, i) => `${i + 1}. ${q}`).join("\n")} label="Copy questions" />}
      >
        <ol className="list-decimal space-y-1.5 pl-5 text-sm">
          {r.interview_questions.map((q) => (
            <li key={q}>{q}</li>
          ))}
        </ol>
      </Section>

      <Section title="Caveats" icon={AlertTriangle}>
        <ul className="list-disc space-y-1 pl-5 text-sm text-muted">
          {r.caveats.map((c) => (
            <li key={c}>{c}</li>
          ))}
          <li>AI output can be wrong or incomplete. Verify claims with the candidate; this tool never makes hiring decisions.</li>
        </ul>
      </Section>
    </div>
  );
}
