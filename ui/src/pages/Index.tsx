import FloatingOrbs from "@/components/FloatingOrbs";
import ProgressIndicator from "@/components/ProgressIndicator";
import SpecialistSelectScreen from "@/components/SpecialistSelectScreen";
import JobSourceScreen from "@/components/JobSourceScreen";
import QuestionScreen from "@/components/QuestionScreen";
import ReviewScreen from "@/components/ReviewScreen";
import SuccessScreen from "@/components/SuccessScreen";
import ThemeToggle from "@/components/ThemeToggle";
import { useIntakeForm } from "@/hooks/useIntakeForm";

const Index = () => {
  const {
    currentStep,
    formData,
    errors,
    isSubmitting,
    submitError,
    isSuccess,
    phoneNumber,
    updateField,
    nextStep,
    prevStep,
    goToStep,
    submitForm,
    dismissError,
    stage,
  } = useIntakeForm();

  const totalQuestionSteps = 5;

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden">
      {/* Background effects */}
      <FloatingOrbs />

      {/* Theme toggle */}
      <ThemeToggle />

      {/* Progress indicator - hidden on success */}
      {!isSuccess && (
        <div className="fixed top-8 left-1/2 -translate-x-1/2 z-10 w-full px-6">
          <ProgressIndicator
            currentStep={Math.min(currentStep, totalQuestionSteps)}
            totalSteps={totalQuestionSteps}
          />
        </div>
      )}

      {/* Main content area */}
      <main className="relative z-10 w-full flex items-center justify-center min-h-screen py-24">
        {/* Question 1: Name */}
        <QuestionScreen
          question="What is your name?"
          hint="We'll use this to personalize your experience"
          value={formData.name}
          onChange={(value) => updateField("name", value)}
          onNext={nextStep}
          isVisible={currentStep === 1 && !isSuccess}
          error={errors.name}
        />

        {/* Question 2: Employment Specialist -- decides where the interview report is sent */}
        <SpecialistSelectScreen
          question="Which employment specialist are you working with?"
          hint="We'll send them a summary of how your practice interview went"
          value={formData.specialistEmail}
          onChange={(value) => updateField("specialistEmail", value)}
          onNext={nextStep}
          onBack={prevStep}
          isVisible={currentStep === 2 && !isSuccess}
          error={errors.specialistEmail}
        />

        {/* Question 3: Job source -- a link, or the description pasted directly */}
        <JobSourceScreen
          question="Which job are you applying to?"
          hint="Share the posting link, or paste the description straight in"
          jobLink={formData.jobLink}
          jobDescription={formData.jobDescription}
          onChangeLink={(value) => updateField("jobLink", value)}
          onChangeDescription={(value) => updateField("jobDescription", value)}
          onNext={nextStep}
          onBack={prevStep}
          isVisible={currentStep === 3 && !isSuccess}
          error={errors.jobLink || errors.jobDescription}
        />

        {/* Question 4: Nervous About */}
        <QuestionScreen
          question="What are you most nervous about?"
          hint="Be honest. Acknowledging your concerns is the first step to overcoming them"
          value={formData.nervousAbout}
          onChange={(value) => updateField("nervousAbout", value)}
          onNext={nextStep}
          onBack={prevStep}
          isTextArea
          isVisible={currentStep === 4 && !isSuccess}
          error={errors.nervousAbout}
        />

        {/* Question 5: Focus Area */}
        <QuestionScreen
          question="What do you want to focus on practicing the most?"
          hint="This helps us tailor your preparation to what matters most to you"
          value={formData.focusArea}
          onChange={(value) => updateField("focusArea", value)}
          onNext={nextStep}
          onBack={prevStep}
          isTextArea
          isVisible={currentStep === 5 && !isSuccess}
          error={errors.focusArea}
        />

        {/* Review Screen */}
        <ReviewScreen
          formData={formData}
          onEdit={goToStep}
          onSubmit={submitForm}
          onBack={prevStep}
          isVisible={currentStep === 6 && !isSuccess}
          isSubmitting={isSubmitting}
          submitError={submitError}
        />

        {/* Success Screen */}
        <SuccessScreen
          isVisible={isSuccess}
          name={formData.name.split(" ")[0]}
          phoneNumber={phoneNumber}
          submitError={submitError}
          onRetry={dismissError}
          stage={stage}
        />
      </main>

    </div>
  );
};

export default Index;
