import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { useAuth } from "@/components/AuthProvider";
import type { MessageWithAttachments } from "@/types";
import type { Database } from "../../supabase";

type Channel = Database["public"]["Tables"]["channels"]["Row"];

type CacheEntry = {
  messages: MessageWithAttachments[];
  channel: Channel;
};

interface ChatCacheContextType {
  getCachedChannel: (channelId: string) => CacheEntry | undefined;
  setCachedChannel: (channelId: string, messages: MessageWithAttachments[], channel: Channel) => void;
  updateCachedMessages: (channelId: string, messages: MessageWithAttachments[]) => void;
  clearCache: () => void;
}

const ChatCacheContext = createContext<ChatCacheContextType | undefined>(undefined);

export function ChatCacheProvider({ children }: { children: ReactNode }) {
  const [cache, setCache] = useState<Map<string, CacheEntry>>(new Map());
  const { session } = useAuth();

  // Clear cache when user logs out
  useEffect(() => {
    if (!session) {
      setCache(new Map());
    }
  }, [session]);

  const getCachedChannel = (channelId: string): CacheEntry | undefined => {
    return cache.get(channelId);
  };

  const setCachedChannel = (
    channelId: string, 
    messages: MessageWithAttachments[], 
    channel: Channel
  ) => {
    setCache(prev => {
      const newCache = new Map(prev);
      newCache.set(channelId, { messages, channel });
      return newCache;
    });
  };

  const updateCachedMessages = (
    channelId: string, 
    messages: MessageWithAttachments[]
  ) => {
    setCache(prev => {
      const entry = prev.get(channelId);
      if (!entry) return prev;
      
      const newCache = new Map(prev);
      newCache.set(channelId, { ...entry, messages });
      return newCache;
    });
  };

  const clearCache = () => {
    setCache(new Map());
  };

  const value = {
    getCachedChannel,
    setCachedChannel,
    updateCachedMessages,
    clearCache,
  };

  return (
    <ChatCacheContext.Provider value={value}>
      {children}
    </ChatCacheContext.Provider>
  );
}

export function useChatCache() {
  const context = useContext(ChatCacheContext);
  if (context === undefined) {
    throw new Error("useChatCache must be used within a ChatCacheProvider");
  }
  return context;
}
