import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Star, Clock, ArrowUpDown } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { MessageList } from "@/components/MessageList";
import { useChatCache } from "@/contexts/ChatCacheContext";
import type { MessageWithReferencesAndChannel, MessageWithAttachments } from "@/types";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function StarredMessages() {
  const [messages, setMessages] = useState<MessageWithReferencesAndChannel[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortOrder, setSortOrder] = useState<'starred_desc' | 'created_asc'>('starred_desc');
  const { getCachedChannel, setCachedChannel, updateCachedMessages } = useChatCache();
  const navigate = useNavigate();
  const CACHE_KEY = "__starred__";

  // Fetch starred messages
  const fetchStarredMessages = useCallback(async () => {
    const { data: allMessages, error } = await supabase
      .from("messages")
      .select(`
        *,
        channel:channels(id, name),
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
      .not("starred_at", "is", null)
      .is("deleted_at", null);

    if (error) {
      console.error("Error fetching starred messages:", error);
      setLoading(false);
      return;
    }

    // Transform data
    const formatted: MessageWithReferencesAndChannel[] = (allMessages || []).map((msg: any) => ({
      ...msg,
      attachments: msg.message_attachments?.map((ma: any) => ma.attachment).filter(Boolean) || [],
      references: (msg.references || []).map((ref: any) => ({
        referenced_message_id: ref.referenced_message_id,
        referenced_message: ref.referenced_message ? {
          ...ref.referenced_message,
          attachments: ref.referenced_message.message_attachments?.map((ma: any) => ma.attachment).filter(Boolean) || []
        } : null
      })),
      referenced_by: msg.referenced_by || [],
      channel: msg.channel
    }));

    // Sort based on current preference
    const sorted = sortMessages(formatted, sortOrder);
    
    setMessages(sorted);
    setLoading(false);
    
    // Update cache
    // We treat __starred__ as a special channel ID
    setCachedChannel(CACHE_KEY, sorted, { 
      id: CACHE_KEY, 
      name: "Starred Messages", 
      created_at: "", 
      user_id: "",
      archived: false,
      pinned: false,
      updated_at: ""
    });
  }, [sortOrder]);

  // Sorting helper
  const sortMessages = (msgs: MessageWithReferencesAndChannel[], order: 'starred_desc' | 'created_asc') => {
    return [...msgs].sort((a, b) => {
      if (order === 'starred_desc') {
        // Newest starred first
        return new Date(b.starred_at || 0).getTime() - new Date(a.starred_at || 0).getTime();
      } else {
        // Oldest created first (chronological)
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      }
    });
  };

  // Toggle sort order
  const toggleSort = () => {
    const newOrder = sortOrder === 'starred_desc' ? 'created_asc' : 'starred_desc';
    setSortOrder(newOrder);
    setMessages(prev => sortMessages(prev, newOrder));
  };

  // Initial load & Cache check
  useEffect(() => {
    const cached = getCachedChannel(CACHE_KEY);
    if (cached) {
      const cachedMessages = cached.messages as MessageWithReferencesAndChannel[];
      setMessages(sortMessages(cachedMessages, sortOrder));
      setLoading(false);
      // Background refresh
      fetchStarredMessages();
    } else {
      fetchStarredMessages();
    }
  }, []); // Run once on mount

  // Re-fetch when sort order changes (already handled by setMessages in toggleSort, but fetching fresh data is good too)
  // Actually, we can just sort locally if we have the data. 
  // But let's keep fetchStarredMessages dependency on sortOrder to ensure consistency if we re-fetch.

  // Realtime subscription
  useEffect(() => {
    const subscription = supabase
      .channel('starred-messages')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to INSERT (unlikely but possible if we star on creation), UPDATE (star/unstar), DELETE
          schema: 'public',
          table: 'messages'
        },
        (payload) => {
           // We'll simplisticly re-fetch all starred messages on any change to messages table 
           // that involves starred_at or if a starred message is modified.
           // Since filtering effectively requires checking if starred_at changed, simpler to just refetch.
           fetchStarredMessages();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [fetchStarredMessages]);

  const handleToggleStar = async (messageId: string, currentStarredAt: string | null) => {
    // If unstarring, remove from list immediately
    if (currentStarredAt) {
      const updatedMessages = messages.filter(m => m.id !== messageId);
      setMessages(updatedMessages);
      updateCachedMessages(CACHE_KEY, updatedMessages);

      const { error } = await supabase
        .from("messages")
        .update({ starred_at: null })
        .eq("id", messageId);

      if (error) {
        console.error("Error unstarring:", error);
        fetchStarredMessages(); // Revert
      }
    }
    // Note: Starring a message from here isn't possible normally as all messages here are already starred,
    // but if we were to support it (maybe undoing an unstar?), we'd need logic.
    // For now, only unstar logic is needed here.
  };

  const handleChannelClick = (channelId: string, messageId: string) => {
    // Navigate to channel and maybe scroll to message (handled in ChatWindow via query param later)
    navigate(`/channel/${channelId}?highlight=${messageId}`);
  };

  return (
    <div className="flex flex-col h-full w-full relative bg-muted/20">
      {/* Header */}
      <div className="h-14 border-b bg-background flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-2 font-semibold">
          <Star className="w-5 h-5 text-yellow-500 fill-current" />
          <span>Starred Messages</span>
        </div>
        
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={toggleSort}
          className="gap-2 text-muted-foreground hover:text-foreground"
        >
          {sortOrder === 'starred_desc' ? (
            <>
              <Clock className="w-4 h-4" />
              <span>Recent</span>
            </>
          ) : (
            <>
              <ArrowUpDown className="w-4 h-4" />
              <span>Chronological</span>
            </>
          )}
        </Button>
      </div>

      {/* Message List */}
      <MessageList 
        channelId={CACHE_KEY} // Virtual channel ID
        messages={messages}
        loading={loading}
        onToggleStar={handleToggleStar}
        showChannelBadge={true}
        onChannelClick={handleChannelClick}
      />
    </div>
  );
}
