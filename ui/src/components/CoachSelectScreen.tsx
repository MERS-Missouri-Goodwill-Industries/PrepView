import { useEffect } from "react";
import { ArrowLeft, ArrowRight, Check, UserRound } from "lucide-react";
import { COACHES, USING_PLACEHOLDER_COACHES } from "@/config/coaches";

interface CoachSelectScreenProps {
  question: string;
  hint?: string;
  value: string;
  onChange: (value: string) => void;
  onNext: () => void;
  onBack?: () => void;
  isVisible: boolean;
  error?: string;
}

/**
 * Coach picker. Deliberately a list of large tap targets rather than a dropdown:
 * this form is often handed over on a tablet, and the report's destination is
 * the one field a typo would silently ruin.
 */
const CoachSelectScreen = ({
  question,
  hint,
  value,
  onChange,
  onNext,
  onBack,
  isVisible,
  error,
}: CoachSelectScreenProps) => {
  // A single-coach roster has nothing to choose; select it so the participant
  // never sees a pointless one-option question.
  useEffect(() => {
    if (isVisible && !value && COACHES.length === 1) {
      onChange(COACHES[0].email);
    }
  }, [isVisible, value, onChange]);

  if (!isVisible) return null;

  return (
    <div className="animate-fade-in-up w-full max-w-2xl mx-auto px-6">
      <div className="space-y-8">
        <div className="space-y-3">
          <h1 className="text-3xl sm:text-4xl font-semibold text-foreground tracking-tight leading-tight">
            {question}
          </h1>
          {hint && <p className="text-lg text-muted-foreground">{hint}</p>}
        </div>

        <div
          className="space-y-3"
          role="radiogroup"
          aria-label="Select your job coach"
        >
          {COACHES.map((coach) => {
            const selected = value === coach.email;
            return (
              <button
                key={coach.email}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => onChange(coach.email)}
                onDoubleClick={onNext}
                className={`w-full flex items-center gap-4 px-5 py-4 text-left rounded-2xl border
                            transition-all duration-200 shadow-soft
                            ${
                              selected
                                ? "bg-accent border-primary ring-2 ring-primary/30"
                                : "bg-card border-border hover:border-primary/50 hover:bg-accent/40"
                            }`}
              >
                <span
                  className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center
                              ${selected ? "bg-primary" : "bg-secondary"}`}
                >
                  {selected ? (
                    <Check className="w-5 h-5 text-primary-foreground stroke-[3]" />
                  ) : (
                    <UserRound className="w-5 h-5 text-muted-foreground" />
                  )}
                </span>
                <span className="min-w-0">
                  <span className="block text-lg font-medium text-foreground truncate">
                    {coach.name}
                  </span>
                  <span className="block text-sm text-muted-foreground truncate">
                    {coach.location ? `${coach.location} · ` : ""}
                    {coach.email}
                  </span>
                </span>
              </button>
            );
          })}

          {error && (
            <p className="text-destructive text-sm font-medium animate-fade-in-up pl-1">{error}</p>
          )}

          {USING_PLACEHOLDER_COACHES && (
            <p className="text-sm text-muted-foreground/70 pl-1">
              Using the built-in coach list. Set VITE_COACHES to the full roster.
            </p>
          )}
        </div>

        <div className="flex items-center justify-between pt-4">
          {onBack ? (
            <button
              onClick={onBack}
              className="flex items-center gap-2 px-4 py-2 text-muted-foreground hover:text-foreground
                         transition-colors duration-200 rounded-xl hover:bg-secondary/50"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="text-sm font-medium">Back</span>
            </button>
          ) : (
            <div />
          )}

          <button
            onClick={onNext}
            className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground
                       rounded-2xl font-medium shadow-soft hover:shadow-glow
                       transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
          >
            <span>Continue</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default CoachSelectScreen;
