import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  FormField,
  Input,
} from "@vamsa/ui";
import type { DeviceRequestView } from "~/server/device";

export interface DeviceApprovalProps {
  /** Code from ?user_code= (verification_uri_complete) */
  initialCode?: string;
  /** Signed-in user's email, shown so people know which account approves */
  email?: string;
  load: (userCode: string) => Promise<DeviceRequestView>;
  decide: (userCode: string, approve: boolean) => Promise<DeviceRequestView>;
}

type Phase =
  | { kind: "enter"; error?: string }
  | { kind: "loading" }
  | { kind: "view"; view: DeviceRequestView; busy?: "approve" | "deny" };

/** "abcdefgh" -> "ABCD-EFGH" while typing */
function formatInput(raw: string): string {
  const c = raw
    .replace(/[^a-zA-Z0-9]/g, "")
    .toUpperCase()
    .slice(0, 8);
  return c.length > 4 ? `${c.slice(0, 4)}-${c.slice(4)}` : c;
}

function DeviceIcon() {
  return (
    <svg
      className="text-primary h-8 w-8"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M6.75 7.5l3 2.25-3 2.25m4.5 0h3m-9 8.25h13.5A2.25 2.25 0 0021 18V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v12a2.25 2.25 0 002.25 2.25z"
      />
    </svg>
  );
}

/**
 * Approve a `vamsa login` (OAuth device authorization) in the browser.
 * Enter or confirm the code, review who is asking, then approve or deny.
 */
