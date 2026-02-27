/**
 * Parse a changelog that uses two HTML comment markers to delimit sections.
 *
 * The markers are:
 *   `<!-- releases -->`  — placed directly after the `## [Unreleased]` heading
 *   `<!-- released -->`  — placed before the first released version
 *
 * Everything before `## [Unreleased]` (minus the title) is the preamble.
 * Everything between `<!-- releases -->` and `<!-- released -->` is unreleased content.
 * Everything after `<!-- released -->` is released versions.
 */

export const RELEASES_MARKER = '<!-- releases -->';
export const RELEASED_MARKER = '<!-- released -->';

export interface ChangelogSections {
  /** Introductory text before ## [Unreleased] (title line stripped). */
  preamble: string;
  /** Content between <!-- releases --> and <!-- released -->. */
  unreleased: string;
  /** Released versions after <!-- released -->. */
  released: string;
}

export function parseChangelog(content: string): ChangelogSections {
  const releasesIdx = content.indexOf(RELEASES_MARKER);
  const releasedIdx = content.indexOf(RELEASED_MARKER);

  // Preamble: everything between the title line and ## [Unreleased].
  const unreleasedHeading = '## [Unreleased]';
  const headingIdx = content.indexOf(unreleasedHeading);
  const preamble = headingIdx > 0
    ? content.slice(content.indexOf('\n') + 1, headingIdx).trim()
    : '';

  const unreleased = releasesIdx >= 0 && releasedIdx > releasesIdx
    ? content.slice(releasesIdx + RELEASES_MARKER.length, releasedIdx).trim()
    : '';

  const released = releasedIdx >= 0
    ? content.slice(releasedIdx + RELEASED_MARKER.length).trim()
    : content;

  return { preamble, unreleased, released };
}
