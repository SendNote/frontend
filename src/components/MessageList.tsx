import { useRef, useEffect, useState } from "react";
import { FileIcon, Loader2, Pencil, Trash2, Check, X } from "lucide-react";
import type { MessageWithAttachments, Attachment } from "@/types";
import { cn, formatFullTimestamp } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import "dotenv";

interface MessageListProps {
  messages: MessageWithAttachments[];
  loading: boolean;
  onDeleteMessage?: (id: string) => void;
  onEditMessage?: (id: string, newBody: string) => void;
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
    msg: MessageWithAttachments;
    onDelete?: (id: string) => void;
    onEdit?: (id: string, body: string) => void;
}

function MessageItem({ 
    msg, 
    onDelete, 
    onEdit
}: MessageItemProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [editBody, setEditBody] = useState(msg.body || "");

    const handleSave = () => {
        if (editBody.trim() !== msg.body) {
            onEdit?.(msg.id, editBody);
        }
        setIsEditing(false);
    };

    const handleCancel = () => {
        setEditBody(msg.body || "");
        setIsEditing(false);
    };

    return (
        <div className="group w-full hover:bg-muted/30 transition-colors pt-4 pb-2">
            <div className="px-6 flex flex-col w-full">
                
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
                        <Textarea 
                            value={editBody} 
                            onChange={(e) => setEditBody(e.target.value)}
                            className="text-foreground bg-background min-h-[60px] border-input w-full"
                        />
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
                        <p className="whitespace-pre-wrap text-base text-foreground leading-relaxed break-words">
                            {msg.body}
                        </p>
                    )
                )}
            
                {/* Timestamp & Actions - Only show if not editing */}
                {!isEditing && (
                    <div className="flex items-center justify-end gap-2 mt-2">
                        <span className="text-xs text-muted-foreground select-none">
                            {formatFullTimestamp(msg.created_at)}
                        </span>

                        <div className="flex gap-1 items-center">
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

            {/* Divider */}
            <div className="border-b border-border/80 w-full mt-2 ml-4 mr-4" />
        </div>
    );
}

export function MessageList({ messages, loading, onDeleteMessage, onEditMessage }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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
      <div className="flex flex-col w-full pb-4">
        {messages.map((msg) => (
            <MessageItem 
                key={msg.id} 
                msg={msg} 
                onDelete={onDeleteMessage}
                onEdit={onEditMessage}
            />
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
