import { describe, it, expect } from 'vitest';
import { getDomain, isValidDomain } from '../utils.js';

// ---------------------------------------------------------------------------
// getDomain
// ---------------------------------------------------------------------------

describe('getDomain', () => {
  it('returns the hostname for an http URL', () => {
    expect(getDomain('http://example.com/path?q=1')).toBe('example.com');
  });

  it('returns the hostname for an https URL', () => {
    expect(getDomain('https://sub.domain.org/page')).toBe('sub.domain.org');
  });

  it('returns null for a non-http(s) URL (ftp)', () => {
    expect(getDomain('ftp://files.example.com')).toBeNull();
  });

  it('returns null for a chrome-extension URL', () => {
    expect(getDomain('chrome-extension://abcdef/popup.html')).toBeNull();
  });

  it('returns null for an invalid URL string', () => {
    expect(getDomain('not a url at all')).toBeNull();
  });

  it('returns null for an empty string', () => {
    expect(getDomain('')).toBeNull();
  });

  it('returns null for null', () => {
    expect(getDomain(null)).toBeNull();
  });

  it('returns null for undefined', () => {
    expect(getDomain(undefined)).toBeNull();
  });

  it('handles URLs with ports', () => {
    expect(getDomain('http://localhost:3000/app')).toBe('localhost');
  });

  it('handles URLs with credentials', () => {
    expect(getDomain('https://user:pass@example.com/')).toBe('example.com');
  });
});

// ---------------------------------------------------------------------------
// isValidDomain
// ---------------------------------------------------------------------------

describe('isValidDomain', () => {
  // Valid FQDNs
  it('accepts a basic two-part domain', () => {
    expect(isValidDomain('example.com')).toBe(true);
  });

  it('accepts a subdomain', () => {
    expect(isValidDomain('sub.example.co.uk')).toBe(true);
  });

  it('accepts a domain with hyphens', () => {
    expect(isValidDomain('my-site.example.com')).toBe(true);
  });

  // Localhost
  it('accepts localhost', () => {
    expect(isValidDomain('localhost')).toBe(true);
  });

  // IPv4 addresses
  it('accepts a valid IPv4 address', () => {
    expect(isValidDomain('192.168.1.1')).toBe(true);
  });

  it('accepts 127.0.0.1', () => {
    expect(isValidDomain('127.0.0.1')).toBe(true);
  });

  // Invalid values
  it('rejects an empty string', () => {
    expect(isValidDomain('')).toBe(false);
  });

  it('rejects a full URL (includes protocol)', () => {
    expect(isValidDomain('https://example.com')).toBe(false);
  });

  it('rejects a domain with a path', () => {
    expect(isValidDomain('example.com/path')).toBe(false);
  });

  it('rejects a string with spaces', () => {
    expect(isValidDomain('exam ple.com')).toBe(false);
  });

  it('accepts a domain with leading/trailing whitespace (trimmed internally)', () => {
    expect(isValidDomain('  example.com  ')).toBe(true);
  });

  it('rejects a single label (no TLD)', () => {
    expect(isValidDomain('example')).toBe(false);
  });

  it('rejects a domain starting with a hyphen', () => {
    expect(isValidDomain('-invalid.com')).toBe(false);
  });
});
