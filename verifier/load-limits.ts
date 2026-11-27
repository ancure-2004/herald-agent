/**
 * The load check's numbers, in one file: the backend calls and the screens it
 * times (checks/load.ts), each with a target (fast within it) and a hard limit
 * (broken past it), and the fake data's size and seed. Every call is a GET that
 * neither sends anything, calls an AI nor starts a job. VERIFY_LOAD_LIMITS_SCALE
 * multiplies every target and hard limit; the Seam tests shrink them with it,
 * and a real run never sets it.
 */

/** A target and a hard limit, in milliseconds. */
export type Limits = { targetMs: number; hardMs: number };

/** A backend call the load check times: a label, its GET path (with query), the code that makes it, and its limits. */
export type CallSpec = { label: string; path: string; source: string; limits: Limits };

/** A screen the load check times in headless Chrome, by its name in herald's sidebar. */
export type ScreenSpec = { label: string; limits: Limits };

/**
 * The fake data: how many leads the generator makes, and its seed (same seed, same database).
 * Lead 1 is always the busy lead (12 messages, 3 calls, 2 commitments, 5 facts), so the inbox and call-brief calls time real rows.
 */
export const LEADS = 2000;
export const SEED = 42;

/** Backend calls: target 500 ms, hard limit 10 s. */
const CALL_LIMITS: Limits = { targetMs: 500, hardMs: 10_000 };

/** Screens: target 5 s, hard limit 30 s. */
const SCREEN_LIMITS: Limits = { targetMs: 5_000, hardMs: 30_000 };

/** The backend calls the main screens make, each with the frontend line that makes it. */
export const CALLS: CallSpec[] = [
  /** Also the Kanban board's data: the board and the Leads Table read the one list the app loads at start (CRMContext.tsx:536). */
  { label: "leads list and Kanban board data", path: "/api/leads?hustle_id=1&smart_view=all_active", source: "frontend/src/context/CRMContext.tsx:536", limits: CALL_LIMITS },
  { label: "cockpit state", path: "/api/autopilot/cockpit-state?hustle_id=1", source: "frontend/src/api/autopilotApi.ts:75", limits: CALL_LIMITS },
  { label: "attention lists", path: "/api/cockpit/attention?hustle_id=1", source: "frontend/src/features/cockpit/AutopilotCockpitView.tsx", limits: CALL_LIMITS },
  { label: "inbox threads", path: "/api/leads/1/messages", source: "frontend/src/api/messagesApi.ts:31", limits: CALL_LIMITS },
  { label: "call briefs list", path: "/api/leads/1/calls", source: "frontend/src/features/calls/CallsManagementView.tsx:291", limits: CALL_LIMITS },
];

/** The two screens the load check times: the Overview (herald's "Overview" in the sidebar) and the Leads Table. */
export const SCREENS: string[] = ["Management Overview", "Leads Table"];

/** The limits in effect: the leads and seed, and every call and screen with its limits after the scale. */
export type LoadLimits = { leads: number; seed: number; calls: CallSpec[]; screens: ScreenSpec[] };

/** The scale from VERIFY_LOAD_LIMITS_SCALE: a positive number, else 1 (unset or not a positive number). */
export function scale(env: Record<string, string | undefined>): number {
  const value = Number(env.VERIFY_LOAD_LIMITS_SCALE);
  return env.VERIFY_LOAD_LIMITS_SCALE !== undefined && Number.isFinite(value) && value > 0 ? value : 1;
}

/** Limits multiplied by the scale. */
function scaled(limits: Limits, factor: number): Limits {
  return { targetMs: limits.targetMs * factor, hardMs: limits.hardMs * factor };
}

/** The limits in effect for this environment: the file's numbers, multiplied by VERIFY_LOAD_LIMITS_SCALE when it is set. */
export function loadLimits(env: Record<string, string | undefined>): LoadLimits {
  const factor = scale(env);
  return {
    leads: LEADS,
    seed: SEED,
    calls: CALLS.map((call) => ({ ...call, limits: scaled(call.limits, factor) })),
    screens: SCREENS.map((label) => ({ label, limits: scaled(SCREEN_LIMITS, factor) })),
  };
}

/** The note a scaled run carries (the check's message and load.log): empty when the scale in effect is 1. */
export function limitsNote(env: Record<string, string | undefined>): string {
  const factor = scale(env);
  return factor === 1 ? "" : `limits scaled ×${factor} (test setting)`;
}
