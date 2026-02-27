import { describe, expect, it } from 'vitest';
import { parseChangelog } from '../release-notes/parse-changelog.js';

const SAMPLE_CHANGELOG = `# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]
<!-- releases -->

### Added
- A shiny new feature

<!-- released -->

## [1.1.0] - 2026-02-27

### Fixed
- Fixed a bug

## [1.0.0] - 2026-02-24

### Added
- Initial release
`;

describe('parseChangelog', () => {
  it('extracts the preamble (between title and ## [Unreleased])', () => {
    const { preamble } = parseChangelog(SAMPLE_CHANGELOG);
    expect(preamble).toContain('All notable changes');
    expect(preamble).toContain('Semantic Versioning');
    expect(preamble).not.toContain('# Changelog');
    expect(preamble).not.toContain('[Unreleased]');
  });

  it('extracts the unreleased content', () => {
    const { unreleased } = parseChangelog(SAMPLE_CHANGELOG);
    expect(unreleased).toContain('A shiny new feature');
    expect(unreleased).not.toContain('[Unreleased]');
    expect(unreleased).not.toContain('[1.1.0]');
  });

  it('extracts only released versions', () => {
    const { released } = parseChangelog(SAMPLE_CHANGELOG);
    expect(released).toContain('## [1.1.0]');
    expect(released).toContain('## [1.0.0]');
    expect(released).not.toContain('[Unreleased]');
    expect(released).not.toContain('A shiny new feature');
  });

  it('returns the full content as released when no markers exist', () => {
    const plain = '## [1.0.0]\n\n- Something\n';
    const { preamble, unreleased, released } = parseChangelog(plain);
    expect(preamble).toBe('');
    expect(unreleased).toBe('');
    expect(released).toBe(plain);
  });

  it('handles an empty unreleased section', () => {
    const changelog = `# Changelog

Preamble text.

## [Unreleased]
<!-- releases -->

<!-- released -->

## [1.0.0] - 2026-01-01

### Added
- Something
`;
    const { unreleased, released } = parseChangelog(changelog);
    expect(unreleased).toBe('');
    expect(released).toContain('## [1.0.0]');
  });
});
