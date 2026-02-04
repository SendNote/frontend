import { useState } from "react";
import { ArrowLeft, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { SearchOverlay } from "@/components/SearchOverlay";

interface ChannelHeaderProps {
  channelName: string;
}

export function ChannelHeader({ channelName }: ChannelHeaderProps) {
  const navigate = useNavigate();
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  return (
    <div className="h-12 min-h-[48px] border-b bg-background px-4 flex items-center gap-3 sticky top-0 z-10 shadow-sm">
      {/* Back button - mobile only */}
      <Button 
        variant="ghost" 
        size="icon"
        className="md:hidden text-muted-foreground"  // Only show on mobile
        onClick={() => navigate(-1)}
      >
        <ArrowLeft className="h-5 w-5" />
      </Button>
      
      {/* Channel name */}
      <h1 className="text-lg font-semibold flex items-center gap-1">
        <span className="text-muted-foreground text-xl">#</span>
        <span className="truncate">{channelName}</span>
      </h1>

      <Button 
        variant="ghost" 
        size="icon"
        className="md:hidden ml-auto" 
        onClick={() => setIsSearchOpen(true)}
      >
        <Search className="h-5 w-5" />
      </Button>

      <SearchOverlay open={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
    </div>
  );
}
