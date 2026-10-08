/**
 * Facts shown on the waiting screen while an interview is being prepared.
 *
 * Provisioning takes 90-140 seconds. A progress bar on its own reads as a hang,
 * so the screen rotates a short fact about your organization every 8 seconds.
 * This is the cheapest fix available for the one genuinely slow moment in the
 * participant's experience.
 *
 * ============================================================================
 * REPLACE EVERY ENTRY BELOW WITH YOUR OWN.
 * ============================================================================
 *
 * Rules that made the originals work, and are worth keeping:
 *
 *   - Every fact must be SOURCED. Cite an annual report, audited financials, or
 *     an official page. Never invent a statistic for a participant-facing
 *     screen -- someone in the room will eventually check one.
 *   - If a figure is COMPUTED rather than published, say so in the source line
 *     (e.g. "computed from 2024 audited financials"). Do not present a derived
 *     number as a published one.
 *   - Keep each under about 140 characters. This is a glance, not a read.
 *   - Eight to twelve facts is right. Fewer and the rotation visibly repeats
 *     inside a single wait.
 *   - Re-check them whenever a new annual report is published.
 */

export interface Fact {
  text: string;
  /** Where the figure comes from; shown small under the fact. */
  source: string;
}

export const FACTS: Fact[] = [
  {
    text: "PLACEHOLDER - replace every entry in this file before launch.",
    source: "See the sourcing rules at the top of src/config/facts.ts",
  },
  {
    text: "Example: we served 10,000 people across 25 programs last year.",
    source: "2024 Annual Report",
  },
  {
    text: "Example: 93 cents of every dollar goes to program services.",
    source: "Computed from 2024 audited financials",
  },
  {
    text: "Example: our first career center opened in 1918.",
    source: "Organization history page",
  },
];

/** Deterministic shuffle so two people waiting side by side don't see the same order. */
export function shuffledFacts(seed: number): Fact[] {
  const arr = [...FACTS];
  let s = seed >>> 0 || 1;
  for (let i = arr.length - 1; i > 0; i--) {
    // xorshift32 -- tiny, good enough for ordering a list
    s ^= s << 13; s >>>= 0;
    s ^= s >>> 17;
    s ^= s << 5;  s >>>= 0;
    const j = s % (i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
