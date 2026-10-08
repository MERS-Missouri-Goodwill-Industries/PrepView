interface ProgressIndicatorProps {
  currentStep: number;
  totalSteps: number;
}

const ProgressIndicator = ({ currentStep, totalSteps }: ProgressIndicatorProps) => {
  const progress = (currentStep / totalSteps) * 100;

  return (
    <div className="w-full max-w-xs mx-auto">
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm text-muted-foreground font-medium">
          Step {currentStep} of {totalSteps}
        </span>
      </div>
      <div className="h-1 bg-secondary rounded-full overflow-hidden">
        <div
          className="h-full bg-primary rounded-full transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
};

export default ProgressIndicator;
