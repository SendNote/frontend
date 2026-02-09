import type { MessageWithAttachments } from "@/types";
import { cn } from "@/lib/utils";

interface MessageReferenceBadgeProps {
  message: MessageWithAttachments | null;
  onJumpTo: (messageId: string) => void;
  className?: string;
}

export function MessageReferenceBadge({ 
  message, 
  onJumpTo,
  className 
}: MessageReferenceBadgeProps) {
  if (!message) {
    return (
      <span className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5",
        "text-xs rounded-full",
        "bg-muted text-muted-foreground italic cursor-not-allowed",
        className
      )}>
        <span>↩</span>
        <span>deleted</span>
      </span>
    );
  }

  // Format time as "12:45 PM"
  const timeLabel = new Intl.DateTimeFormat('default', { 
    hour: 'numeric', 
    minute: '2-digit'
  }).format(new Date(message.created_at));

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onJumpTo(message.id);
      }}
      title={message.body.substring(0, 200)}
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5",
        "text-xs rounded-full",
        "bg-primary/10 text-primary",
        "hover:bg-primary/20 transition-colors cursor-pointer",
        className
      )}
    >
      <span>↩</span>
      <span>{timeLabel}</span>
    </button>
  );
}
