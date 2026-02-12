import { marked } from "marked";
import DOMPurify from "dompurify";
import hljs from "highlight.js";
import markedLinkifyIt from "marked-linkify-it";

// Configure marked with GFM, syntax highlighting, and auto-linking
marked.use(markedLinkifyIt({}, { fuzzyLink: true, fuzzyEmail: true }));
marked.use({
  gfm: true,
  breaks: true, // Github-style line breaks
  pedantic: false,
});

// Configure renderer to add target="_blank" to links and handle code highlighting
const renderer = new marked.Renderer();

// Custom link renderer for security and smart URL handling
renderer.link = (
  { href, title, text }: { href: string; title?: string | null; text: string }
) => {
  let finalHref = href;
  const isInternal = href.startsWith("#") || href.startsWith("/");
  const hasProtocol = /^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(href);
  
  // Fix protocol-less URLs (e.g., "www.google.com" -> "https://www.google.com")
  if (!isInternal && !hasProtocol) {
    // If it looks like a domain (has a dot) or starts with www, treat as external
    // This prevents breaking genuine relative paths that might be used, but prioritizes UX for common "google.com" case
    if (href.includes(".") || href.startsWith("www")) {
       finalHref = `https://${href}`;
    }
  }

  // Ensure we don't break simple anchors or javascript links (though DOMPurify cleans those)
  // We strictly want target="_blank" for external links
  const isFinalInternal = finalHref.startsWith("#") || finalHref.startsWith("/");
  const targetAttr = isFinalInternal ? "" : ' target="_blank" rel="noopener noreferrer"';
  const titleAttr = title ? ` title="${title}"` : "";
  
  return `<a href="${finalHref}"${targetAttr}${titleAttr}>${text}</a>`;
};

// Custom code renderer for syntax highlighting
renderer.code = ({ text, lang, escaped }: { text: string; lang?: string; escaped?: boolean }) => {
  // Check if the language is valid and supported by highlight.js
  const validLang = !!(lang && hljs.getLanguage(lang));
  
  // Highlight the code
  const highlighted = validLang
    ? hljs.highlight(text, { language: lang }).value
    : hljs.highlightAuto(text).value;

  // If we couldn't highlight, use escaped text or simple text
  // marked already escapes text if we don't return anything, but we are returning HTML
  // so we must ensure content is safe if highlight.js didn't run (though highlightAuto usually runs)
  
  const languageClass = validLang ? `language-${lang}` : "language-plaintext";
  
  return `<pre><code class="hljs ${languageClass}">${highlighted}</code></pre>`;
};

marked.use({ renderer });

// Configure DOMPurify
// specific config to allow target="_blank" on links
DOMPurify.addHook("afterSanitizeAttributes", (node) => {
  // set all elements owning target to target=_blank
  if (node instanceof Element && node.tagName === "A") {
    const href = node.getAttribute("href") || "";
    const isInternal = href.startsWith("#") || href.startsWith("/");
    
    if (!isInternal) {
      node.setAttribute("target", "_blank");
      node.setAttribute("rel", "noopener noreferrer");
    } else {
        // Ensure internal links don't have target=_blank if they shouldn't
        node.removeAttribute("target");
        node.removeAttribute("rel");
    }
  }
});

const sanitizeOptions = {
  ALLOWED_TAGS: [
    "a", "b", "blockquote", "br", "code", "del", "div", "em", "h1", "h2", "h3", 
    "h4", "h5", "h6", "hr", "i", "img", "li", "ol", "p", "pre", "span", 
    "strong", "table", "tbody", "td", "th", "thead", "tr", "ul", "strike", "details", "summary"
  ],
  ALLOWED_ATTR: [
    "href", "name", "target", "rel", "src", "alt", "class", "title", "align"
  ],
  FORBID_TAGS: ["style", "script", "iframe", "form", "input", "textarea", "button"],
  FORBID_ATTR: ["style", "onerror", "onload", "onclick"],
};

export async function renderMarkdown(text: string): Promise<string> {
  if (!text) return "";

  try {
    // marked.parse is async by default in newer versions if async extensions are used, 
    // but usually sync. However, return type is string | Promise<string>. 
    // We await to be safe and consistent.
    const rawHtml = await marked.parse(text);
    return DOMPurify.sanitize(rawHtml, sanitizeOptions) as unknown as string;
  } catch (error) {
    console.error("Error rendering markdown:", error);
    // Fallback to safe plain text if rendering fails
    return DOMPurify.sanitize(text) as unknown as string; // Basic sanitization just in case
  }
}

// Synchronous version if needed (marked can be sync)
export function renderMarkdownSync(text: string): string {
  if (!text) return "";
  try {
    const rawHtml = marked.parse(text, { async: false }) as string;
    return DOMPurify.sanitize(rawHtml, sanitizeOptions) as unknown as string;
  } catch (error) {
    console.error("Error rendering markdown:", error);
    return text;
  }
}