export function DeviceApproval({
  initialCode,
  email,
  load,
  decide,
}: DeviceApprovalProps) {
  const { t, i18n } = useTranslation(["auth", "common"]);
  const [code, setCode] = useState(formatInput(initialCode ?? ""));
  const [phase, setPhase] = useState<Phase>(
    initialCode ? { kind: "loading" } : { kind: "enter" }
  );
  const headingRef = useRef<HTMLHeadingElement>(null);

  const lookup = async (value: string) => {
    setPhase({ kind: "loading" });
    try {
      setPhase({ kind: "view", view: await load(value) });
    } catch {
      setPhase({ kind: "enter", error: t("auth:deviceLookupFailed") });
    }
  };

  useEffect(() => {
    if (initialCode) void lookup(initialCode);
    // Only on mount: later lookups come from the form
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Move focus to the new heading when the state changes, for screen readers
  const viewState = phase.kind === "view" ? phase.view.state : undefined;
  useEffect(() => {
    if (viewState) headingRef.current?.focus();
  }, [viewState]);

  const onDecide = async (approve: boolean) => {
    if (phase.kind !== "view") return;
    setPhase({ ...phase, busy: approve ? "approve" : "deny" });
    try {
      const view = await decide(phase.view.userCode, approve);
      setPhase({ kind: "view", view });
    } catch {
      setPhase({ kind: "enter", error: t("auth:deviceLookupFailed") });
    }
  };

  const dateFmt = (iso?: string | null) =>
    iso
      ? new Intl.DateTimeFormat(i18n.language, {
          dateStyle: "medium",
          timeStyle: "short",
        }).format(new Date(iso))
      : null;

  const scopeLabel = (scope?: string | null) => {
    if (scope === "read") return t("auth:deviceScopeRead");
    if (scope === "admin") return t("auth:deviceScopeAdmin");
    return t("auth:deviceScopeWrite");
  };

  const enterForm = (error?: string) => (
    <form
      className="space-y-6"
      data-testid="device-code-form"
      onSubmit={(e) => {
        e.preventDefault();
        if (code.replace("-", "").length === 8) void lookup(code);
      }}
    >
      {error && (
        <div
          role="alert"
          className="border-destructive/30 bg-destructive/10 text-destructive rounded-lg border-2 px-4 py-3 text-sm"
        >
          {error}
        </div>
      )}
      <FormField label={t("auth:deviceCodeLabel")} required>
        <Input
          name="user_code"
          value={code}
          onChange={(e) => setCode(formatInput(e.target.value))}
          placeholder="ABCD-EFGH"
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          inputMode="text"
          maxLength={9}
          aria-describedby="device-code-hint"
          className="text-center font-mono text-xl tracking-[0.3em]"
          data-testid="device-code-input"
        />
      </FormField>
      <p id="device-code-hint" className="text-muted-foreground -mt-4 text-sm">
        {t("auth:deviceCodeHint")}
      </p>
      <Button
        type="submit"
        size="lg"
        className="w-full"
        disabled={code.replace("-", "").length !== 8}
        data-testid="device-code-submit"
      >
        {t("auth:deviceContinue")}
      </Button>
    </form>
  );

  const result = (
    title: string,
    body: string,
    tone: "ok" | "neutral" | "warn",
    testId: string,
    retry: boolean
  ) => (
    <div className="space-y-6 text-center" data-testid={testId}>
      <div
        className={
          tone === "ok"
            ? "bg-primary/10 text-primary mx-auto flex h-12 w-12 items-center justify-center rounded-full"
            : tone === "warn"
              ? "mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200"
              : "bg-muted text-muted-foreground mx-auto flex h-12 w-12 items-center justify-center rounded-full"
        }
        aria-hidden="true"
      >
        <span className="text-xl">
          {tone === "ok" ? "✓" : tone === "warn" ? "!" : "×"}
        </span>
      </div>
      <div role="status" aria-live="polite" className="space-y-2">
        <h2
          ref={headingRef}
          tabIndex={-1}
          className="font-display text-2xl font-medium outline-none"
        >
          {title}
        </h2>
        <p className="text-muted-foreground">{body}</p>
      </div>
      {retry && (
        <Button
          variant="outline"
          onClick={() => {
            setCode("");
            setPhase({ kind: "enter" });
          }}
        >
          {t("auth:deviceTryAnother")}
        </Button>
      )}
    </div>
  );

  let content: React.ReactNode;
  if (phase.kind === "enter") {
    content = enterForm(phase.error);
  } else if (phase.kind === "loading") {
    content = (
      <p
        role="status"
        aria-live="polite"
        className="text-muted-foreground py-8 text-center"
      >
        {t("auth:deviceChecking")}
      </p>
    );
  } else {
    const { view, busy } = phase;
    switch (view.state) {
      case "approved":
        content = result(
          t("auth:deviceApprovedTitle"),
          t("auth:deviceApprovedBody"),
          "ok",
          "device-approved",
          false
        );
        break;
      case "denied":
        content = result(
          t("auth:deviceDeniedTitle"),
          t("auth:deviceDeniedBody"),
          "neutral",
          "device-denied",
          false
        );
        break;
      case "expired":
        content = result(
          t("auth:deviceExpiredTitle"),
          t("auth:deviceExpiredBody"),
          "warn",
          "device-expired",
          true
        );
        break;
      case "invalid":
        content = result(
          t("auth:deviceInvalidTitle"),
          t("auth:deviceInvalidBody"),
          "warn",
          "device-invalid",
          true
        );
        break;
      default:
        content = (
          <div className="space-y-6" data-testid="device-pending">
            <div className="space-y-2 text-center">
              <h2
                ref={headingRef}
                tabIndex={-1}
                className="font-display text-lg font-medium outline-none"
              >
                {t("auth:deviceConfirmTitle", {
                  client: view.clientName ?? t("auth:deviceUnknownClient"),
                })}
              </h2>
              <p className="text-muted-foreground text-sm">
                {t("auth:deviceMatchCode")}
              </p>
              <p
                className="text-foreground font-mono text-3xl font-medium tracking-[0.25em]"
                data-testid="device-user-code"
              >
                {view.userCode}
              </p>
            </div>

            <dl className="border-border divide-border divide-y rounded-lg border text-sm">
              <div className="flex justify-between gap-4 px-4 py-3">
                <dt className="text-muted-foreground">
                  {t("auth:deviceApplication")}
                </dt>
                <dd className="text-right font-medium">
                  {view.clientName ?? view.clientId}
                </dd>
              </div>
              <div className="flex justify-between gap-4 px-4 py-3">
                <dt className="text-muted-foreground">
                  {t("auth:deviceAccess")}
                </dt>
                <dd className="text-right font-medium">
                  {scopeLabel(view.scope)}
                </dd>
              </div>
              {view.userAgent && (
                <div className="flex justify-between gap-4 px-4 py-3">
                  <dt className="text-muted-foreground">
                    {t("auth:deviceFrom")}
                  </dt>
                  <dd className="text-right font-mono text-xs break-all">
                    {view.userAgent}
                  </dd>
                </div>
              )}
              {view.createdAt && (
                <div className="flex justify-between gap-4 px-4 py-3">
                  <dt className="text-muted-foreground">
                    {t("auth:deviceRequestedAt")}
                  </dt>
                  <dd className="text-right">{dateFmt(view.createdAt)}</dd>
                </div>
              )}
            </dl>

            {email && (
              <p className="text-muted-foreground text-center text-sm">
                {t("auth:deviceSignedInAs", { email })}
              </p>
            )}

            <p className="text-muted-foreground text-sm">
              {t("auth:deviceWarning")}
            </p>

            <div className="flex gap-3">
              <Button
                variant="outline"
                size="lg"
                className="flex-1"
                disabled={busy !== undefined}
                onClick={() => void onDecide(false)}
                data-testid="device-deny"
              >
                {busy === "deny"
                  ? t("auth:deviceDenying")
                  : t("auth:deviceDeny")}
              </Button>
              <Button
                size="lg"
                className="flex-1"
                disabled={busy !== undefined}
                onClick={() => void onDecide(true)}
                data-testid="device-approve"
              >
                {busy === "approve"
                  ? t("auth:deviceApproving")
                  : t("auth:deviceApprove")}
              </Button>
            </div>
          </div>
        );
    }
  }

  return (
    <Card
      className="animate-fade-in relative w-full max-w-md"
      id="main-content"
    >
      <CardHeader className="space-y-4 text-center">
        <div className="bg-primary/10 mx-auto flex h-16 w-16 items-center justify-center rounded-full">
          <DeviceIcon />
        </div>
        <div>
          <CardTitle className="text-3xl">{t("auth:deviceTitle")}</CardTitle>
          <CardDescription className="mt-2 text-base">
            {t("auth:deviceDescription")}
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent>{content}</CardContent>
    </Card>
  );
}
