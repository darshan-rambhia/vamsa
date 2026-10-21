import { mkdirSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { tempHome } from "../test-helpers";
import {
  configPath,
  loadConfig,
  normalizeUrl,
  resolveTarget,
  saveConfig,
} from "./config";

let home: string;

beforeEach(() => {
  home = tempHome();
});

describe("config file", () => {
  it("lives under ~/.config/vamsa by default and XDG_CONFIG_HOME when set", () => {
    expect(configPath({ HOME: home })).toBe(
      join(home, ".config", "vamsa", "config.json")
    );
    expect(configPath({ HOME: home, XDG_CONFIG_HOME: "/x" })).toBe(
      "/x/vamsa/config.json"
    );
  });

  it("returns an empty config when no file exists", () => {
    expect(loadConfig({ HOME: home })).toEqual({
      current: "default",
      profiles: {},
    });
  });

  it("round-trips profiles and writes the file with mode 0600", () => {
    const env = { HOME: home };
    saveConfig(
      {
        current: "work",
        profiles: {
          work: { url: "https://v.example", token: "vms_x", tokenType: "pat" },
        },
      },
      env
    );
    const mode = statSync(configPath(env)).mode & 0o777;
    expect(mode).toBe(0o600);
    expect(loadConfig(env).profiles.work.token).toBe("vms_x");
  });

  it("tightens permissions on an existing world-readable file", () => {
    const env = { HOME: home };
    const path = configPath(env);
    mkdirSync(join(home, ".config", "vamsa"), { recursive: true });
    writeFileSync(path, "{}", { mode: 0o644 });
    saveConfig({ current: "default", profiles: {} }, env);
    expect(statSync(path).mode & 0o777).toBe(0o600);
  });

  it("reports invalid JSON as a structured error", () => {
    const env = { HOME: home };
    mkdirSync(join(home, ".config", "vamsa"), { recursive: true });
    writeFileSync(configPath(env), "{nope");
    expect(() => loadConfig(env)).toThrow(/not valid JSON/);
  });
});

describe("resolveTarget", () => {
  const config = {
    current: "a",
    profiles: {
      a: {
        url: "http://a.test",
        token: "tok-a",
        tokenType: "session" as const,
      },
      b: { url: "http://b.test", token: "vms_b", tokenType: "pat" as const },
    },
  };

  it("uses the current profile by default", () => {
    const t = resolveTarget(config, {}, {});
    expect(t).toMatchObject({
      profileName: "a",
      url: "http://a.test",
      token: "tok-a",
      tokenSource: "profile",
    });
  });

  it("VAMSA_PROFILE picks a profile, --profile beats it", () => {
    expect(resolveTarget(config, {}, { VAMSA_PROFILE: "b" }).token).toBe(
      "vms_b"
    );
    expect(
      resolveTarget(config, { profile: "a" }, { VAMSA_PROFILE: "b" }).token
    ).toBe("tok-a");
  });

  it("VAMSA_URL and VAMSA_TOKEN override the profile; --url beats VAMSA_URL", () => {
    const t = resolveTarget(
      config,
      {},
      { VAMSA_URL: "http://env.test/", VAMSA_TOKEN: "vms_env" }
    );
    expect(t).toMatchObject({
      url: "http://env.test",
      token: "vms_env",
      tokenType: "pat",
      tokenSource: "env",
    });
    expect(
      resolveTarget(config, { url: "flag.test" }, { VAMSA_URL: "http://e" }).url
    ).toBe("http://flag.test");
  });

  it("falls back to localhost with no credential for unknown profiles", () => {
    const t = resolveTarget(config, { profile: "nope" }, {});
    expect(t).toMatchObject({
      url: "http://localhost:3000",
      token: undefined,
      tokenSource: "none",
    });
  });

  it("normalizes URLs", () => {
    expect(normalizeUrl("example.org/")).toBe("http://example.org");
    expect(normalizeUrl("https://x.org//")).toBe("https://x.org");
  });
});
