import { useState } from "react";
import { MessageReferencePreview } from "@/components/MessageReferencePreview";
import type { MessageWithReferences } from "@/types";
import { cn } from "@/lib/utils";

interface MultipleReferencesProps {
  references: NonNullable<MessageWithReferences["references"]>;
  onJumpTo: (messageId: string) => void;
  className?: string;
}

export function MultipleReferences({ 
  references, 
  onJumpTo, 
  className 
}: MultipleReferencesProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Filter out any invalid refs
  const validRefs = references.filter(r => r.referenced_message !== undefined);
  
  const PREVIEW_LIMIT = 3;
  const shouldShowExpand = validRefs.length > PREVIEW_LIMIT;
  
  const displayedRefs = isExpanded ? validRefs : validRefs.slice(0, PREVIEW_LIMIT);
  const hiddenCount = validRefs.length - PREVIEW_LIMIT;

  if (validRefs.length === 0) return null;

  return (
    <div className={cn("flex flex-col w-full mb-2", className)}>
      {displayedRefs.map((ref) => (
        <MessageReferencePreview
          key={ref.referenced_message_id}
          message={ref.referenced_message ?? null}
          onJumpTo={onJumpTo}
          className="mb-1" 
        />
      ))}
      
      {!isExpanded && shouldShowExpand && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsExpanded(true);
          }}
          className={cn(
            "flex items-center gap-2 px-3 py-2 mt-0",
            "text-sm rounded-r",
            "border-l-2 border-primary/30",
            "bg-muted/30 text-primary font-medium",
            "hover:bg-muted/50 transition-colors",
            "text-left w-full"
          )}
        >
          <span>↩</span>
          <span>+{hiddenCount} more reference{hiddenCount === 1 ? '' : 's'}</span>
        </button>
      )}
      
      {isExpanded && shouldShowExpand && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsExpanded(false);
          }}
          className={cn(
            "text-xs text-muted-foreground",
            "hover:text-foreground transition-colors",
            "px-3 py-1 text-left mt-1 w-full"
          )}
        >
          Show less
        </button>
      )}
    </div>
  );
}
