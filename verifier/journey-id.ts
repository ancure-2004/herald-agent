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

/**
 * Whether a journey file's source defines a test with this title, in either
 * quote style: a `test("<title>"` call that starts a line (indentation allowed),
 * so a commented title or a `test.fixme(` / `test.skip(` call does not count.
 * The test's body runs up to the next `test(` call; a `test.skip(` or
 * `test.fixme(` in it means the test never runs, so it is no proof either.
 */
export function definesJourneyTest(source: string, title: string): boolean {
  const lines = source.split("\n").map((line) => line.trimStart());
  const openers = [`test("${title}"`, `test('${title}'`];
  return lines.some((line, i) => {
    if (!openers.some((opener) => line.startsWith(opener))) return false;
    for (const next of lines.slice(i + 1)) {
      if (next.startsWith("test(")) return true;
      if (/\btest\.(skip|fixme)\(/.test(next)) return false;
    }
    return true;
  });
}
