import type { MessageWithAttachments } from "@/types";
import { cn } from "@/lib/utils";
import { FileIcon } from "lucide-react";

interface MessageReferencePreviewProps {
  message: MessageWithAttachments | null;
  onJumpTo?: (messageId: string) => void;
  onRemove?: () => void;  // For composer preview
  className?: string;
}

export function MessageReferencePreview({ 
  message, 
  onJumpTo,
  onRemove,
  className 
}: MessageReferencePreviewProps) {
  if (!message) {
    return (
      <div className={cn(
        "flex items-center gap-2 px-3 py-2 text-sm",
        "border-l-2 border-muted-foreground/50",
        "bg-muted/50 rounded-r",
        "text-muted-foreground italic",
        className
      )}>
        <span>↩</span>
        <span>[Deleted message]</span>
      </div>
    );
  }

  const truncatedBody = message.body.length > 100 
    ? message.body.substring(0, 100) + "..." 
    : message.body;

  const hasImage = message.attachments?.some(
    att => att.content_type?.startsWith("image/")
  );
  
  const hasFile = !hasImage && message.attachments?.length > 0;

  const content = (
    <>
      <span className="text-primary mt-0.5 flex-shrink-0">↩</span>
      {hasImage && (
        <div className="w-8 h-8 rounded overflow-hidden flex-shrink-0 bg-accent flex items-center justify-center">
          <span className="text-[10px] text-muted-foreground font-medium">IMG</span>
        </div>
      )}
      {hasFile && (
        <div className="w-8 h-8 rounded overflow-hidden flex-shrink-0 bg-accent flex items-center justify-center">
            <FileIcon className="h-4 w-4 text-muted-foreground" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="text-foreground/80 line-clamp-2 text-sm">
          {truncatedBody || (hasImage || hasFile ? <span className="italic text-muted-foreground">Attachment</span> : "[No text]")}
        </div>
      </div>
    </>
  );

  if (onRemove) {
    // Non-clickable version for composer (wrapper handles interactions if needed, usually passed as children or separate)
    // But here we just return the content styled as a box. The removal button is usually outside.
    // Actually, based on plan, this component is used inside a container that has the X button.
    // So we just render the preview part.
    return (
      <div className={cn(
        "flex items-start gap-2 px-3 py-2",
        "border-l-2 border-primary bg-muted/50 rounded-r",
        className
      )}>
        {content}
      </div>
    );
  }

  // Clickable version for message display
  return (
    <button
      onClick={(e) => {
        e.stopPropagation(); // Prevent triggering parent message interactions
        onJumpTo?.(message.id);
      }}
      className={cn(
        "w-full flex items-start gap-2 px-3 py-2 mb-2 text-left",
        "border-l-2 border-primary",
        "bg-muted/50 rounded-r",
        "hover:bg-muted transition-colors cursor-pointer",
        className
      )}
    >
      {content}
    </button>
  );
}
