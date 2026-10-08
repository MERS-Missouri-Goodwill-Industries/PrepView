import { AlertCircle, Check, Clock, Phone, RotateCcw } from "lucide-react";
import ProvisioningProgress from "@/components/ProvisioningProgress";

interface SuccessScreenProps {
  isVisible: boolean;
  name: string;
  phoneNumber?: string;
  /** Set when provisioning failed. Shown instead of the waiting animation. */
  submitError?: string;
  onRetry?: () => void;
  /** Pipeline stage from the status poll; undefined until the first poll returns. */
  stage?: string | null;
}

const SuccessScreen = ({
  isVisible,
  name,
  phoneNumber,
  submitError,
  onRetry,
  stage,
}: SuccessScreenProps) => {
  if (!isVisible) return null;

  // A failure must replace the waiting animation. Left spinning, a failed
  // submission is indistinguishable from a slow one and the participant waits
  // forever.
  if (submitError) {
    return (
      <div className="animate-fade-in-up w-full max-w-2xl mx-auto px-6 text-center">
        <div className="space-y-8">
          <div className="w-24 h-24 mx-auto bg-destructive/10 rounded-full flex items-center justify-center">
            <AlertCircle className="w-10 h-10 text-destructive" />
          </div>
          <div className="space-y-4">
            <h1 className="text-3xl sm:text-4xl font-semibold text-foreground tracking-tight">
              We hit a snag
            </h1>
            <p className="text-lg text-muted-foreground max-w-md mx-auto leading-relaxed">
              {submitError}
            </p>
          </div>
          {onRetry && (
            <button
              onClick={onRetry}
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground
                         rounded-2xl font-medium shadow-soft hover:shadow-glow
                         transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Back to review</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  const isLoading = !phoneNumber;

  return (
    <div className="animate-fade-in-up w-full max-w-2xl mx-auto px-6 text-center">
      {isLoading ? (
        <ProvisioningProgress stage={stage} name={name} />
      ) : (
        <div className="animate-fade-in-up space-y-8">
          {/* Success checkmark */}
          <div className="animate-scale-in">
            <div className="w-24 h-24 mx-auto bg-success/10 rounded-full flex items-center justify-center">
              <div className="w-16 h-16 bg-success rounded-full flex items-center justify-center shadow-soft">
                <Check className="w-8 h-8 text-success-foreground stroke-[3]" />
              </div>
            </div>
          </div>

          {/* Ready message */}
          <div className="space-y-4">
            <h1 className="text-3xl sm:text-4xl font-semibold text-foreground tracking-tight">
              Your AI Interviewer is Ready!
            </h1>
            <p className="text-lg text-muted-foreground max-w-md mx-auto leading-relaxed">
              Give it a call and start practicing. Have fun honing your interview skills, {name}!
            </p>
          </div>

          {/* Phone number display */}
          <div className="pt-2">
            <div className="inline-flex items-center gap-4 px-8 py-5 bg-card border border-border rounded-2xl shadow-soft-lg">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Phone className="w-6 h-6 text-primary" />
              </div>
              <div className="text-left">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Call this number</p>
                <p className="text-2xl sm:text-3xl font-semibold text-foreground tracking-wide">{phoneNumber}</p>
              </div>
            </div>
          </div>

          {/* Expiry note */}
          <div className="pt-4 space-y-4">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-accent rounded-full">
              <Clock className="w-3.5 h-3.5 text-accent-foreground" />
              <span className="text-sm font-medium text-accent-foreground">
                Call within 2 hours. This number is released after your interview
              </span>
            </div>

            <p className="text-muted-foreground/70 text-sm">
              Good luck, you've got this! 🎉
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default SuccessScreen;
