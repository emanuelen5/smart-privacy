/** Shared utility functions used across multiple extension scripts. */

/**
 * Extract the hostname from an HTTP/HTTPS URL.
 * Returns null for non-web URLs, invalid URLs, or nullish input.
 */
export function getDomain(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return parsed.hostname;
    }
  } catch {
    // ignore invalid URLs
  }
  return null;
}

/**
 * Returns true if the value is a plausible web-accessible hostname.
 * Accepts FQDNs, IPv4 addresses, and 'localhost'.
 */
export function isValidDomain(value: string): boolean {
  const v = value.trim();
  return (
    /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/.test(v) ||
    /^(?:\d{1,3}\.){3}\d{1,3}$/.test(v) ||
    v === 'localhost'
  );
}
