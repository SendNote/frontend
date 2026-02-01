import { useRef, useEffect, useState } from "react";
import { FileIcon, Loader2, Pencil, Trash2, Check, X } from "lucide-react";
import type { MessageWithAttachments, Attachment } from "@/types";
import { cn } from "@/lib/utils";
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

function MessageItem({ 
    msg, 
    onDelete, 
    onEdit 
}: { 
    msg: MessageWithAttachments, 
    onDelete?: (id: string) => void,
    onEdit?: (id: string, body: string) => void
}) {
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
        <div className="flex flex-col items-end space-y-1 group w-full">
            <div
                className={cn(
                    "max-w-[85%] rounded-2xl px-4 py-2 text-sm shadow-sm break-words relative",
                    isEditing 
                        ? "bg-background text-foreground border border-input p-2 rounded-md" 
                        : "bg-primary text-primary-foreground rounded-tr-sm"
                )}
            >
                {/* Attachments */}
                {msg.attachments && msg.attachments.length > 0 && (
                    <div className="mb-2 space-y-2">
                        {msg.attachments.map((att) => (
                            <AttachmentItem key={att.id} attachment={att} />
                        ))}
                    </div>
                )}

                {/* Text Body */}
                {isEditing ? (
                    <div className="flex flex-col gap-2 min-w-[200px]">
                        <Textarea 
                            value={editBody} 
                            onChange={(e) => setEditBody(e.target.value)}
                            className="text-foreground bg-background min-h-[60px] border-input"
                        />
                        <div className="flex justify-end gap-1">
                             <Button 
                                size="icon" 
                                variant="ghost" 
                                className="h-6 w-6 text-muted-foreground hover:text-destructive hover:bg-destructive/10" 
                                onClick={handleCancel}
                                title="Cancel"
                            >
                                <X className="h-3 w-3" />
                            </Button>
                            <Button 
                                size="icon" 
                                variant="ghost"
                                className="h-6 w-6 text-green-600 hover:text-green-700 hover:bg-green-100" 
                                onClick={handleSave}
                                title="Save"
                            >
                                <Check className="h-3 w-3" />
                            </Button>
                        </div>
                    </div>
                ) : (
                    msg.body && <p className="whitespace-pre-wrap">{msg.body}</p>
                )}
            </div>
          
            {/* Timestamp & Actions */}
            <div className="flex items-center gap-2">
                 <span className="text-[10px] text-muted-foreground select-none">
                    {new Intl.DateTimeFormat('default', { hour: 'numeric', minute: 'numeric' }).format(new Date(msg.created_at))}
                </span>

                {/* Actions: Only show if not editing */}
                {!isEditing && (
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                        <button 
                            onClick={() => setIsEditing(true)}
                            className="text-muted-foreground hover:text-foreground p-0.5 rounded"
                            title="Edit"
                        >
                            <Pencil className="h-3 w-3" />
                        </button>
                        <button 
                            onClick={() => {
                                if (confirm("Delete this message?")) {
                                    onDelete?.(msg.id);
                                }
                            }}
                            className="text-muted-foreground hover:text-destructive p-0.5 rounded"
                            title="Delete"
                        >
                            <Trash2 className="h-3 w-3" />
                        </button>
                    </div>
                )}
            </div>
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
    <div className="flex-1 overflow-y-auto p-4 w-full">
      <div className="flex flex-col space-y-4 max-w-3xl mx-auto w-full">
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
