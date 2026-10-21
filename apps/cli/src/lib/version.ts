import pkg from "../../package.json";

/** CLI version, from apps/cli/package.json (inlined by bun build --compile). */
export const VERSION: string = pkg.version;
