import { useState, useRef, useEffect } from "react";
import type { MessageWithReferences } from "@/types";
import { cn, formatFullTimestamp } from "@/lib/utils";

interface BackReferencesProps {
  messages: NonNullable<MessageWithReferences["referenced_by"]>;
  onJumpTo: (messageId: string) => void;
  className?: string;
}

export function BackReferences({ messages, onJumpTo, className }: BackReferencesProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [direction, setDirection] = useState<'up' | 'down'>('up');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const count = messages?.length || 0;

  if (count === 0) return null;

  // Calculate direction when opening
  useEffect(() => {
    if (isExpanded && dropdownRef.current) {
        const rect = dropdownRef.current.getBoundingClientRect();
        const spaceAbove = rect.top;
        const dropdownHeight = 320; // max-h-80 is 20rem = 320px
        
        // If less space above than height + header buffer (approx 60px), go down
        if (spaceAbove < dropdownHeight + 60) {
            setDirection('down');
        } else {
            setDirection('up');
        }
    }
  }, [isExpanded]);

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!isExpanded) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsExpanded(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isExpanded]);

  return (
    <div className={cn("relative inline-block", className)} ref={dropdownRef}>
      <button
        onClick={(e) => {
            e.stopPropagation();
            setIsExpanded(!isExpanded);
        }}
        className={cn(
          "inline-flex items-center gap-1 px-2 py-0.5",
          "text-xs rounded-full",
          "bg-accent hover:bg-accent/80 text-accent-foreground",
          "transition-colors"
        )}
        aria-label={`${count} reference${count === 1 ? '' : 's'}`}
      >
        <span>↑</span>
        <span>{count} {count === 1 ? 'ref' : 'refs'}</span>
      </button>

      {isExpanded && (
        <div className={cn(
          "absolute right-0 z-50", // Higher z-index to clear header
          direction === 'up' ? "bottom-full mb-1" : "top-full mt-1",
          "w-64 max-h-80 overflow-y-auto",
          "bg-popover border border-border rounded-md shadow-lg",
          "py-1"
        )}>
          <div className="px-3 py-2 text-xs font-medium text-muted-foreground border-b">
            Referenced by:
          </div>
          {messages.map(({ source_message_id, source_message }) => (
            <button
              key={source_message_id}
              onClick={(e) => {
                e.stopPropagation();
                onJumpTo(source_message_id);
                setIsExpanded(false);
              }}
              className={cn(
                "w-full px-3 py-2 text-left text-sm",
                "hover:bg-accent transition-colors",
                "flex flex-col gap-1"
              )}
            >
              <span className="text-xs text-muted-foreground">
                {formatFullTimestamp(source_message.created_at)}
              </span>
              <span className="line-clamp-2 text-foreground/90">
                {source_message.body || "[No text]"}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
