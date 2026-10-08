/**
 * Job coaches the participant can be working with.
 *
 * The report from each practice interview is emailed to the coach selected
 * here, so a wrong address means a participant's interview analysis goes to the
 * wrong person. A dropdown is used rather than a free-text email field for
 * exactly that reason: no typos, and the list stays under your control.
 *
 * ============================================================================
 * YOU MUST REPLACE THIS LIST BEFORE ANY REAL PARTICIPANT USES THE TOOL.
 * ============================================================================
 *
 * Two options:
 *   1. Edit PLACEHOLDER_COACHES below, or
 *   2. Set VITE_COACHES at build time to a JSON array of
 *      { name, email, location? } objects. Preferred if you would rather keep
 *      real staff addresses out of version control. See .env.example.
 *
 * While the built-in list is in use, USING_PLACEHOLDER_COACHES is true and the
 * UI shows an on-screen warning. That warning clears automatically once
 * VITE_COACHES is set -- do not delete it by hand.
 */

export interface Coach {
  /** Shown to the participant. */
  name: string;
  /** Where the interview report is sent. */
  email: string;
  /** Optional location or team, shown as a secondary line. */
  location?: string;
}

const PLACEHOLDER_COACHES: Coach[] = [
  { name: "Example Coach", email: "coach@example.org", location: "PLACEHOLDER - replace" },
  { name: "Second Example", email: "coach2@example.org", location: "PLACEHOLDER - replace" },
];

/**
 * Optional build-time override. Set VITE_COACHES to a JSON array of
 * { name, email, location? } objects. Falls back to the list above.
 */
function loadCoaches(): Coach[] {
  const raw = import.meta.env.VITE_COACHES;
  if (!raw) return PLACEHOLDER_COACHES;

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      console.warn("VITE_COACHES is not a non-empty array; using the built-in list.");
      return PLACEHOLDER_COACHES;
    }
    const valid = parsed.filter(
      (c): c is Coach =>
        c && typeof c.name === "string" && typeof c.email === "string" && c.email.includes("@"),
    );
    if (valid.length === 0) {
      console.warn("VITE_COACHES contained no usable entries; using the built-in list.");
      return PLACEHOLDER_COACHES;
    }
    return valid;
  } catch {
    console.warn("VITE_COACHES is not valid JSON; using the built-in list.");
    return PLACEHOLDER_COACHES;
  }
}

export const COACHES: Coach[] = loadCoaches();

/** True while the built-in placeholder roster is in use, so the UI can say so. */
export const USING_PLACEHOLDER_COACHES = !import.meta.env.VITE_COACHES;

export function coachByEmail(email: string): Coach | undefined {
  return COACHES.find((c) => c.email === email);
}
