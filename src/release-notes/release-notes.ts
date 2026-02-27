import { marked, Renderer } from 'marked';
import changelogContent from '../../CHANGELOG.md';
import { parseChangelog } from './parse-changelog.js';

// Escape raw HTML blocks so that the bundled markdown content
// cannot inject arbitrary HTML even if the source file is tampered with.
const renderer = new Renderer();
renderer.html = ({ text }) => text.replace(/</g, '&lt;').replace(/>/g, '&gt;');
marked.use({ renderer });

const { preamble, released: releasedOnly } = parseChangelog(changelogContent);

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
