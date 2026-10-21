import { confirm, isCancel } from "@clack/prompts";
import { CliError, EXIT_ERROR, EXIT_USAGE } from "./errors";
import type { Ctx } from "./context";

/** `--yes` flag for destructive commands. */
export const YES_FLAG = {
  yes: {
    type: "boolean",
    alias: "y",
    description: "Skip the confirmation (required when not on a TTY)",
  },
} as const;

/**
 * Gate a destructive action. `--yes` proceeds; on a TTY ask; otherwise refuse
 * with a structured usage error telling the caller to pass --yes.
 */
export async function confirmDestructive(
  ctx: Ctx,
  message: string,
  retry: string
): Promise<void> {
  if (ctx.args.yes) return;
  if (!ctx.rt.interactive) {
    throw new CliError(
      "confirmation_required",
      `${message} needs confirmation`,
      `${retry} --yes`,
      EXIT_USAGE
    );
  }
  const ok = await confirm({ message: `${message}?`, initialValue: false });
  if (isCancel(ok) || !ok) {
    throw new CliError(
      "cancelled",
      "Cancelled; nothing changed",
      undefined,
      EXIT_ERROR
    );
  }
}
