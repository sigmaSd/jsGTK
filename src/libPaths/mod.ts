import type { LibPaths } from "./types.ts";

const OS = Deno.build.os;

/** Paths to GTK and related libraries found in current OS' typical locations */
export const LIB_PATHS: LibPaths = OS === "darwin"
  ? (await import("./platform/darwin.ts")).darwinLibPaths
  : OS === "windows"
  ? (await import("./platform/windows.ts")).windowsLibPaths
  // For linux and all other platforms, use unix paths
  : (await import("./platform/unix.ts")).unixLibPaths;
