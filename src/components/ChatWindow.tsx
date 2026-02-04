import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { MessageList } from "@/components/MessageList";
import { ChatComposer } from "@/components/ChatComposer";
import { ChannelHeader } from "@/components/ChannelHeader";
import { useChatCache } from "@/contexts/ChatCacheContext";
import type { MessageWithAttachments } from "@/types";
import type { Database } from "../../supabase";

type Channel = Database["public"]["Tables"]["channels"]["Row"];

export function ChatWindow() {
  const { channelId } = useParams();
  const [messages, setMessages] = useState<MessageWithAttachments[]>([]);
  const [loading, setLoading] = useState(true);
  const [channel, setChannel] = useState<Channel | null>(null);
  const { getCachedChannel, setCachedChannel, updateCachedMessages } = useChatCache();

  // Re-fetch when channel changes
  useEffect(() => {
    if (!channelId) return;

    // Check cache first
    const cached = getCachedChannel(channelId);
    
    if (cached) {
      // Cache hit - use cached data immediately
      setMessages(cached.messages);
      setChannel(cached.channel);
      setLoading(false);
    } else {
      // Cache miss - fetch from server
      setLoading(true);
      fetchChannelAndMessages();
    }

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

  // Combined function for initial load
  async function fetchChannelAndMessages() {
    if (!channelId) return;

    // Fetch channel metadata
    const { data: channelData, error: channelError } = await supabase
      .from("channels")
      .select("*")
      .eq("id", channelId)
      .single();

    if (channelError) {
      console.error("Error fetching channel:", channelError);
      setLoading(false);
      return;
    }

    // Fetch messages with attachments
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
      setLoading(false);
      return;
    }

    // Transform data
    const formatted: MessageWithAttachments[] = (allMessages || []).map((msg: any) => ({
      ...msg,
      attachments: msg.message_attachments.map((ma: any) => ma.attachment).filter(Boolean)
    }));

    // Update local state
    setMessages(formatted);
    setChannel(channelData);
    setLoading(false);

    // Update cache
    setCachedChannel(channelId, formatted, channelData);
  }

  // Separate function for realtime updates (doesn't need channel data)
  async function fetchMessages() {
    if (!channelId) return;

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
      return;
    }

    const formatted: MessageWithAttachments[] = (allMessages || []).map((msg: any) => ({
      ...msg,
      attachments: msg.message_attachments.map((ma: any) => ma.attachment).filter(Boolean)
    }));

    setMessages(formatted);
    
    // Update cache with new messages
    updateCachedMessages(channelId, formatted);
  }

  const handleDeleteMessage = async (id: string) => {
    // 1. Optimistic Update - Update local state
    const updatedMessages = messages.filter(m => m.id !== id);
    setMessages(updatedMessages);

    // 2. Update cache
    if (channelId) {
      updateCachedMessages(channelId, updatedMessages);
    }

    // 3. Server Update
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
    // 1. Optimistic Update - Update local state
    const updatedMessages = messages.map(m => 
      m.id === id ? { ...m, body: newBody } : m
    );
    setMessages(updatedMessages);

    // 2. Update cache
    if (channelId) {
      updateCachedMessages(channelId, updatedMessages);
    }

    // 3. Server Update
    const { error } = await supabase
        .from("messages")
        .update({ body: newBody })
        .eq("id", id);
    
    if (error) {
        console.error("Error editing message:", error);
        // Revert on error would be ideal, but for MVP we'll just alert or re-fetch
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
