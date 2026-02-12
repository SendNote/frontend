import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Search, X, Hash, Paperclip, Loader2 } from "lucide-react";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMessageSearch } from "@/hooks/useMessageSearch";
import { formatFullTimestamp } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import type { MessageWithChannel } from "@/types";

interface SearchOverlayProps {
  open: boolean;
  onClose: () => void;
}

interface SearchResultItemProps {
  message: MessageWithChannel;
  query: string;
  onClick: () => void;
}

function HighlightedText({ text, query }: { text: string; query: string }) {
  if (!query.trim()) return <span>{text}</span>;

  // Split query into terms (remove quotes for highlighting simple terms)
  // This is a basic highlight, won't perfectly match complex websearch syntax like -negation
  const terms = query.replace(/['"]/g, "").split(/\s+/).filter(t => t.length > 0);
  
  if (terms.length === 0) return <span>{text}</span>;

  // Create regex from terms
  const pattern = new RegExp(`(${terms.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'gi');
  
  const parts = text.split(pattern);

  return (
    <span>
      {parts.map((part, i) => 
        pattern.test(part) ? (
          <span key={i} className="bg-yellow-200 dark:bg-yellow-900/50 text-foreground font-medium rounded-sm px-0.5">
            {part}
          </span>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </span>
  );
}

function SearchResultItem({ message, query, onClick }: SearchResultItemProps) {
  return (
    <div 
      className="p-3 rounded-md hover:bg-muted/80 cursor-pointer transition-colors border border-transparent hover:border-border"
      onClick={onClick}
    >
      {/* Channel badge & Time */}
      <div className="flex items-center gap-2 mb-1.5">
        <div className="flex items-center gap-1 bg-muted px-1.5 py-0.5 rounded text-xs text-muted-foreground font-medium">
          <Hash className="h-3 w-3" />
          <span>{message.channel.name}</span>
        </div>
        <span className="text-xs text-muted-foreground/70">
          {formatFullTimestamp(message.created_at)}
        </span>
      </div>
      
      {/* Message body */}
      <p className="text-sm text-foreground whitespace-pre-wrap line-clamp-3 leading-relaxed">
        <HighlightedText text={message.body} query={query} />
      </p>
      
      {/* Attachments */}
      {message.attachments && message.attachments.length > 0 && (
        <div className="flex items-center gap-1.5 mt-2 text-xs text-muted-foreground bg-background/50 inline-flex px-2 py-1 rounded border border-border/50">
          <Paperclip className="h-3 w-3" />
          <span>{message.attachments.length} attachment{message.attachments.length !== 1 ? 's' : ''}</span>
        </div>
      )}
    </div>
  );
}

export function SearchOverlay({ open, onClose }: SearchOverlayProps) {
  const [query, setQuery] = useState("");
  const [channelFilter, setChannelFilter] = useState("all");
  const [channels, setChannels] = useState<{ id: string; name: string }[]>([]);
  const navigate = useNavigate();
  
  const { messages, loading, error } = useMessageSearch(query, channelFilter);

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (open) window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  // Fetch channels for filter
  useEffect(() => {
    if (open) {
      const fetchChannels = async () => {
        const { data } = await supabase
          .from("channels")
          .select("id, name")
          .order("name");
        
        if (data) {
          setChannels(data);
        }
      };
      fetchChannels();
    }
  }, [open]);

  // Handle result click
  const handleResultClick = (message: MessageWithChannel) => {
    navigate(`/channel/${message.channel.id}`);
    onClose();
  };

  const handleClearAll = () => {
    setQuery("");
    setChannelFilter("all");
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
      />
      
      {/* Card */}
      <Card className="relative w-full max-w-2xl shadow-2xl animate-in slide-in-from-top-4 duration-300 border-border/50 bg-card/95 backdrop-blur">
        <CardHeader className="pb-4 space-y-4">
          <div className="flex items-center gap-3">
            <Search className="h-5 w-5 text-muted-foreground shrink-0" />
            <div className="flex-1 relative">
              <Input
                placeholder="Search messages..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full text-lg h-12 border-none focus-visible:ring-0 shadow-none px-0 bg-transparent placeholder:text-muted-foreground/50 pr-16"
                autoFocus
              />
              {query.length > 0 && (
                <button
                  onClick={handleClearAll}
                  className="absolute right-0 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-sm font-medium px-2 py-1"
                  title="Reset search"
                >
                  Reset
                </button>
              )}
            </div>
            <Button variant="ghost" size="icon" onClick={onClose} className="shrink-0 rounded-full h-8 w-8">
              <X className="h-5 w-5" />
            </Button>
          </div>
          
          {/* Separator */}
          <div className="h-px bg-border/50" />

          {/* Filter */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-[200px]">
                <Select value={channelFilter} onValueChange={setChannelFilter}>
                  <SelectTrigger className="h-8 text-xs bg-muted/50 border-transparent hover:bg-muted transition-colors">
                    <SelectValue placeholder="All Channels" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Channels</SelectItem>
                    {channels.map(ch => (
                      <SelectItem key={ch.id} value={ch.id}>
                        # {ch.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            {!loading && messages.length > 0 && (
              <span className="text-xs text-muted-foreground">
                {messages.length} result{messages.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        </CardHeader>
        
        <CardContent className="max-h-[60vh] overflow-y-auto min-h-[100px] p-2">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin mb-2" />
              <p className="text-sm">Searching...</p>
            </div>
          ) : messages.length > 0 ? (
            <div className="space-y-1">
              {messages.map(message => (
                <SearchResultItem
                  key={message.id}
                  message={message}
                  query={query}
                  onClick={() => handleResultClick(message)}
                />
              ))}
            </div>
          ) : query ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Search className="h-12 w-12 mb-3 opacity-20" />
              <p className="text-lg font-medium text-foreground/80">No results found</p>
              <p className="text-sm">Try searching for something else</p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Search className="h-12 w-12 mb-3 opacity-20" />
              <p className="text-sm">Type to start searching messages...</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
