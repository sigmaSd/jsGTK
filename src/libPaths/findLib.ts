import { join } from "node:path";

/** Find the library in the given paths */
export function findLib(
  lib: string,
  paths: Array<string>,
): string {
  const candidates: Array<string> = [lib];

  for (const path of paths) {
    const fullPath = join(path, lib);
    candidates.push(fullPath);
  }

  const uniqueCandidates = Array.from(new Set(candidates));

  return tryOpenLib(uniqueCandidates);
}

/** Helper to try multiple library paths */
function tryOpenLib(paths: string[]): string {
  for (const path of paths) {
    try {
      // Try to open with a minimal symbol set to test
      const lib = Deno.dlopen(path, {});
      lib.close();
      return path;
    } catch {
      // If library could not be opened, try next one
      continue;
    }
  }
  // Return the first path as fallback
  return paths[0];
}
