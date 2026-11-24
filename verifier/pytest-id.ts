/**
 * Pytest ids for the Feature map: the file an id names, its names (classes,
 * then the function or class), and whether the file's source defines the last
 * name. A `[...]` parametrize suffix is dropped. `A::B::c` looks for `c` inside
 * class `B` inside class `A`. Commented lines never count as definitions.
 */

/** An id split into its file and its names. `path::A::b` gives file `path`, names ["A", "b"]. */
export function parseTestId(test: string): { file: string; names: string[] } {
  const [file, ...parts] = test.split("::");
  return { file, names: parts.map((part) => part.replace(/\[.*\]$/, "")) };
}

/** A regular expression's text with its special characters escaped. */
function escapeRe(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** A `def` line for `name`, sync or async; a commented `# def` never matches (no `#` in the pattern). */
function defLine(name: string): RegExp {
  return new RegExp(`^\\s*(async\\s+)?def\\s+${escapeRe(name)}\\s*\\(`);
}

/** A `class` line for `name`. */
function classLine(name: string): RegExp {
  return new RegExp(`^\\s*class\\s+${escapeRe(name)}\\b`);
}

/** The width of a line's leading whitespace. */
function indentOf(line: string): number {
  return line.length - line.trimStart().length;
}

/** A line with code on it: not blank and not a comment. */
function isCode(line: string): boolean {
  const text = line.trim();
  return text !== "" && !text.startsWith("#");
}

/** The lines under the line at `start`: up to the next code line indented at its level or less. */
function blockAfter(lines: string[], start: number): string[] {
  const indent = indentOf(lines[start]);
  const body: string[] = [];
  for (const line of lines.slice(start + 1)) {
    if (isCode(line) && indentOf(line) <= indent) break;
    body.push(line);
  }
  return body;
}

/**
 * Whether `source` defines the id's last name. Each earlier name must be a
 * class, and the last is looked for inside the last of those classes (a def,
 * or a class). An id with no names is found by its file alone.
 */
export function definesTest(source: string, names: string[]): boolean {
  if (names.length === 0) return true;
  let scope = source.split("\n");
  for (const cls of names.slice(0, -1)) {
    const at = scope.findIndex((line) => classLine(cls).test(line));
    if (at < 0) return false;
    scope = blockAfter(scope, at);
  }
  const last = names[names.length - 1];
  return scope.some((line) => defLine(last).test(line) || classLine(last).test(line));
}
