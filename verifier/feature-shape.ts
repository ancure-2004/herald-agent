/**
 * Shape helpers for the Feature map's JSON: what counts as an object, as
 * non-empty text, and how a list field with a minimum length is checked.
 */

/** A JSON object (not an array, not null). */
export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Non-empty text: a string with something other than spaces in it. */
export function isText(value: unknown): value is string {
  return typeof value === "string" && value.trim() !== "";
}

/** A list field with at least `min` items, each passing `ok`; `what` names the item type in the break. */
export function checkList(value: unknown, field: string, min: number, ok: (x: unknown) => boolean, bad: (m: string) => void, what: string): void {
  if (!Array.isArray(value) || value.length < min) {
    bad(min > 0 ? `${field} must list at least ${min} item(s)` : `${field} must be a list`);
    return;
  }
  value.forEach((item, i) => {
    if (!ok(item)) bad(`${field} item ${i + 1} must be ${what}`);
  });
}
