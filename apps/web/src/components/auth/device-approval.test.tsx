import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { DeviceApproval } from "./device-approval";
import type { DeviceRequestView } from "~/server/device";

const pending: DeviceRequestView = {
  state: "pending",
  userCode: "ABCD-EFGH",
  clientId: "vamsa-cli",
  clientName: "Vamsa CLI",
  scope: "write",
  userAgent: "vamsa-cli/0.2.0 (darwin; laptop)",
  createdAt: "2026-01-01T10:00:00.000Z",
  expiresAt: "2026-01-01T10:10:00.000Z",
};

function setup(
  opts: {
    initialCode?: string;
    view?: DeviceRequestView;
    decision?: DeviceRequestView;
  } = {}
) {
  const load = vi.fn(async () => opts.view ?? pending);
  const decide = vi.fn(
    async (_code: string, approve: boolean): Promise<DeviceRequestView> =>
      opts.decision ?? {
        state: approve ? "approved" : "denied",
        userCode: "ABCD-EFGH",
      }
  );
  render(
    <DeviceApproval
      initialCode={opts.initialCode}
      email="me@example.com"
      load={load}
      decide={decide}
    />
  );
  return { load, decide };
}

describe("DeviceApproval", () => {
  it("never approves or denies without a click", async () => {
    const { decide } = setup({ initialCode: "ABCDEFGH" });
    const view = await screen.findByTestId("device-pending");
    // Enter on the focused heading / anywhere in the view is not a decision
    fireEvent.keyDown(document.activeElement ?? view, { key: "Enter" });
    fireEvent.keyDown(view, { key: "Enter" });
    expect(view.querySelector("form")).toBeNull();
    expect(screen.getByTestId("device-approve").getAttribute("type")).not.toBe(
      "submit"
    );
    await new Promise((r) => setTimeout(r, 20));
    expect(decide).not.toHaveBeenCalled();
  });

  it("prefilled code: shows who is asking, with the code to compare", async () => {
    const { load } = setup({ initialCode: "abcdefgh" });
    expect(load).toHaveBeenCalledWith("abcdefgh");
    await screen.findByTestId("device-pending");
    expect(screen.getByTestId("device-user-code").textContent).toBe(
      "ABCD-EFGH"
    );
    expect(
      screen.getByText("Vamsa CLI wants to use your account")
    ).toBeTruthy();
    expect(screen.getByText("View and edit")).toBeTruthy();
    expect(screen.getByText(pending.userAgent!)).toBeTruthy();
    expect(screen.getByText("Signed in as me@example.com")).toBeTruthy();
  });

  it("no code: formats typed input and submits only a full code", async () => {
    const { load } = setup();
    const input = screen.getByTestId<HTMLInputElement>("device-code-input");
    const submit = screen.getByTestId<HTMLButtonElement>("device-code-submit");
    fireEvent.change(input, { target: { value: "abcd" } });
    expect(submit.disabled).toBe(true);
    fireEvent.change(input, { target: { value: "abcdefgh" } });
    expect(input.value).toBe("ABCD-EFGH");
    fireEvent.click(submit);
    await screen.findByTestId("device-pending");
    expect(load).toHaveBeenCalledWith("ABCD-EFGH");
  });

  it("approve shows the success state", async () => {
    const { decide } = setup({ initialCode: "ABCDEFGH" });
    fireEvent.click(await screen.findByTestId("device-approve"));
    await screen.findByTestId("device-approved");
    expect(decide).toHaveBeenCalledWith("ABCD-EFGH", true);
    expect(screen.getByText("Device connected")).toBeTruthy();
  });

  it("deny shows the denied state", async () => {
    const { decide } = setup({ initialCode: "ABCDEFGH" });
    fireEvent.click(await screen.findByTestId("device-deny"));
    await screen.findByTestId("device-denied");
    expect(decide).toHaveBeenCalledWith("ABCD-EFGH", false);
  });

  it("expired code offers to enter another", async () => {
    setup({
      initialCode: "ABCDEFGH",
      view: { state: "expired", userCode: "ABCD-EFGH" },
    });
    await screen.findByTestId("device-expired");
    fireEvent.click(screen.getByText("Enter a different code"));
    expect(screen.getByTestId("device-code-form")).toBeTruthy();
  });

  it("approving a code that expired meanwhile shows expired", async () => {
    setup({
      initialCode: "ABCDEFGH",
      decision: { state: "expired", userCode: "ABCD-EFGH" },
    });
    fireEvent.click(await screen.findByTestId("device-approve"));
    await screen.findByTestId("device-expired");
  });

  it("unknown code shows not found", async () => {
    setup({
      initialCode: "ZZZZZZZZ",
      view: { state: "invalid", userCode: "ZZZZ-ZZZZ" },
    });
    await screen.findByTestId("device-invalid");
  });

  it("a failed lookup returns to the form with an alert", async () => {
    const load = vi.fn(async () => {
      throw new Error("network");
    });
    render(
      <DeviceApproval initialCode="ABCDEFGH" load={load} decide={vi.fn()} />
    );
    await waitFor(() => expect(screen.getByRole("alert")).toBeTruthy());
  });
});
