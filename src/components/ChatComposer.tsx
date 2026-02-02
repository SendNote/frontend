import { useState, useRef, type FormEvent, type ChangeEvent } from "react";
import { Send, Paperclip, X, File as FileIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

interface ChatComposerProps {
  channelId: string;
  onSend?: () => void;
}

export function ChatComposer({ channelId, onSend }: ChatComposerProps) {
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [isSending, setIsSending] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const canSend = (text.trim().length > 0 || file !== null) && !isSending;

  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!canSend) return;

    setIsSending(true);

    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("No user");

        // 1. Upload File (if any)
        let attachmentId: string | null = null;
        
        if (file) {
            const fileExt = file.name.split('.').pop();
            const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
            const filePath = `${user.id}/${fileName}`; // Organized by user

            const { error: uploadError } = await supabase.storage
                .from('attachments')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            // Create attachment record
            const { data: attData, error: attError } = await supabase
                .from('attachments')
                .insert({
                    bucket: 'attachments',
                    object_key: filePath,
                    content_type: file.type,
                    size_bytes: file.size,
                    user_id: user.id
                })
                .select()
                .single();
            
            if (attError) throw attError;
            attachmentId = attData.id;
        }

        // 2. Create Message
        const { data: msgData, error: msgError } = await supabase
            .from('messages')
            .insert({
                channel_id: channelId,
                body: text,
                user_id: user.id
            })
            .select()
            .single();

        if (msgError) throw msgError;

        // 3. Link Attachment (if any)
        if (attachmentId) {
            const { error: linkError } = await supabase
                .from('message_attachments')
                .insert({
                    message_id: msgData.id,
                    attachment_id: attachmentId
                });
            
            if (linkError) throw linkError;
        }

        // Reset form
        setText("");
        setFile(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
        onSend?.();

    } catch (error) {
        console.error("Error sending message:", error);
        alert("Failed to send message. See console.");
    } finally {
        setIsSending(false);
    }
  };

  // Allow submitting with Enter (but Shift+Enter for newline)
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSubmit(e as any);
    }
  };

  return (
    <div className="sticky bottom-0 p-4 border-t bg-background shadow-[0_-2px_10px_rgba(0,0,0,0.1)] dark:shadow-[0_-2px_10px_rgba(0,0,0,0.3)] z-20">
        <div className="w-full px-4">
            {/* File Preview */}
            {file && (
            <div className="flex items-center gap-2 mb-2 p-2 bg-muted/50 rounded-md max-w-fit">
                <FileIcon className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm truncate max-w-[200px]">{file.name}</span>
                <button onClick={() => { setFile(null); if(fileInputRef.current) fileInputRef.current.value = "" }} className="ml-2 hover:text-destructive">
                    <X className="h-4 w-4" />
                </button>
            </div>
        )}

        <form onSubmit={handleSubmit} className="flex gap-2 items-end">
            <input 
                type="file" 
                ref={fileInputRef}
                className="hidden" 
                onChange={handleFileSelect} 
            />
            
            <Button 
                type="button" 
                variant="ghost" 
                size="icon"
                onClick={() => fileInputRef.current?.click()}
                className="text-muted-foreground hover:text-foreground"
                title="Attach file"
            >
                <Paperclip className="h-5 w-5" />
            </Button>

            <Textarea 
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type a note..."
                className="min-h-[44px] max-h-[150px] resize-none py-3"
                rows={1}
            />

            <Button type="submit" disabled={!canSend} size="icon">
                <Send className="h-4 w-4" />
            </Button>
            </form>
        </div>
    </div>
  );
}

