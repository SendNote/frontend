import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useDebounce } from "@/hooks/useDebounce";
import type { MessageWithChannel } from "@/types";

type SearchResult = {
  messages: MessageWithChannel[];
  loading: boolean;
  error: Error | null;
};

export function useMessageSearch(query: string, channelId?: string): SearchResult {
  const [messages, setMessages] = useState<MessageWithChannel[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const debouncedQuery = useDebounce(query, 500);

  useEffect(() => {
    // If query is empty, clear results and return
    if (!debouncedQuery.trim()) {
      setMessages([]);
      setLoading(false);
      return;
    }

    let isMounted = true;
    setLoading(true);
    setError(null);

    async function search() {
      try {
        let supabaseQuery = supabase
          .from("messages")
          .select(`
            *,
            channel:channels!inner(id, name),
            attachments:message_attachments(
              attachment:attachments(*)
            )
          `)
          .textSearch("fts", debouncedQuery, {
            type: "websearch",
            config: "simple"
          })
          .is("deleted_at", null)
          .order("created_at", { ascending: false })
          .limit(50);

        // Apply channel filter if provided and not "all"
        if (channelId && channelId !== "all") {
          supabaseQuery = supabaseQuery.eq("channel_id", channelId);
        }

        const { data, error: apiError } = await supabaseQuery;

        if (isMounted) {
          if (apiError) {
            console.error("Search API error:", apiError);
            setError(apiError);
            setMessages([]);
          } else {
            // Cast data to expected type since Supabase types might be inferred differently
            // but we know the structure matches MessageWithChannel
            setMessages((data as any) || []);
          }
          setLoading(false);
        }
      } catch (err) {
        if (isMounted) {
            console.error("Search unexpected error:", err);
            setError(err instanceof Error ? err : new Error('Unknown error'));
            setLoading(false);
        }
      }
    }

    search();

    return () => {
      isMounted = false;
    };
  }, [debouncedQuery, channelId]);

  return { messages, loading, error };
}
