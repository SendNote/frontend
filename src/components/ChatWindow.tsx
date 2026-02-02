import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { MessageList } from "@/components/MessageList";
import { ChatComposer } from "@/components/ChatComposer";
import { ChannelHeader } from "@/components/ChannelHeader";
import type { MessageWithAttachments } from "@/types";
import type { Database } from "../../supabase";

type Channel = Database["public"]["Tables"]["channels"]["Row"];

export function ChatWindow() {
  const { channelId } = useParams();
  const [messages, setMessages] = useState<MessageWithAttachments[]>([]);
  const [loading, setLoading] = useState(true);
  const [channel, setChannel] = useState<Channel | null>(null);

  // Re-fetch when channel changes
  useEffect(() => {
    if (!channelId) return;
    
    setLoading(true);
    
    // Fetch channel details
    async function fetchChannel() {
        const { data } = await supabase
            .from("channels")
            .select("*")
            .eq("id", channelId!)
            .single();
        if (data) setChannel(data);
    }
    fetchChannel();

    fetchMessages();


    // Subscribe to NEW messages in this channel
    // Note: We need to be careful with the 'table' filter.
    // Ideally we filter by channel_id, but supabase realtime filter syntax needs to be precise.
    const subscription = supabase
      .channel(`room:${channelId}`)
      .on(
        'postgres_changes', 
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'messages',
          filter: `channel_id=eq.${channelId}` 
        }, 
        (payload) => {
          // When a new message arrives, we need to fetch its attachments (if any)
          // For now, we'll just re-fetch the single message with relations
          // Or simplest: just re-fetch the list (less efficient but reliable for MVP)
          fetchMessages(); 
        }
      )
      .subscribe((status) => {
         if (status !== 'SUBSCRIBED') {
            console.log('ChatWindow Subscription status:', status);
         }
      });

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [channelId]);

  async function fetchMessages() {
    if (!channelId) return;

    // Correct Left Join syntax for optional relations:
    const { data: allMessages, error: fetchError } = await supabase
        .from("messages")
        .select(`
            *,
            message_attachments (
                attachment:attachments (*)
            )
        `)
        .eq("channel_id", channelId)
        .is("deleted_at", null)
        .order("created_at", { ascending: true });

    if (fetchError) {
      console.error("Error fetching messages:", fetchError);
    } else {
        // Transform the nested data structure to match our simpler MessageWithAttachments type
        const formatted: MessageWithAttachments[] = (allMessages || []).map((msg: any) => ({
            ...msg,
            // Extract the actual attachment objects from the join table array
            attachments: msg.message_attachments.map((ma: any) => ma.attachment).filter(Boolean)
        }));
        setMessages(formatted);
    }
    setLoading(false);
  }

  const handleDeleteMessage = async (id: string) => {
    // 1. Optimistic Update
    setMessages(prev => prev.filter(m => m.id !== id));

    // 2. Server Update
    const { error } = await supabase
        .from("messages")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", id);
    
    if (error) {
        console.error("Error deleting message:", error);
        // Revert on error would be ideal, but for MVP we'll just alert or re-fetch
        fetchMessages();
    }
  };

  const handleEditMessage = async (id: string, newBody: string) => {
    // 1. Optimistic Update
    setMessages(prev => prev.map(m => m.id === id ? { ...m, body: newBody } : m));

    // 2. Server Update
    const { error } = await supabase
        .from("messages")
        .update({ body: newBody })
        .eq("id", id);
    
    if (error) {
        console.error("Error editing message:", error);
        fetchMessages();
    }
  };

  if (!channelId) return null;

  return (
    <div className="flex flex-col h-full w-full relative bg-background">
      {channel && <ChannelHeader channelName={channel.name} />}
      <MessageList 
        messages={messages} 
        loading={loading} 
        onDeleteMessage={handleDeleteMessage}
        onEditMessage={handleEditMessage}
      />
      <ChatComposer channelId={channelId} onSend={fetchMessages} />
    </div>
  );
}
