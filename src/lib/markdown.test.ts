import { expect, test, describe } from "bun:test";
import { renderMarkdown } from "./markdown";

describe("Markdown Rendering", () => {
  test("renders basic text", async () => {
    const input = "Hello world";
    const output = await renderMarkdown(input);
    expect(output).toContain("Hello world");
    expect(output).toContain("<p>Hello world</p>");
  });

  test("renders bold and italic", async () => {
    const input = "**Bold** and *Italic*";
    const output = await renderMarkdown(input);
    expect(output).toContain("<strong>Bold</strong>");
    expect(output).toContain("<em>Italic</em>");
  });

  test("renders headers", async () => {
    const input = "# Header 1";
    const output = await renderMarkdown(input);
    expect(output).toContain("<h1>Header 1</h1>");
  });

  test("renders links with target=_blank", async () => {
    const input = "[Link](https://example.com)";
    const output = await renderMarkdown(input);
    expect(output).toContain('<a href="https://example.com" target="_blank" rel="noopener noreferrer">Link</a>');
  });

  test("renders internal links without target=_blank", async () => {
    const input = "[Internal](#section)";
    const output = await renderMarkdown(input);
    expect(output).toContain('<a href="#section">Internal</a>');
  });

  test("renders code blocks with highlighting class", async () => {
    const input = "```javascript\nconsole.log('test');\n```";
    const output = await renderMarkdown(input);
    expect(output).toContain('<pre><code class="hljs language-javascript">');
    // Highlight.js splits text into spans, so we check for presence of spans
    expect(output).toContain('class="hljs-'); 
  });

  test("sanitizes dangerous HTML", async () => {
    const input = "<script>alert('xss')</script>";
    const output = await renderMarkdown(input);
    expect(output).not.toContain("<script>");
    expect(output).not.toContain("alert('xss')");
  });

  test("sanitizes dangerous attributes", async () => {
    const input = '<img src="x" onerror="alert(1)">';
    const output = await renderMarkdown(input);
    expect(output).toContain('<img src="x">');
    expect(output).not.toContain("onerror");
  });

  test("renders tables", async () => {
    const input = "| H1 | H2 |\n| -- | -- |\n| C1 | C2 |";
    const output = await renderMarkdown(input);
    expect(output).toContain("<table>");
    expect(output).toContain("<thead>");
    expect(output).toContain("<tbody>");
    expect(output).toContain("<td>C1</td>");
  });

  test("renders task lists", async () => {
    const input = "- [ ] Task 1\n- [x] Task 2";
    const output = await renderMarkdown(input);
    expect(output).toContain('type="checkbox"');
  });

  test("auto-links plain URLs", async () => {
    const input = "Check google.com for more info";
    const output = await renderMarkdown(input);
    expect(output).toContain('<a href="http://google.com" target="_blank" rel="noopener noreferrer">google.com</a>');
  });

  test("auto-links email addresses", async () => {
    const input = "Contact test@example.com";
    const output = await renderMarkdown(input);
    expect(output).toContain('<a href="mailto:test@example.com" target="_blank" rel="noopener noreferrer">test@example.com</a>');
  });

  test("fixes protocol-less links in markdown syntax", async () => {
    const input = "[Link](www.google.com)";
    const output = await renderMarkdown(input);
    expect(output).toContain('<a href="https://www.google.com" target="_blank" rel="noopener noreferrer">Link</a>');
  });
  
  test("fixes protocol-less domain-like links in markdown syntax", async () => {
    const input = "[Link](google.com)";
    const output = await renderMarkdown(input);
    expect(output).toContain('<a href="https://google.com" target="_blank" rel="noopener noreferrer">Link</a>');
  });
  
  test("preserves internal links without protocol fix", async () => {
    const input = "[Home](/home)";
    const output = await renderMarkdown(input);
    expect(output).toContain('<a href="/home">Home</a>');
  });
});
