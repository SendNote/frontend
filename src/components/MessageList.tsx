import { useRef, useEffect, useState, useCallback } from "react";
import { FileIcon, Loader2, Pencil, Trash2, Eye, EyeOff, Reply } from "lucide-react";
import type { MessageWithReferences, Attachment, MessageWithAttachments } from "@/types";
import { cn, formatFullTimestamp } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MarkdownContent } from "@/components/MarkdownContent";
import { useDebounce } from "@/hooks/useDebounce";
import { MessageReferencePreview } from "@/components/MessageReferencePreview";
import { MultipleReferences } from "@/components/MultipleReferences";
import { BackReferences } from "@/components/BackReferences";
import "dotenv";

interface MessageListProps {
  messages: MessageWithReferences[];
  loading: boolean;
  onDeleteMessage?: (id: string) => void;
  onEditMessage?: (id: string, newBody: string) => void;
  onReply?: (message: MessageWithAttachments) => void;
}

// formatFullTimestamp moved to @/lib/utils

// Helper component to handle async signed URL fetching for private buckets
function AttachmentItem({ attachment }: { attachment: Attachment }) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function getUrl() {
      const { data, error } = await supabase.storage
        .from(attachment.bucket)
        .createSignedUrl(attachment.object_key, 3600); // 1 hour token

      if (mounted) {
        if (error || !data?.signedUrl) {
            console.error("Error signing URL:", error);
            setError(true);
        } else {
            setSignedUrl(data.signedUrl);
        }
      }
    }

    getUrl();
    return () => { mounted = false; };
  }, [attachment]);

  if (error) return <div className="text-xs text-destructive">Failed to load attachment</div>;
  if (!signedUrl) return <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />;

  const isImage = attachment.content_type?.startsWith("image/");
  const fileName = attachment.object_key.split('/').pop();

  return (
    <div className="mt-1">
      {isImage ? (
        <a href={signedUrl} target="_blank" rel="noopener noreferrer">
            <img 
                src={signedUrl} 
                alt={fileName} 
                className="rounded-md max-h-60 object-cover bg-black/10 hover:opacity-90 transition-opacity" 
            />
        </a>
      ) : (
        <a 
            href={signedUrl} 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center gap-2 p-2 rounded bg-background/10 hover:bg-background/20 transition-colors"
        >
            <FileIcon className="h-4 w-4" />
            <span className="underline truncate max-w-[200px]">{fileName}</span>
        </a>
      )}
    </div>
  );
}

interface MessageItemProps {
    msg: MessageWithReferences;
    onDelete?: (id: string) => void;
    onEdit?: (id: string, body: string) => void;
    onReply?: (message: MessageWithAttachments) => void;
    onJumpTo: (messageId: string) => void;
    attachRef: (id: string, el: HTMLDivElement | null) => void;
}

