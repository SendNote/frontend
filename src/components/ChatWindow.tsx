import { useEffect, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { MessageList } from "@/components/MessageList";
import { ChatComposer } from "@/components/ChatComposer";
import { ChannelHeader } from "@/components/ChannelHeader";
import { useChatCache } from "@/contexts/ChatCacheContext";
import type { MessageWithReferences, MessageWithAttachments } from "@/types";
import type { Database } from "../../supabase";

type Channel = Database["public"]["Tables"]["channels"]["Row"];

export function ChatWindow() {
  const { channelId } = useParams();
  const [messages, setMessages] = useState<MessageWithReferences[]>([]);
  const [loading, setLoading] = useState(true);
  const [channel, setChannel] = useState<Channel | null>(null);
  const { getCachedChannel, setCachedChannel, updateCachedMessages } = useChatCache();
  
  // Reply state
  const [replyingTo, setReplyingTo] = useState<MessageWithAttachments[]>([]);

  // Reply handler
  const handleReply = useCallback((message: MessageWithAttachments) => {
    setReplyingTo(prev => {
      // Prevent duplicates
      if (prev.find(m => m.id === message.id)) {
        return prev;
      }
      return [...prev, message];
    });
  }, []);

  // Re-fetch when channel changes
  useEffect(() => {
    if (!channelId) return;

    // Reset reply state on channel change
    setReplyingTo([]);

    // Check cache first
    const cached = getCachedChannel(channelId);
    
    if (cached) {
      // Cache hit - use cached data immediately
      setMessages(cached.messages as MessageWithReferences[]);
      setChannel(cached.channel);
      setLoading(false);
    } else {
      // Cache miss - fetch from server
      setLoading(true);
      fetchChannelAndMessages();
    }

    // Subscribe to NEW messages in this channel
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
        () => {
          fetchMessages(); 
        }
      )
      .subscribe((status) => {
         if (status !== 'SUBSCRIBED') {
            console.log('ChatWindow Subscription status:', status);
         }
      });
      
    // Subscribe to reference changes
    const referencesSubscription = supabase
      .channel(`references:${channelId}`)
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'message_references'
        },
        () => {
          fetchMessages();
        }
      )
      .subscribe((status) => {
        if (status !== 'SUBSCRIBED') {
          console.log('References subscription status:', status);
        }
      });

    return () => {
      supabase.removeChannel(subscription);
      supabase.removeChannel(referencesSubscription);
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

    // Fetch messages with attachments and references
    const { data: allMessages, error: fetchError } = await supabase
      .from("messages")
      .select(`
        *,
        message_attachments (
          attachment:attachments (*)
        ),
        references:message_references!source_message_id (
          referenced_message_id,
          referenced_message:messages!referenced_message_id (
            *,
            message_attachments (
              attachment:attachments (*)
            )
          )
        ),
        referenced_by:message_references!referenced_message_id (
          source_message_id,
          source_message:messages!source_message_id (
            id,
            body,
            created_at,
            channel_id
          )
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
    const formatted: MessageWithReferences[] = (allMessages || []).map((msg: any) => ({
      ...msg,
      attachments: msg.message_attachments?.map((ma: any) => ma.attachment).filter(Boolean) || [],
      references: (msg.references || []).map((ref: any) => ({
        referenced_message_id: ref.referenced_message_id,
        referenced_message: ref.referenced_message ? {
          ...ref.referenced_message,
          attachments: ref.referenced_message.message_attachments?.map((ma: any) => ma.attachment).filter(Boolean) || []
        } : null
      })),
      referenced_by: msg.referenced_by || []
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
        ),
        references:message_references!source_message_id (
          referenced_message_id,
          referenced_message:messages!referenced_message_id (
            *,
            message_attachments (
              attachment:attachments (*)
            )
          )
        ),
        referenced_by:message_references!referenced_message_id (
          source_message_id,
          source_message:messages!source_message_id (
            id,
            body,
            created_at,
            channel_id
          )
        )
      `)
      .eq("channel_id", channelId)
      .is("deleted_at", null)
      .order("created_at", { ascending: true });

    if (fetchError) {
      console.error("Error fetching messages:", fetchError);
      return;
    }

    const formatted: MessageWithReferences[] = (allMessages || []).map((msg: any) => ({
      ...msg,
      attachments: msg.message_attachments?.map((ma: any) => ma.attachment).filter(Boolean) || [],
      references: (msg.references || []).map((ref: any) => ({
        referenced_message_id: ref.referenced_message_id,
        referenced_message: ref.referenced_message ? {
          ...ref.referenced_message,
          attachments: ref.referenced_message.message_attachments?.map((ma: any) => ma.attachment).filter(Boolean) || []
        } : null
      })),
      referenced_by: msg.referenced_by || []
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
        onReply={handleReply}
      />
      <ChatComposer 
        channelId={channelId} 
        onSend={fetchMessages}
        replyingTo={replyingTo}
        onReplyChange={setReplyingTo}
      />
    </div>
  );
}
