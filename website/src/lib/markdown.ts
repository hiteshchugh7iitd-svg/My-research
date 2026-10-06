import { marked } from 'marked';
import DOMPurify from 'dompurify';

marked.setOptions({ gfm: true, breaks: true });

/** Renders Markdown written in the admin console into safe HTML. */
export function renderMarkdown(src: string | null | undefined): string {
  if (!src) return '';
  const html = marked.parse(src, { async: false }) as string;
  return DOMPurify.sanitize(html, { ADD_ATTR: ['target'] });
}