function MessageItem({ 
    msg, 
    onDelete, 
    onEdit,
    onReply,
    onJumpTo,
    attachRef
}: MessageItemProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [editBody, setEditBody] = useState(msg.body || "");
    const [showPreview, setShowPreview] = useState(false);
    const debouncedEditBody = useDebounce(editBody, 200);

    const handleSave = () => {
        if (editBody.trim() !== msg.body) {
            onEdit?.(msg.id, editBody);
        }
        setIsEditing(false);
        setShowPreview(false);
    };

    const handleCancel = () => {
        setEditBody(msg.body || "");
        setIsEditing(false);
        setShowPreview(false);
    };

    // Determine reference display mode
    // Filter out null references (deleted messages might still have record but null joined data depending on query)
    // But our query uses inner join !referenced_message so it might be missing if we used strict join, 
    // but typically we want left join behavior.
    // The previous implementation used left join logic in transformation.
    const validReferences = msg.references?.filter(r => r.referenced_message !== undefined) || [];

    return (
        <div 
            ref={(el) => attachRef(msg.id, el)}
            className="group w-full bg-background rounded-lg shadow-lg border border-border/30 p-6"
        >
            <div className="flex flex-col w-full">
                
                {/* References Display (Forward Refs) */}
                {validReferences.length > 0 && (
                    <MultipleReferences
                        references={validReferences}
                        onJumpTo={onJumpTo}
                    />
                )}

                {/* Attachments */}
                {msg.attachments && msg.attachments.length > 0 && (
                    <div className="mb-2 space-y-2">
                        {msg.attachments.map((att) => (
                            <AttachmentItem key={att.id} attachment={att} />
                        ))}
                    </div>
                )}

                {/* Message Body */}
                {isEditing ? (
                    <div className="flex flex-col gap-2 w-full">
                         <div className="flex justify-end">
                            <button 
                                onClick={() => setShowPreview(!showPreview)} 
                                className="text-xs flex items-center gap-1.5 text-muted-foreground hover:text-foreground mb-1"
                                title="Toggle Preview"
                            >
                                {showPreview ? <EyeOff className="w-3.5 h-3.5"/> : <Eye className="w-3.5 h-3.5"/>}
                                {showPreview ? "Hide Preview" : "Preview"}
                            </button>
                        </div>

                        <div className={cn("flex gap-4", showPreview ? "flex-col lg:flex-row items-stretch" : "")}>
                            <Textarea 
                                value={editBody} 
                                onChange={(e) => setEditBody(e.target.value)}
                                className={cn(
                                    "text-foreground bg-background border-input w-full resize-none transition-all duration-200", 
                                    showPreview ? "lg:w-1/2 min-h-[150px] max-h-[300px]" : "min-h-[60px]"
                                )}
                            />
                            
                            {showPreview && (
                                <div className="w-full lg:w-1/2 min-h-[150px] max-h-[300px] h-full overflow-y-auto p-3 rounded-md border border-input bg-background/50">
                                    <MarkdownContent content={debouncedEditBody} className="text-sm" />
                                </div>
                            )}
                        </div>

                        <div className="flex justify-end gap-2">
                             <Button 
                                size="sm" 
                                variant="ghost" 
                                onClick={handleCancel}
                            >
                                Cancel
                            </Button>
                            <Button 
                                size="sm" 
                                onClick={handleSave}
                            >
                                Save
                            </Button>
                        </div>
                    </div>
                ) : (
                    msg.body && (
                        <MarkdownContent 
                            content={msg.body} 
                            className="text-base text-foreground leading-relaxed break-words"
                        />
                    )
                )}
            
                {/* Timestamp & Actions - Only show if not editing */}
                {!isEditing && (
                    <div className="flex items-center justify-end gap-2 mt-2">
                        <span className="text-xs text-muted-foreground select-none">
                            {formatFullTimestamp(msg.created_at)}
                        </span>

                        {/* Back References Indicator */}
                        {msg.referenced_by && msg.referenced_by.length > 0 && (
                            <BackReferences
                                messages={msg.referenced_by}
                                onJumpTo={onJumpTo}
                            />
                        )}

                        <div className="flex gap-1 items-center opacity-0 group-hover:opacity-100 transition-opacity">
                             <button 
                                onClick={() => onReply?.(msg)}
                                className="text-muted-foreground hover:text-foreground p-1 rounded transition-colors"
                                title="Reply"
                            >
                                <Reply className="h-3.5 w-3.5" />
                            </button>
                            <button 
                                onClick={() => setIsEditing(true)}
                                className="text-muted-foreground hover:text-foreground p-1 rounded transition-colors"
                                title="Edit"
                            >
                                <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button 
                                onClick={() => {
                                    if (confirm("Delete this message?")) {
                                        onDelete?.(msg.id);
                                    }
                                }}
                                className="text-muted-foreground hover:text-destructive p-1 rounded transition-colors"
                                title="Delete"
                            >
                                <Trash2 className="h-3.5 w-3.5" />
                            </button>
                        </div>
                    </div>
                )}
            </div>


        </div>
    );
}

export function MessageList({ messages, loading, onDeleteMessage, onEditMessage, onReply }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const messageRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]); // Only scroll on count change to avoid jumps on updates

  const scrollToMessage = useCallback((messageId: string) => {
    const element = messageRefs.current.get(messageId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      element.classList.add('message-highlight');
      setTimeout(() => {
        element.classList.remove('message-highlight');
      }, 2500);
    }
  }, []);

  const attachRef = useCallback((id: string, el: HTMLDivElement | null) => {
      if (el) {
          messageRefs.current.set(id, el);
      } else {
          messageRefs.current.delete(id);
      }
  }, []);

  if (loading) {
    return <div className="flex-1 flex items-center justify-center text-muted-foreground">Loading messages...</div>;
  }

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-8">
        <p>No messages yet.</p>
        <p className="text-sm">Send yourself a note to get started.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto w-full">
      <div className="flex flex-col gap-2 pb-24 px-4 pt-2 w-full">
        {messages.map((msg) => (
            <MessageItem 
                key={msg.id} 
                msg={msg} 
                onDelete={onDeleteMessage}
                onEdit={onEditMessage}
                onReply={onReply}
                onJumpTo={scrollToMessage}
                attachRef={attachRef}
            />
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
