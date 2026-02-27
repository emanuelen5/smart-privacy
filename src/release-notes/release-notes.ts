import { marked, Renderer } from 'marked';
import changelogContent from '../../CHANGELOG.md';

// Escape raw HTML blocks so that the bundled markdown content
// cannot inject arbitrary HTML even if the source file is tampered with.
const renderer = new Renderer();
renderer.html = ({ text }) => text.replace(/</g, '&lt;').replace(/>/g, '&gt;');
marked.use({ renderer });

// The changelog is split by two HTML comment markers:
//   <!-- releases -->   separates the preamble from the release sections
//   <!-- released -->   separates the [Unreleased] section from released versions
// The preamble is shown in a hover popover; only released versions are
// rendered in the main list.
const RELEASES_MARKER = '<!-- releases -->';
const RELEASED_MARKER = '<!-- released -->';

const releasesIdx = changelogContent.indexOf(RELEASES_MARKER);
const releasedIdx = changelogContent.indexOf(RELEASED_MARKER);

const preamble = releasesIdx > 0
  ? changelogContent.slice(changelogContent.indexOf('\n') + 1, releasesIdx).trim()
  : '';
const releasedOnly = releasedIdx > 0
  ? changelogContent.slice(releasedIdx + RELEASED_MARKER.length).trim()
  : changelogContent;

// Populate the info popover with the preamble text.
const popover = document.getElementById('info-popover');
if (popover && preamble) {
  const html = marked.parse(preamble) as string;
  const doc = new DOMParser().parseFromString(html, 'text/html');
  popover.append(...Array.from(doc.body.childNodes));
}

const el = document.getElementById('changelog');
if (el) {
  const html = marked.parse(releasedOnly) as string;
  const doc = new DOMParser().parseFromString(html, 'text/html');
  el.append(...Array.from(doc.body.childNodes));
}
