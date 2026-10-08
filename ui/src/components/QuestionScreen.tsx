import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";

interface QuestionScreenProps {
  question: string;
  hint?: string;
  value: string;
  onChange: (value: string) => void;
  onNext: () => void;
  onBack?: () => void;
  isTextArea?: boolean;
  inputType?: "text" | "url";
  isVisible: boolean;
  error?: string;
}

const QuestionScreen = ({
  question,
  hint,
  value,
  onChange,
  onNext,
  onBack,
  isTextArea = false,
  inputType = "text",
  isVisible,
  error,
}: QuestionScreenProps) => {
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);
  const [showError, setShowError] = useState(false);

  useEffect(() => {
    if (isVisible && inputRef.current) {
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [isVisible]);

  useEffect(() => {
    if (error) {
      setShowError(true);
    } else {
      setShowError(false);
    }
  }, [error]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !isTextArea) {
      e.preventDefault();
      onNext();
    }
    if (e.key === "Enter" && isTextArea && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      onNext();
    }
  };

  if (!isVisible) return null;

  return (
    <div className="animate-fade-in-up w-full max-w-2xl mx-auto px-6">
      <div className="space-y-8">
        {/* Question */}
        <div className="space-y-3">
          <h1 className="text-3xl sm:text-4xl font-semibold text-foreground tracking-tight leading-tight">
            {question}
          </h1>
          {hint && (
            <p className="text-lg text-muted-foreground">{hint}</p>
          )}
        </div>

        {/* Input */}
        <div className="space-y-3">
          {isTextArea ? (
            <textarea
              ref={inputRef as React.RefObject<HTMLTextAreaElement>}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full min-h-[180px] px-5 py-4 text-lg bg-card border border-border rounded-2xl 
                         focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary
                         transition-all duration-200 resize-none shadow-soft
                         placeholder:text-muted-foreground/50"
              placeholder="Take your time to reflect..."
            />
          ) : (
            <input
              ref={inputRef as React.RefObject<HTMLInputElement>}
              type={inputType}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full px-5 py-4 text-lg bg-card border border-border rounded-2xl 
                         focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary
                         transition-all duration-200 shadow-soft
                         placeholder:text-muted-foreground/50"
              placeholder={inputType === "url" ? "https://..." : "Type your answer..."}
            />
          )}

          {/* Error message */}
          {showError && error && (
            <p className="text-destructive text-sm font-medium animate-fade-in-up pl-1">
              {error}
            </p>
          )}

          {/* Keyboard hint for textarea */}
          {isTextArea && (
            <p className="text-sm text-muted-foreground/70 pl-1">
              Press <kbd className="px-1.5 py-0.5 bg-secondary rounded text-xs font-medium">⌘</kbd> + <kbd className="px-1.5 py-0.5 bg-secondary rounded text-xs font-medium">Enter</kbd> to continue
            </p>
          )}
        </div>

        {/* Navigation */}
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

export default QuestionScreen;
