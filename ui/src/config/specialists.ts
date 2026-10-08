/**
 * Employment specialists the participant can be working with.
 *
 * The report from each practice interview is emailed to the employment specialist selected
 * here, so a wrong address means a participant's interview analysis goes to the
 * wrong person. A dropdown is used rather than a free-text email field for
 * exactly that reason: no typos, and the list stays under your control.
 *
 * ============================================================================
 * YOU MUST REPLACE THIS LIST BEFORE ANY REAL PARTICIPANT USES THE TOOL.
 * ============================================================================
 *
 * Two options:
 *   1. Edit PLACEHOLDER_SPECIALISTS below, or
 *   2. Set VITE_SPECIALISTS at build time to a JSON array of
 *      { name, email, location? } objects. Preferred if you would rather keep
 *      real staff addresses out of version control. See .env.example.
 *
 * While the built-in list is in use, USING_PLACEHOLDER_SPECIALISTS is true and the
 * UI shows an on-screen warning. That warning clears automatically once
 * VITE_SPECIALISTS is set -- do not delete it by hand.
 */

export interface Specialist {
  /** Shown to the participant. */
  name: string;
  /** Where the interview report is sent. */
  email: string;
  /** Optional location or team, shown as a secondary line. */
  location?: string;
}

const PLACEHOLDER_SPECIALISTS: Specialist[] = [
  { name: "Example Specialist", email: "specialist@example.org", location: "PLACEHOLDER - replace" },
  { name: "Second Example", email: "specialist2@example.org", location: "PLACEHOLDER - replace" },
];

/**
 * Optional build-time override. Set VITE_SPECIALISTS to a JSON array of
 * { name, email, location? } objects. Falls back to the list above.
 */
function loadSpecialists(): Specialist[] {
  const raw = import.meta.env.VITE_SPECIALISTS;
  if (!raw) return PLACEHOLDER_SPECIALISTS;

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      console.warn("VITE_SPECIALISTS is not a non-empty array; using the built-in list.");
      return PLACEHOLDER_SPECIALISTS;
    }
    const valid = parsed.filter(
      (c): c is Specialist =>
        c && typeof c.name === "string" && typeof c.email === "string" && c.email.includes("@"),
    );
    if (valid.length === 0) {
      console.warn("VITE_SPECIALISTS contained no usable entries; using the built-in list.");
      return PLACEHOLDER_SPECIALISTS;
    }
    return valid;
  } catch {
    console.warn("VITE_SPECIALISTS is not valid JSON; using the built-in list.");
    return PLACEHOLDER_SPECIALISTS;
  }
}

export const SPECIALISTS: Specialist[] = loadSpecialists();

/** True while the built-in placeholder roster is in use, so the UI can say so. */
export const USING_PLACEHOLDER_SPECIALISTS = !import.meta.env.VITE_SPECIALISTS;

export function specialistByEmail(email: string): Specialist | undefined {
  return SPECIALISTS.find((c) => c.email === email);
}
