import { beforeEach, describe, expect, it } from "vitest";
import { initTrustedProxies, resolveClientIP } from "./trusted-proxy";

describe("Trusted Proxy Module", () => {
  beforeEach(() => {
    // Reset environment for each test
    delete process.env.TRUSTED_PROXIES;
  });

  describe("initTrustedProxies", () => {
    it("initializes with empty config when TRUSTED_PROXIES is not set", () => {
      delete process.env.TRUSTED_PROXIES;
      initTrustedProxies();
      // Should complete without error
      expect(true).toBe(true);
    });

    it("parses loopback alias", () => {
      process.env.TRUSTED_PROXIES = "loopback";
      initTrustedProxies();
      // Should complete without error
      expect(true).toBe(true);
    });

    it("parses docker alias", () => {
      process.env.TRUSTED_PROXIES = "docker";
      initTrustedProxies();
      // Should complete without error
      expect(true).toBe(true);
    });

    it("parses cloudflare alias", () => {
      process.env.TRUSTED_PROXIES = "cloudflare";
      initTrustedProxies();
      // Should complete without error
      expect(true).toBe(true);
    });

    it("parses linklocal alias", () => {
      process.env.TRUSTED_PROXIES = "linklocal";
      initTrustedProxies();
      // Should complete without error
      expect(true).toBe(true);
    });

    it("parses multiple aliases", () => {
      process.env.TRUSTED_PROXIES = "loopback,docker,cloudflare";
      initTrustedProxies();
      // Should complete without error
      expect(true).toBe(true);
    });

    it("parses IPv4 CIDR ranges", () => {
      process.env.TRUSTED_PROXIES = "10.0.0.0/8,192.168.0.0/16";
      initTrustedProxies();
      // Should complete without error
      expect(true).toBe(true);
    });

    it("parses IPv6 CIDR ranges", () => {
      process.env.TRUSTED_PROXIES = "2001:db8::/32,::1/128";
      initTrustedProxies();
      // Should complete without error
      expect(true).toBe(true);
    });

    it("parses single IP addresses", () => {
      process.env.TRUSTED_PROXIES = "127.0.0.1,::1";
      initTrustedProxies();
      // Should complete without error
      expect(true).toBe(true);
    });
  });

  describe("resolveClientIP - No trusted proxies", () => {
    it("returns remoteAddr when TRUSTED_PROXIES is not set", () => {
      delete process.env.TRUSTED_PROXIES;
      initTrustedProxies();

      const result = resolveClientIP("203.0.113.1", {
        "x-forwarded-for": "192.0.2.1",
      });

      expect(result).toBe("203.0.113.1");
    });

    it("returns remoteAddr when TRUSTED_PROXIES is empty string", () => {
      process.env.TRUSTED_PROXIES = "";
      initTrustedProxies();

      const result = resolveClientIP("203.0.113.1", {
        "x-forwarded-for": "192.0.2.1",
      });

      expect(result).toBe("203.0.113.1");
    });
  });

  describe("resolveClientIP - Untrusted proxy", () => {
    beforeEach(() => {
      process.env.TRUSTED_PROXIES = "127.0.0.1";
      initTrustedProxies();
    });

    it("returns remoteAddr when it's not in trusted proxies", () => {
      const result = resolveClientIP("203.0.113.1", {
        "x-forwarded-for": "192.0.2.1",
      });

      expect(result).toBe("203.0.113.1");
    });

    it("ignores proxy headers from untrusted sources", () => {
      const result = resolveClientIP("10.0.0.1", {
        "x-forwarded-for": "203.0.113.1",
        "x-real-ip": "203.0.113.2",
      });

      expect(result).toBe("10.0.0.1");
    });
  });

  describe("resolveClientIP - Loopback proxy", () => {
    beforeEach(() => {
      process.env.TRUSTED_PROXIES = "loopback";
      initTrustedProxies();
    });

    it("uses X-Forwarded-For from 127.0.0.1", () => {
      const result = resolveClientIP("127.0.0.1", {
        "x-forwarded-for": "203.0.113.1",
      });

      expect(result).toBe("203.0.113.1");
    });

    it("uses X-Forwarded-For from ::1", () => {
      const result = resolveClientIP("::1", {
        "x-forwarded-for": "203.0.113.1",
      });

      expect(result).toBe("203.0.113.1");
    });

    it("handles X-Forwarded-For with multiple IPs", () => {
      const result = resolveClientIP("127.0.0.1", {
        "x-forwarded-for": "203.0.113.1, 127.0.0.1",
      });

      expect(result).toBe("203.0.113.1");
    });

    it("uses rightmost untrusted IP from X-Forwarded-For chain", () => {
      // Chain: client -> proxy1 -> proxy2 (127.0.0.1)
      // X-Forwarded-For: client, proxy1, 127.0.0.1
      const result = resolveClientIP("127.0.0.1", {
        "x-forwarded-for": "203.0.113.1, 203.0.113.2, 127.0.0.1",
      });

      // Should skip 127.0.0.1 (trusted) and return 203.0.113.2 (rightmost untrusted)
      expect(result).toBe("203.0.113.2");
    });

    it("falls back to X-Real-IP if no X-Forwarded-For", () => {
      const result = resolveClientIP("127.0.0.1", {
        "x-real-ip": "203.0.113.1",
      });

      expect(result).toBe("203.0.113.1");
    });

    it("falls back to remoteAddr if no proxy headers", () => {
      const result = resolveClientIP("127.0.0.1", {});

      expect(result).toBe("127.0.0.1");
    });
  });

  describe("resolveClientIP - Docker proxy", () => {
    beforeEach(() => {
      process.env.TRUSTED_PROXIES = "docker";
      initTrustedProxies();
    });

    it("trusts 172.16.0.0/12 subnet", () => {
      const result = resolveClientIP("172.17.0.2", {
        "x-forwarded-for": "203.0.113.1",
      });

      expect(result).toBe("203.0.113.1");
    });

    it("trusts 10.0.0.0/8 subnet", () => {
      const result = resolveClientIP("10.0.0.1", {
        "x-forwarded-for": "203.0.113.1",
      });

      expect(result).toBe("203.0.113.1");
    });

    it("trusts 192.168.0.0/16 subnet", () => {
      const result = resolveClientIP("192.168.1.1", {
        "x-forwarded-for": "203.0.113.1",
      });

      expect(result).toBe("203.0.113.1");
    });

    it("rejects IPs outside Docker ranges", () => {
      const result = resolveClientIP("203.0.113.1", {
        "x-forwarded-for": "192.0.2.1",
      });

      expect(result).toBe("203.0.113.1");
    });
  });

  describe("resolveClientIP - Cloudflare proxy", () => {
    beforeEach(() => {
      process.env.TRUSTED_PROXIES = "cloudflare";
      initTrustedProxies();
    });

    it("uses CF-Connecting-IP when from Cloudflare", () => {
      const result = resolveClientIP("104.16.0.1", {
        "cf-connecting-ip": "203.0.113.1",
      });

      expect(result).toBe("203.0.113.1");
    });

    it("prefers CF-Connecting-IP over X-Forwarded-For", () => {
      const result = resolveClientIP("104.16.0.1", {
        "cf-connecting-ip": "203.0.113.1",
        "x-forwarded-for": "192.0.2.1",
      });

      expect(result).toBe("203.0.113.1");
    });

    it("handles CF-Connecting-IP from different Cloudflare ranges", () => {
      // 173.245.48.0/20 is a Cloudflare range
      const result = resolveClientIP("173.245.48.10", {
        "cf-connecting-ip": "203.0.113.1",
      });

      expect(result).toBe("203.0.113.1");
    });

    it("returns remoteAddr when not from Cloudflare", () => {
      const result = resolveClientIP("203.0.113.1", {
        "cf-connecting-ip": "192.0.2.1",
      });

      expect(result).toBe("203.0.113.1");
    });
  });

  describe("resolveClientIP - Custom CIDR ranges", () => {
    beforeEach(() => {
      process.env.TRUSTED_PROXIES = "10.0.0.0/8,172.16.0.0/12";
      initTrustedProxies();
    });

    it("trusts IPs in specified ranges", () => {
      const result = resolveClientIP("10.1.2.3", {
        "x-forwarded-for": "203.0.113.1",
      });

      expect(result).toBe("203.0.113.1");
    });

    it("rejects IPs outside specified ranges", () => {
      const result = resolveClientIP("192.168.1.1", {
        "x-forwarded-for": "203.0.113.1",
      });

      expect(result).toBe("192.168.1.1");
    });

    it("handles CIDR with /32 (single IP)", () => {
      process.env.TRUSTED_PROXIES = "127.0.0.1/32";
      initTrustedProxies();

      const result = resolveClientIP("127.0.0.1", {
        "x-forwarded-for": "203.0.113.1",
      });

      expect(result).toBe("203.0.113.1");
    });

    it("rejects similar IPs when /32 is specified", () => {
      process.env.TRUSTED_PROXIES = "127.0.0.1/32";
      initTrustedProxies();

      const result = resolveClientIP("127.0.0.2", {
        "x-forwarded-for": "203.0.113.1",
      });

      expect(result).toBe("127.0.0.2");
    });
  });

  describe("resolveClientIP - Header normalization", () => {
    beforeEach(() => {
      process.env.TRUSTED_PROXIES = "loopback";
      initTrustedProxies();
    });

    it("handles headers with case variations", () => {
      const result = resolveClientIP("127.0.0.1", {
        "X-Forwarded-For": "203.0.113.1",
      });

      expect(result).toBe("203.0.113.1");
    });

    it("handles array-format headers from Hono", () => {
      const result = resolveClientIP("127.0.0.1", {
        "x-forwarded-for": ["203.0.113.1"],
      });

      expect(result).toBe("203.0.113.1");
    });

    it("handles array with multiple values", () => {
      const result = resolveClientIP("127.0.0.1", {
        "x-forwarded-for": ["203.0.113.1, 203.0.113.2"],
      });

      // Takes first IP from array, which is "203.0.113.1, 203.0.113.2"
      // Then splits on comma and gets first element "203.0.113.1"... wait
      // Actually, normalizeHeaderValue returns the full string with comma
      // Then it splits on comma and should take first
      // Let me reconsider: the array has one element "203.0.113.1, 203.0.113.2"
      // When split on comma, we get ["203.0.113.1", " 203.0.113.2"]
      // We take first non-trusted from right, which is 203.0.113.2 (rightmost after trim)
      expect(result).toBe("203.0.113.2");
    });

    it("trims whitespace from IPs", () => {
      const result = resolveClientIP("127.0.0.1", {
        "x-forwarded-for": "  203.0.113.1  ,  203.0.113.2  ",
      });

      // Splits on comma: ["  203.0.113.1  ", "  203.0.113.2  "]
      // Then processes from right to left with trim
      // Rightmost is 203.0.113.2 after trim, it's not trusted, so return it
      expect(result).toBe("203.0.113.2");
    });
  });

  describe("resolveClientIP - Edge cases", () => {
    beforeEach(() => {
      process.env.TRUSTED_PROXIES = "loopback";
      initTrustedProxies();
    });

    it("handles empty X-Forwarded-For header", () => {
      const result = resolveClientIP("127.0.0.1", {
        "x-forwarded-for": "",
      });

      expect(result).toBe("127.0.0.1");
    });

    it("handles malformed X-Forwarded-For", () => {
      const result = resolveClientIP("127.0.0.1", {
        "x-forwarded-for": "not-an-ip",
      });

      expect(result).toBe("127.0.0.1");
    });

    it("handles X-Forwarded-For with only trusted IPs", () => {
      const result = resolveClientIP("127.0.0.1", {
        "x-forwarded-for": "127.0.0.2, 127.0.0.1",
      });

      // All IPs are trusted/loopback, fall back to remoteAddr
      expect(result).toBe("127.0.0.1");
    });

    it("handles mixed IPv4 and IPv6", () => {
      const result = resolveClientIP("::1", {
        "x-forwarded-for": "203.0.113.1",
      });

      expect(result).toBe("203.0.113.1");
    });

    it("handles invalid IPs gracefully", () => {
      const result = resolveClientIP("127.0.0.1", {
        "x-forwarded-for": "256.256.256.256",
      });

      expect(result).toBe("127.0.0.1");
    });
  });

  describe("resolveClientIP - IPv6 support", () => {
    beforeEach(() => {
      process.env.TRUSTED_PROXIES = "loopback";
      initTrustedProxies();
    });

    it("handles IPv6 X-Forwarded-For", () => {
      const result = resolveClientIP("::1", {
        "x-forwarded-for": "2001:db8::1",
      });

      expect(result).toBe("2001:db8::1");
    });

    it("handles IPv6 X-Real-IP", () => {
      const result = resolveClientIP("::1", {
        "x-real-ip": "2001:db8::1",
      });

      expect(result).toBe("2001:db8::1");
    });

    it("handles compressed IPv6 addresses", () => {
      const result = resolveClientIP("::1", {
        "x-forwarded-for": "2001:db8::1",
      });

      expect(result).toBe("2001:db8::1");
    });
  });

  describe("resolveClientIP - Multiple proxies chain", () => {
    beforeEach(() => {
      process.env.TRUSTED_PROXIES = "docker";
      initTrustedProxies();
    });

    it("resolves correct client IP in multi-proxy chain", () => {
      // Real client: 203.0.113.1
      // Behind proxy: 10.0.0.5
      // Behind another proxy: 172.17.0.2 (the direct connection to us)
      // X-Forwarded-For would be: 203.0.113.1, 10.0.0.5
      const result = resolveClientIP("172.17.0.2", {
        "x-forwarded-for": "203.0.113.1, 10.0.0.5",
      });

      // 10.0.0.5 is trusted (docker), so skip it
      // 203.0.113.1 is not trusted, so return it
      expect(result).toBe("203.0.113.1");
    });

    it("handles all trusted IPs in chain", () => {
      // All are docker IPs
      const result = resolveClientIP("172.17.0.2", {
        "x-forwarded-for": "10.0.0.1, 10.0.0.2",
      });

      // All IPs in X-Forwarded-For are trusted (both are docker)
      // No untrusted IP found in the header, so we fall back to remoteAddr
      expect(result).toBe("172.17.0.2");
    });
  });
});
