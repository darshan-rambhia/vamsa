/**
 * Trusted proxy validation to prevent IP spoofing
 *
 * Validates that proxy headers only come from trusted sources.
 * This prevents attackers from spoofing their IP address to bypass rate limiting.
 *
 * Configuration via TRUSTED_PROXIES environment variable:
 * - Comma-separated list of IPs, CIDRs, and aliases
 * - Aliases: "loopback" (127.0.0.0/8 + ::1), "docker" (172.16.0.0/12 + 10.0.0.0/8 + 192.168.0.0/16)
 * - "linklocal" (169.254.0.0/16 + fe80::/10), "cloudflare" (Cloudflare IP ranges)
 * - Empty = trust nothing (safest default, no proxy headers used)
 *
 * Examples:
 *   TRUSTED_PROXIES="127.0.0.1,::1"           # Localhost only
 *   TRUSTED_PROXIES="loopback,docker"         # Loopback and Docker subnets
 *   TRUSTED_PROXIES="cloudflare"              # Cloudflare only
 *   TRUSTED_PROXIES="10.0.0.0/8,172.16.0.0/12" # Custom CIDR ranges
 */

import { loggers } from "@vamsa/lib/logger";
import type { Context } from "hono";

const log = loggers.api;

// Cloudflare IP ranges (current as of 2025)
// https://www.cloudflare.com/ips/
const CLOUDFLARE_IPV4_RANGES = [
  "173.245.48.0/20",
  "103.21.244.0/22",
  "103.22.200.0/22",
  "103.31.4.0/22",
  "141.101.64.0/18",
  "108.162.192.0/18",
  "190.93.240.0/20",
  "188.114.96.0/20",
  "197.234.240.0/22",
  "198.41.128.0/17",
  "162.158.0.0/15",
  "104.16.0.0/13",
  "104.24.0.0/14",
  "172.64.0.0/13",
  "131.0.72.0/22",
];

const CLOUDFLARE_IPV6_RANGES = [
  "2400:cb00::/32",
  "2606:4700::/32",
  "2803:f800::/32",
  "2405:b500::/32",
  "2405:8100::/32",
  "2a06:98c0::/29",
  "2c0f:f248::/32",
];

interface CIDRRange {
  ip: string;
  prefix: number;
  isIPv6: boolean;
}

interface TrustedProxyConfig {
  ipv4Ranges: Array<CIDRRange>;
  ipv6Ranges: Array<CIDRRange>;
  isCloudflare: boolean;
}

let trustedProxyConfig: TrustedProxyConfig | null = null;

/**
 * Parse CIDR notation to { ip, prefix }
 */
function parseCIDR(cidr: string): CIDRRange | null {
  const [ip, prefixStr] = cidr.split("/");
  const prefix = prefixStr ? parseInt(prefixStr, 10) : -1;

  const version = getIPVersion(ip);
  if (version === 4) {
    return {
      ip: ip.trim(),
      prefix: prefix === -1 ? 32 : prefix,
      isIPv6: false,
    };
  } else if (version === 6) {
    return {
      ip: ip.trim(),
      prefix: prefix === -1 ? 128 : prefix,
      isIPv6: true,
    };
  }

  return null;
}

/**
 * Detect IP version (4 or 6, or 0 if invalid)
 */
function getIPVersion(ip: string): 4 | 6 | 0 {
  // IPv6 check: contains colons
  if (ip.includes(":")) {
    return 6;
  }

  // IPv4 check: contains dots and valid octets
  if (ip.includes(".")) {
    const parts = ip.split(".");
    if (parts.length === 4) {
      return parts.every((part) => {
        const num = parseInt(part, 10);
        return num >= 0 && num <= 255;
      })
        ? 4
        : 0;
    }
  }

  return 0;
}

/**
 * Expand IPv6 address to full form
 */
function expandIPv6(ip: string): string {
  // Remove leading zeros in each group
  let expanded = ip;

  // Handle :: compression
  if (ip.includes("::")) {
    const [left, right] = ip.split("::");
    const leftGroups = left ? left.split(":") : [];
    const rightGroups = right ? right.split(":") : [];
    const missingGroups = 8 - leftGroups.length - rightGroups.length;

    const groups = [
      ...leftGroups,
      ...Array(Math.max(0, missingGroups)).fill("0000"),
      ...rightGroups,
    ];

    expanded = groups.map((g) => g.padStart(4, "0")).join(":");
  } else {
    expanded = ip
      .split(":")
      .map((g) => g.padStart(4, "0"))
      .join(":");
  }

  return expanded.toLowerCase();
}

/**
 * Convert IPv6 address string to hex number array for comparison
 */
function ipv6ToHex(ip: string): string {
  const expanded = expandIPv6(ip);
  const groups = expanded.split(":");
  return groups.join("");
}

/**
 * Convert IPv4 address to number for bit arithmetic
 */
