import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";

interface JobSourceScreenProps {
  question: string;
  hint?: string;
  jobLink: string;
  jobDescription: string;
  onChangeLink: (value: string) => void;
  onChangeDescription: (value: string) => void;
  onNext: () => void;
  onBack?: () => void;
  isVisible: boolean;
  error?: string;
}

/**
 * The job source step: a link, or the description pasted straight in.
 *
 * Both exist because plenty of listings cannot be read from a URL -- some career
 * sites block automated fetches, some sit behind a login, and some postings are
 * only ever sent to the applicant directly. A pasted description skips the fetch
 * entirely and is the most faithful input we can get, so it is offered as a
 * first-class option rather than a fallback.
 */
const JobSourceScreen = ({
  question,
  hint,
  jobLink,
  jobDescription,
  onChangeLink,
  onChangeDescription,
  onNext,
  onBack,
  isVisible,
  error,
}: JobSourceScreenProps) => {
  const linkRef = useRef<HTMLInputElement>(null);
  const [showError, setShowError] = useState(false);

  useEffect(() => {
    if (isVisible && linkRef.current) {
      const timer = setTimeout(() => linkRef.current?.focus(), 400);
      return () => clearTimeout(timer);
    }
  }, [isVisible]);

  useEffect(() => {
    setShowError(!!error);
  }, [error]);

  const handleLinkKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      onNext();
    }
  };

  const handleDescriptionKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      onNext();
    }
  };

  if (!isVisible) return null;

  const descriptionWords = jobDescription.trim()
    ? jobDescription.trim().split(/\s+/).length
    : 0;

  return (
    <div className="animate-fade-in-up w-full max-w-2xl mx-auto px-6">
      <div className="space-y-8">
        <div className="space-y-3">
          <h1 className="text-3xl sm:text-4xl font-semibold text-foreground tracking-tight leading-tight">
            {question}
          </h1>
          {hint && <p className="text-lg text-muted-foreground">{hint}</p>}
        </div>

        <div className="space-y-5">
          <input
            ref={linkRef}
            type="url"
            value={jobLink}
            onChange={(e) => onChangeLink(e.target.value)}
            onKeyDown={handleLinkKeyDown}
            className="w-full px-5 py-4 text-lg bg-card border border-border rounded-2xl
                       focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary
                       transition-all duration-200 shadow-soft
                       placeholder:text-muted-foreground/50"
            placeholder="https://..."
          />

          <div className="flex items-center gap-3">
            <span className="h-px flex-1 bg-border" />
            <span className="text-sm text-muted-foreground">or just paste the job description if you have it</span>
            <span className="h-px flex-1 bg-border" />
          </div>

          <div className="space-y-2">
            <textarea
              value={jobDescription}
              onChange={(e) => onChangeDescription(e.target.value)}
              onKeyDown={handleDescriptionKeyDown}
              className="w-full min-h-[200px] px-5 py-4 text-base bg-card border border-border rounded-2xl
                         focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary
                         transition-all duration-200 resize-y shadow-soft
                         placeholder:text-muted-foreground/50"
              placeholder="Paste the whole job description here: duties, requirements, pay, anything the posting says."
            />
            <div className="flex items-center justify-between gap-4 pl-1">
              <p className="text-sm text-muted-foreground/70">
                Pasting it works best. Some job sites block us from reading the link.
              </p>
              {descriptionWords > 0 && (
                <p className="text-sm text-muted-foreground/70 whitespace-nowrap">
                  {descriptionWords} {descriptionWords === 1 ? "word" : "words"}
                </p>
              )}
            </div>
          </div>

          {showError && error && (
            <p className="text-destructive text-sm font-medium animate-fade-in-up pl-1">{error}</p>
          )}

          <p className="text-sm text-muted-foreground/70 pl-1">
            Press{" "}
            <kbd className="px-1.5 py-0.5 bg-secondary rounded text-xs font-medium">⌘</kbd> +{" "}
            <kbd className="px-1.5 py-0.5 bg-secondary rounded text-xs font-medium">Enter</kbd> to
            continue
          </p>
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

export default JobSourceScreen;
