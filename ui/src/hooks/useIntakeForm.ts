import { useState, useCallback } from "react";
import { COACHES } from "@/config/coaches";

interface FormData {
  name: string;
  coachEmail: string;
  jobLink: string;
  jobDescription: string;
  nervousAbout: string;
  focusArea: string;
}

interface FormErrors {
  name?: string;
  coachEmail?: string;
  jobLink?: string;
  jobDescription?: string;
  nervousAbout?: string;
  focusArea?: string;
}

/**
 * Session-provisioning webhook (n8n "Interview Practice - A").
 *
 * Configure per environment with VITE_PROVISION_WEBHOOK_URL. The default points
 * at the production path on the self-hosted instance. Note it is `/webhook/`,
 * not `/webhook-test/` -- the test path only responds while an n8n editor tab is
 * actively listening, so it silently stops working outside development.
 */
const WEBHOOK_URL =
  import.meta.env.VITE_PROVISION_WEBHOOK_URL ??
  "https://n8n.example.org/webhook/interview-provision";

/**
 * Status endpoint for polling. Provisioning is asynchronous: the submit returns
 * a sessionId in well under a second, then this is polled until a phone number
 * appears.
 *
 * It has to work this way. Holding one HTTP request open for the ~140s the
 * pipeline takes was breaking in the browser -- Cloudflare fronts n8n with a
 * 100s default origin timeout, and proxies and VPNs impose their own. A real run
 * finished server-side while the page reported a network failure.
 */
const STATUS_URL =
  import.meta.env.VITE_STATUS_WEBHOOK_URL ??
  "https://n8n.example.org/webhook/interview-status";

/** The submit itself is now fast; this only guards against an unreachable host. */
const SUBMIT_TIMEOUT_MS = 30_000;

const POLL_INTERVAL_MS = 3_000;

/**
 * Ceiling on the whole wait. Measured runs land at 100-140s; this leaves room for
 * a slow one without stranding someone in front of a spinner indefinitely.
 */
const POLL_TIMEOUT_MS = 300_000;

/**
 * Below this, a pasted description is too thin to build a credible interview on.
 * Roughly a short paragraph.
 */
const MIN_DESCRIPTION_CHARS = 120;

const GENERIC_FAILURE =
  "We couldn't set up your interview just now. Please try again, or ask your job coach for help.";