function ipv4ToNumber(ip: string): number {
  const parts = ip.split(".");
  if (parts.length !== 4) return 0;

  let num = 0;
  for (let i = 0; i < 4; i++) {
    const octet = parseInt(parts[i], 10);
    if (octet < 0 || octet > 255) return 0;
    num = (num << 8) | octet;
  }
  return num >>> 0; // Convert to unsigned 32-bit
}

/**
 * Check if IPv4 is in CIDR range
 */
function isIPv4InRange(ip: string, range: CIDRRange): boolean {
  if (range.isIPv6) return false;

  const ipNum = ipv4ToNumber(ip);
  const rangeNum = ipv4ToNumber(range.ip);

  if (ipNum === 0 || rangeNum === 0) return false;

  // Create mask: for /24, mask = 0xFFFFFF00
  const mask =
    range.prefix === 0 ? 0 : (0xffffffff << (32 - range.prefix)) >>> 0;

  return (ipNum & mask) === (rangeNum & mask);
}

/**
 * Check if IPv6 is in CIDR range
 */
function isIPv6InRange(ip: string, range: CIDRRange): boolean {
  if (!range.isIPv6) return false;

  const ipHex = ipv6ToHex(ip);
  const rangeHex = ipv6ToHex(range.ip);

  if (ipHex.length !== 32 || rangeHex.length !== 32) return false;

  // Compare prefix bits
  const prefixHexLength = Math.ceil(range.prefix / 4);
  const ipPrefix = ipHex.substring(0, prefixHexLength);
  const rangePrefix = rangeHex.substring(0, prefixHexLength);

  // Handle partial hex digit at the end
  if (range.prefix % 4 !== 0) {
    const bitsToCheck = range.prefix % 4;
    const ipChar = ipHex[prefixHexLength - 1];
    const rangeChar = rangeHex[prefixHexLength - 1];

    const ipVal = parseInt(ipChar, 16) >> (4 - bitsToCheck);
    const rangeVal = parseInt(rangeChar, 16) >> (4 - bitsToCheck);

    return (
      ipPrefix.substring(0, prefixHexLength - 1) ===
        rangePrefix.substring(0, prefixHexLength - 1) && ipVal === rangeVal
    );
  }

  return ipPrefix === rangePrefix;
}

/**
 * Check if IP is in any of the given ranges
 */
function isIPInRanges(ip: string, ranges: Array<CIDRRange>): boolean {
  const version = getIPVersion(ip);
  if (version === 0) return false;

  return ranges.some((range) => {
    if (version === 4 && !range.isIPv6) {
      return isIPv4InRange(ip, range);
    }
    if (version === 6 && range.isIPv6) {
      return isIPv6InRange(ip, range);
    }
    return false;
  });
}

/**
 * Initialize trusted proxy configuration from environment
 */
export function initTrustedProxies(): void {
  const trustedProxiesEnv = (process.env.TRUSTED_PROXIES || "").trim();

  if (!trustedProxiesEnv) {
    trustedProxyConfig = {
      ipv4Ranges: [],
      ipv6Ranges: [],
      isCloudflare: false,
    };
    log.info({}, "Trusted proxies: disabled (TRUSTED_PROXIES not set)");
    return;
  }

  const parts = trustedProxiesEnv.split(",").map((p) => p.trim());
  const ipv4Ranges: Array<CIDRRange> = [];
  const ipv6Ranges: Array<CIDRRange> = [];
  let isCloudflare = false;

  for (const part of parts) {
    if (part === "loopback") {
      // 127.0.0.0/8, ::1
      const loopbackV4 = parseCIDR("127.0.0.0/8");
      if (loopbackV4) ipv4Ranges.push(loopbackV4);

      const loopbackV6 = parseCIDR("::1/128");
      if (loopbackV6) ipv6Ranges.push(loopbackV6);
    } else if (part === "docker") {
      // Docker default subnets
      const dockerRanges = [
        "172.16.0.0/12", // Docker bridge
        "10.0.0.0/8", // Docker user-defined networks
        "192.168.0.0/16", // Docker compose default
      ];
      for (const range of dockerRanges) {
        const parsed = parseCIDR(range);
        if (parsed) {
          if (parsed.isIPv6) {
            ipv6Ranges.push(parsed);
          } else {
            ipv4Ranges.push(parsed);
          }
        }
      }
    } else if (part === "linklocal") {
      // Link-local ranges
      const linkLocalV4 = parseCIDR("169.254.0.0/16");
      if (linkLocalV4) ipv4Ranges.push(linkLocalV4);

      const linkLocalV6 = parseCIDR("fe80::/10");
      if (linkLocalV6) ipv6Ranges.push(linkLocalV6);
    } else if (part === "cloudflare") {
      isCloudflare = true;

      // Add Cloudflare IP ranges
      for (const range of CLOUDFLARE_IPV4_RANGES) {
        const parsed = parseCIDR(range);
        if (parsed) ipv4Ranges.push(parsed);
      }

      for (const range of CLOUDFLARE_IPV6_RANGES) {
        const parsed = parseCIDR(range);
        if (parsed) ipv6Ranges.push(parsed);
      }
    } else {
      // Try to parse as IP or CIDR
      const parsed = parseCIDR(part);
      if (parsed) {
        if (parsed.isIPv6) {
          ipv6Ranges.push(parsed);
        } else {
          ipv4Ranges.push(parsed);
        }
      } else {
        log.warn({ input: part }, "Invalid trusted proxy entry");
      }
    }
  }

  trustedProxyConfig = {
    ipv4Ranges,
    ipv6Ranges,
    isCloudflare,
  };

  log.info(
    {
      proxies: trustedProxiesEnv,
      ipv4Count: ipv4Ranges.length,
      ipv6Count: ipv6Ranges.length,
    },
    "Trusted proxies initialized"
  );
}

