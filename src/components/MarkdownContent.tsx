import { useEffect, useState } from "react";
import { renderMarkdown } from "@/lib/markdown";
import { cn } from "@/lib/utils";

interface MarkdownContentProps {
  content: string;
  className?: string;
}

export function MarkdownContent({ content, className }: MarkdownContentProps) {
  const [html, setHtml] = useState<string>("");

  useEffect(() => {
    let mounted = true;

    async function render() {
      const renderedHtml = await renderMarkdown(content);
      if (mounted) {
        setHtml(renderedHtml);
      }
    }

    render();

    return () => {
      mounted = false;
    };
  }, [content]);

  // If content is empty, render nothing
  if (!content) return null;

  return (
    <div 
      className={cn("markdown-content", className)}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