export const useIntakeForm = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<FormData>({
    name: "",
    // Pre-select when there is only one coach to choose from.
    coachEmail: COACHES.length === 1 ? COACHES[0].email : "",
    jobLink: "",
    jobDescription: "",
    nervousAbout: "",
    focusArea: "",
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | undefined>();
  const [isSuccess, setIsSuccess] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState<string | undefined>();
  const [sessionId, setSessionId] = useState<string | undefined>();
  /** Coarse pipeline stage from the status endpoint; drives the progress bar. */
  const [stage, setStage] = useState<string | undefined>();

  const validateStep = useCallback(
    (step: number): boolean => {
      const newErrors: FormErrors = {};

      switch (step) {
        case 1:
          if (!formData.name.trim()) {
            newErrors.name = "Please share your name so we can personalize your experience";
          } else if (formData.name.trim().length < 2) {
            newErrors.name = "Your name seems a bit short";
          }
          break;
        case 2:
          if (!formData.coachEmail.trim()) {
            newErrors.coachEmail = "Please choose the job coach you're working with";
          }
          break;
        case 3: {
          const link = formData.jobLink.trim();
          const desc = formData.jobDescription.trim();

          if (!link && !desc) {
            newErrors.jobLink =
              "Paste the job link, or paste the job description below — either one works";
          } else if (desc && desc.length < MIN_DESCRIPTION_CHARS) {
            newErrors.jobDescription =
              "That's a bit short to build an interview from. Paste more of the posting, or use the link instead.";
          } else if (!desc) {
            try {
              new URL(link);
            } catch {
              newErrors.jobLink =
                "That doesn't look like a valid URL. Try https://... or paste the description below instead.";
            }
          }
          break;
        }
        case 4:
          if (!formData.nervousAbout.trim()) {
            newErrors.nervousAbout =
              "It's okay to share—understanding your concerns helps us support you better";
          } else if (formData.nervousAbout.trim().length < 10) {
            newErrors.nervousAbout = "Could you share a bit more about what's on your mind?";
          }
          break;
        case 5:
          if (!formData.focusArea.trim()) {
            newErrors.focusArea = "Knowing your focus helps us tailor your preparation";
          } else if (formData.focusArea.trim().length < 10) {
            newErrors.focusArea = "Could you elaborate a bit more on your focus area?";
          }
          break;
      }

      setErrors(newErrors);
      return Object.keys(newErrors).length === 0;
    },
    [formData],
  );

  const updateField = useCallback(
    (field: keyof FormData, value: string) => {
      setFormData((prev) => ({ ...prev, [field]: value }));
      if (errors[field]) {
        setErrors((prev) => ({ ...prev, [field]: undefined }));
      }
    },
    [errors],
  );

  const nextStep = useCallback(() => {
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => Math.min(prev + 1, 6));
    }
  }, [currentStep, validateStep]);

  const prevStep = useCallback(() => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
    setErrors({});
    setSubmitError(undefined);
  }, []);

  const goToStep = useCallback((step: number) => {
    setCurrentStep(step);
    setErrors({});
    setSubmitError(undefined);
  }, []);

  /** Return from a failed submission to the review screen so it can be retried. */
  const dismissError = useCallback(() => {
    setSubmitError(undefined);
    setIsSuccess(false);
    setCurrentStep(6);
  }, []);

  /** Pull a human-readable message out of whatever the workflow returned. */
  const readErrorMessage = async (response: Response): Promise<string> => {
    let payload: unknown = undefined;
    try {
      payload = await response.json();
    } catch {
      /* not JSON -- fall through to the status-based message */
    }

    const body = payload as { error?: string; missing?: string[] } | undefined;

    if (body?.error) {
      // Workflow A returns { success:false, error, missing? } on a 400.
      if (Array.isArray(body.missing) && body.missing.length > 0) {
        return `${body.error} (${body.missing.join(", ")})`;
      }
      return body.error;
    }

    if (response.status === 503) {
      return "All practice lines are busy right now. Please try again in a few minutes.";
    }
    if (response.status === 429) {
      return "We're handling a lot of requests right now. Please try again in a moment.";
    }
    if (response.status >= 500) {
      return GENERIC_FAILURE;
    }
    return GENERIC_FAILURE;
  };

  const submitForm = useCallback(async () => {
    setIsSubmitting(true);
    setSubmitError(undefined);

    const payload = {
      // `name` is what the backend's intake step reads first; it also accepts
      // `participantName`. Sending both keeps either side safe to change.
      name: formData.name.trim(),
      participantName: formData.name.trim(),
      coachEmail: formData.coachEmail.trim(),
      jobLink: formData.jobLink.trim(),
      // When present this takes priority over the link: it needs no fetch and is
      // the most faithful account of the role we can get.
      jobDescription: formData.jobDescription.trim(),
      nervousAbout: formData.nervousAbout.trim(),
      focusArea: formData.focusArea.trim(),
      submittedAt: new Date().toISOString(),
      userAgent: navigator.userAgent,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    };

    // Show the waiting screen straight away -- provisioning takes about two
    // minutes and a frozen button would read as a broken form.
    setIsSuccess(true);
    setIsSubmitting(false);
    setStage("accepted");

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), SUBMIT_TIMEOUT_MS);

    let newSessionId: string | undefined;

    try {
      const response = await fetch(WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      if (!response.ok) {
        setSubmitError(await readErrorMessage(response));
        return;
      }

      const data = await response.json().catch(() => ({}) as Record<string, unknown>);

      if (data.success === false) {
        setSubmitError((data.error as string) || GENERIC_FAILURE);
        return;
      }

      if (typeof data.sessionId !== "string" || !data.sessionId) {
        setSubmitError(GENERIC_FAILURE);
        return;
      }

      newSessionId = data.sessionId;
      setSessionId(newSessionId);
    } catch (error) {
      if ((error as Error)?.name === "AbortError") {
        setSubmitError(
          "We couldn't reach the interview service in time. Please try again.",
        );
      } else {
        setSubmitError(
          "We couldn't reach the interview service. Please check your connection and try again.",
        );
      }
      return;
    } finally {
      clearTimeout(timer);
    }

    // ---- poll until the line is ready, or the workflow reports a failure
    const startedAt = Date.now();

    while (Date.now() - startedAt < POLL_TIMEOUT_MS) {
      await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));

      let status: { status?: string; stage?: string | null; phoneNumber?: string | null; error?: string | null };
      try {
        const res = await fetch(`${STATUS_URL}?sessionId=${encodeURIComponent(newSessionId)}`, {
          method: "GET",
          headers: { Accept: "application/json" },
        });
        if (!res.ok) continue; // a transient blip should not end the wait
        status = await res.json();
      } catch {
        continue; // same for a dropped poll -- keep trying until the ceiling
      }

      if (status.stage) setStage(status.stage);

      if (status.status === "ready" && status.phoneNumber) {
        setPhoneNumber(status.phoneNumber);
        return;
      }

      if (status.status === "failed") {
        setSubmitError(status.error || GENERIC_FAILURE);
        return;
      }
    }

    setSubmitError(
      "This is taking longer than expected. Your interview may still be getting ready — " +
        "please ask your job coach to check, or try again.",
    );
  }, [formData]);

  return {
    currentStep,
    formData,
    errors,
    isSubmitting,
    submitError,
    isSuccess,
    phoneNumber,
    sessionId,
    stage,
    updateField,
    nextStep,
    prevStep,
    goToStep,
    submitForm,
    dismissError,
  };
};
