import { ArrowLeft, Edit3, Send, Loader2 } from "lucide-react";
import { coachByEmail } from "@/config/coaches";

interface FormData {
  name: string;
  coachEmail: string;
  jobLink: string;
  jobDescription: string;
  nervousAbout: string;
  focusArea: string;
}

interface ReviewScreenProps {
  formData: FormData;
  onEdit: (step: number) => void;
  onSubmit: () => void;
  onBack: () => void;
  isVisible: boolean;
  isSubmitting: boolean;
  submitError?: string;
}

const ReviewScreen = ({
  formData,
  onEdit,
  onSubmit,
  onBack,
  isVisible,
  isSubmitting,
  submitError,
}: ReviewScreenProps) => {
  if (!isVisible) return null;

  const coach = coachByEmail(formData.coachEmail);

  const reviewItems = [
    { label: "Your name", value: formData.name, step: 1 },
    {
      label: "Your job coach",
      value: coach ? `${coach.name} (${coach.email})` : formData.coachEmail,
      step: 2,
    },
    {
      label: formData.jobDescription.trim() ? "Job description you pasted" : "Job application link",
      value: formData.jobDescription.trim()
        ? formData.jobDescription.trim().slice(0, 400) +
          (formData.jobDescription.trim().length > 400 ? "…" : "")
        : formData.jobLink,
      step: 3,
    },
    { label: "What you're nervous about", value: formData.nervousAbout, step: 4 },
    { label: "What you want to focus on", value: formData.focusArea, step: 5 },
  ];

  return (
    <div className="animate-fade-in-up w-full max-w-2xl mx-auto px-6">
      <div className="space-y-8">
        {/* Header */}
        <div className="space-y-3 text-center">
          <h1 className="text-3xl sm:text-4xl font-semibold text-foreground tracking-tight">
            Ready to submit?
          </h1>
          <p className="text-lg text-muted-foreground">
            Take a moment to review your responses
          </p>
        </div>

        {/* Review Items */}
        <div className="space-y-4">
          {reviewItems.map((item, index) => (
            <div
              key={index}
              className="bg-card border border-border rounded-2xl p-5 shadow-soft group"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-muted-foreground mb-1.5">
                    {item.label}
                  </p>
                  <p className="text-foreground whitespace-pre-wrap break-words">
                    {item.value}
                  </p>
                </div>
                <button
                  onClick={() => onEdit(item.step)}
                  className="flex-shrink-0 p-2 text-muted-foreground hover:text-primary 
                             hover:bg-accent rounded-xl transition-all duration-200
                             opacity-0 group-hover:opacity-100 focus:opacity-100"
                  aria-label={`Edit ${item.label}`}
                >
                  <Edit3 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Error message */}
        {submitError && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-2xl p-4 text-center">
            <p className="text-destructive text-sm font-medium">
              {submitError}
            </p>
          </div>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between pt-4">
          <button
            onClick={onBack}
            disabled={isSubmitting}
            className="flex items-center gap-2 px-4 py-2 text-muted-foreground hover:text-foreground
                       transition-colors duration-200 rounded-xl hover:bg-secondary/50
                       disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm font-medium">Back</span>
          </button>

          <button
            onClick={onSubmit}
            disabled={isSubmitting}
            className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground
                       rounded-2xl font-medium shadow-soft hover:shadow-glow
                       transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]
                       disabled:opacity-80 disabled:cursor-not-allowed disabled:hover:scale-100"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Submitting...</span>
              </>
            ) : (
              <>
                <span>Submit</span>
                <Send className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReviewScreen;
