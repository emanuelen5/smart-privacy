import { marked, Renderer } from 'marked';
import changelogContent from '../../CHANGELOG.md';

// Escape raw HTML blocks so that the bundled markdown content
// cannot inject arbitrary HTML even if the source file is tampered with.
const renderer = new Renderer();
renderer.html = ({ text }) => text.replace(/</g, '&lt;').replace(/>/g, '&gt;');
marked.use({ renderer });

const el = document.getElementById('changelog');
if (el) {
  const html = marked.parse(changelogContent) as string;
  const doc = new DOMParser().parseFromString(html, 'text/html');
  el.append(...Array.from(doc.body.childNodes));
}
