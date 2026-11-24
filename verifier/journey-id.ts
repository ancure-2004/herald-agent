/**
 * Journey proofs for the Feature map: `verifier/journeys/<file>.ts::<title>`.
 * The file part names a journey file; the title is the name of a test in it,
 * written `test("<title>"` or `test('<title>'`. A journey proof is never a
 * known failure: it covers its sub-feature or it is a break.
 */

/** The folder every journey file lives in, relative to herald's root. */
export const JOURNEY_DIR = "verifier/journeys/";

/** The file and the title of a journey proof, or undefined when the id is not one (a pytest id never has `.ts::`). */
export function journeyId(test: string): { file: string; title: string } | undefined {
  const at = test.indexOf(".ts::");
  if (at < 0) return undefined;
  return { file: test.slice(0, at + 3), title: test.slice(at + 5) };
}

/** Whether a journey file's source defines a test with this title, in either quote style. */
export function definesJourneyTest(source: string, title: string): boolean {
  return source.includes(`test("${title}"`) || source.includes(`test('${title}'`);
}
