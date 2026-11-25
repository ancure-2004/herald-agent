/**
 * Read-only probes of the paths the Feature map names. A path that cannot be
 * looked at comes back as its error, never thrown: the feature-map check turns
 * it into a break that names the path.
 */
import { statSync } from "node:fs";

/** What is at a path, or why it could not be looked at. */
export type Kind = { kind: "missing" | "file" | "folder" | "other" } | { error: string };

/** An error's message, or its text when it is not an Error. */
export function errorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/** What `path` is (symlinks followed). A path that does not exist, or has a file where a folder should be, is missing. */
export function kindOf(path: string): Kind {
  try {
    const stat = statSync(path);
    if (stat.isFile()) return { kind: "file" };
    return { kind: stat.isDirectory() ? "folder" : "other" };
  } catch (error) {
    const code = (error as { code?: string }).code;
    if (code === "ENOENT" || code === "ENOTDIR") return { kind: "missing" };
    return { error: errorText(error) };
  }
}