/**
 * Resolve the client IP address from a request
 *
 * @param remoteAddr - The remote address from the connection (socket IP)
 * @param headers - Request headers object
 * @returns Resolved client IP address
 */
export function resolveClientIP(
  remoteAddr: string,
  headers: Record<string, string | Array<string> | undefined>
): string {
  if (!trustedProxyConfig) {
    return remoteAddr;
  }

  // If no trusted proxies are configured, don't trust any proxy headers
  if (
    trustedProxyConfig.ipv4Ranges.length === 0 &&
    trustedProxyConfig.ipv6Ranges.length === 0 &&
    !trustedProxyConfig.isCloudflare
  ) {
    return remoteAddr;
  }

  // Check if remoteAddr is from a trusted proxy
  const isTrustedProxy = isIPInRanges(remoteAddr, [
    ...trustedProxyConfig.ipv4Ranges,
    ...trustedProxyConfig.ipv6Ranges,
  ]);

  if (!isTrustedProxy) {
    return remoteAddr;
  }

  // If Cloudflare is trusted and remoteAddr is in CF ranges, use CF-Connecting-IP
  if (trustedProxyConfig.isCloudflare) {
    const cfConnectingIP = normalizeHeaderValue(
      headers["cf-connecting-ip"] || headers["CF-Connecting-IP"]
    );
    if (cfConnectingIP && getIPVersion(cfConnectingIP) > 0) {
      return cfConnectingIP;
    }
  }

  // Use rightmost-untrusted algorithm on X-Forwarded-For
  const xForwardedFor = normalizeHeaderValue(
    headers["x-forwarded-for"] || headers["X-Forwarded-For"]
  );
  if (xForwardedFor) {
    const ips = xForwardedFor.split(",").map((ip) => ip.trim());

    // Walk from right to left, skipping trusted proxy IPs
    for (let i = ips.length - 1; i >= 0; i--) {
      const ip = ips[i];

      if (!ip || getIPVersion(ip) === 0) continue;

      // Check if this IP is a trusted proxy
      const isTrustedIP = isIPInRanges(ip, [
        ...trustedProxyConfig.ipv4Ranges,
        ...trustedProxyConfig.ipv6Ranges,
      ]);

      // First non-trusted IP is the client
      if (!isTrustedIP) {
        return ip;
      }
    }
  }

  // Fallback to X-Real-IP
  const xRealIP = normalizeHeaderValue(
    headers["x-real-ip"] || headers["X-Real-IP"]
  );
  if (xRealIP && getIPVersion(xRealIP) > 0) {
    return xRealIP;
  }

  // Final fallback to remote address
  return remoteAddr;
}

/**
 * Normalize header value (handle both string and Array<string> from Hono)
 */
function normalizeHeaderValue(
  value: string | Array<string> | undefined
): string | null {
  if (!value) return null;
  if (Array.isArray(value)) {
    return value[0] || null;
  }
  return value || null;
}

/**
 * Middleware for resolving client IP based on trusted proxies
 */
export function trustedProxyMiddleware() {
  return async (c: Context, next: () => Promise<void>) => {
    // Try to get real connection info from Hono (only works in Bun)
    try {
      const { getConnInfo } = await import("hono/bun");
      const info = getConnInfo(c);
      if (info?.remote?.address) {
        const remoteAddr = info.remote.address;
        const headers: Record<string, string | Array<string> | undefined> = {};

        // Convert Hono headers to our format
        const honoHeaders = c.req.header();
        for (const [key, value] of Object.entries(honoHeaders)) {
          headers[key.toLowerCase()] = value;
        }

        const clientIP = resolveClientIP(remoteAddr, headers);
        c.req.raw.headers.set("x-vamsa-client-ip", clientIP);
      }
    } catch {
      // Fallback if getConnInfo is not available
      const clientIP = resolveClientIP("unknown", {});
      c.req.raw.headers.set("x-vamsa-client-ip", clientIP);
    }

    return next();
  };
}
