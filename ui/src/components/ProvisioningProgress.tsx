import { useEffect, useMemo, useState } from "react";
import { Sparkles } from "lucide-react";
import { shuffledFacts } from "@/config/facts";

/**
 * Stages reported by the status endpoint, in order. Each maps to where the bar
 * should sit when that stage is *reached*, and how long it typically takes so
 * the bar can creep forward while waiting instead of freezing.
 *
 * Durations are from measured runs (2026-09-03): structuring ~35s, the architect
 * ~105s, everything else under three seconds combined. The architect is three
 * quarters of the wait, which is why its band is the widest.
 */
const STAGES: { key: string; label: string; at: number; typicalMs: number }[] = [
  { key: "accepted",            label: "Got your details",                at: 4,  typicalMs: 2_000 },
  { key: "researching",         label: "Reading the job description",      at: 8,  typicalMs: 35_000 },
  { key: "writing_interviewer", label: "Writing your interviewer",         at: 32, typicalMs: 105_000 },
  { key: "reserving_line",      label: "Reserving your phone line",        at: 92, typicalMs: 4_000 },
  { key: "ready",               label: "Ready",                            at: 100, typicalMs: 0 },
];

const FACT_ROTATE_MS = 8_000;

interface ProvisioningProgressProps {
  /** Current stage key from the status endpoint; undefined before the first poll. */
  stage?: string | null;
  name: string;
}

const ProvisioningProgress = ({ stage, name }: ProvisioningProgressProps) => {
  const idx = Math.max(0, STAGES.findIndex((s) => s.key === stage));
  const current = STAGES[idx];
  const next = STAGES[Math.min(idx + 1, STAGES.length - 1)];

  // When did we enter this stage? Used to creep the bar toward the next milestone.
  const [enteredAt, setEnteredAt] = useState(() => Date.now());
  useEffect(() => {
    setEnteredAt(Date.now());
  }, [idx]);

  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, []);

  // Ease from this stage's milestone toward (but never reaching) the next one,
  // over the stage's typical duration. A stalled bar reads as a hung page.
  const percent = useMemo(() => {
    if (current.key === "ready") return 100;
    const span = next.at - current.at;
    const elapsed = now - enteredAt;
    const frac = current.typicalMs > 0 ? Math.min(elapsed / current.typicalMs, 1) : 0;
    // decelerating curve so it visibly moves early and slows as it nears the cap
    const eased = 1 - Math.pow(1 - frac, 2);
    return Math.round(current.at + span * 0.92 * eased);
  }, [current, next, now, enteredAt]);

  // Rotating facts, in an order that differs per visitor.
  const facts = useMemo(() => shuffledFacts(Date.now() % 100_000), []);
  const [factIdx, setFactIdx] = useState(0);
  const [factVisible, setFactVisible] = useState(true);
  useEffect(() => {
    const t = setInterval(() => {
      setFactVisible(false);
      setTimeout(() => {
        setFactIdx((i) => (i + 1) % facts.length);
        setFactVisible(true);
      }, 350);
    }, FACT_ROTATE_MS);
    return () => clearInterval(t);
  }, [facts.length]);
  const fact = facts[factIdx];

  return (
    <div className="space-y-10">
      {/* Voice AI loading animation */}
      <div className="relative w-28 h-28 mx-auto">
        <div className="absolute inset-0 rounded-full bg-primary/10 animate-ping-slow" />
        <div className="absolute inset-3 rounded-full bg-primary/15 animate-ping-slower" />
        <div className="absolute inset-6 rounded-full bg-gradient-to-br from-primary to-primary/70 shadow-glow flex items-center justify-center">
          <Sparkles className="w-7 h-7 text-primary-foreground animate-pulse" />
        </div>
      </div>

      <div className="space-y-3">
        <h1 className="text-3xl sm:text-4xl font-semibold text-foreground tracking-tight">
          Hang tight, {name}!
        </h1>
        <p className="text-lg text-muted-foreground max-w-md mx-auto leading-relaxed">
          We're building an interviewer just for this job. This takes about two minutes.
        </p>
      </div>

      {/* Progress bar */}
      <div className="max-w-md mx-auto space-y-3" aria-live="polite">
        <div
          className="h-3 w-full rounded-full bg-secondary overflow-hidden"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percent}
        >
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-500 ease-out"
            style={{ width: `${percent}%` }}
          />
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-foreground font-medium">{current.label}</span>
          <span className="text-muted-foreground tabular-nums">{percent}%</span>
        </div>

        {/* Stage checklist */}
        <ol className="flex flex-col gap-1.5 pt-1 text-left">
          {STAGES.filter((s) => s.key !== "ready").map((s, i) => {
            const done = i < idx;
            const active = i === idx;
            return (
              <li
                key={s.key}
                className={`flex items-center gap-2.5 text-sm transition-colors duration-300 ${
                  done ? "text-muted-foreground/60" : active ? "text-foreground" : "text-muted-foreground/40"
                }`}
              >
                <span
                  className={`inline-block w-2 h-2 rounded-full ${
                    done ? "bg-primary/50" : active ? "bg-primary animate-pulse" : "bg-border"
                  }`}
                />
                <span className={done ? "line-through" : ""}>{s.label}</span>
              </li>
            );
          })}
        </ol>
      </div>

      {/* Rotating fact */}
      <div className="max-w-lg mx-auto pt-2">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground/70 mb-2">
          While you wait — about Your Organization
        </p>
        <div
          className={`bg-card border border-border rounded-2xl px-6 py-5 shadow-soft transition-opacity duration-300 ${
            factVisible ? "opacity-100" : "opacity-0"
          }`}
        >
          <p className="text-base text-foreground leading-relaxed">{fact.text}</p>
          <p className="text-xs text-muted-foreground/60 mt-2">Source: {fact.source}</p>
        </div>
      </div>
    </div>
  );
};

export default ProvisioningProgress;
