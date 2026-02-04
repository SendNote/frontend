import { useEffect, useState, useRef, type FormEvent } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { Plus, Hash, LogOut, MoreVertical, Pencil, Trash2, Check, X, User, Settings, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { Sheet, SheetTrigger, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ProfileForm } from "@/components/ProfileForm";
import { SearchOverlay } from "@/components/SearchOverlay";
import type { Database } from "../../supabase";

type Channel = Database["public"]["Tables"]["channels"]["Row"];

interface SidebarItemProps {
    channel: Channel;
    isActive: boolean;
    onEdit: (id: string, newName: string) => void;
    onDelete: (id: string) => void;
}

function SidebarItem({ channel, isActive, onEdit, onDelete }: SidebarItemProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [editName, setEditName] = useState(channel.name);
    const [showMenu, setShowMenu] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setShowMenu(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleSave = () => {
        if (editName.trim() && editName !== channel.name) {
            onEdit(channel.id, editName);
        }
        setIsEditing(false);
    };

    const handleCancel = () => {
        setEditName(channel.name);
        setIsEditing(false);
    };

    if (isEditing) {
        return (
            <div className="px-2 py-1">
                <div className="flex items-center gap-1 bg-background border border-input rounded-md p-1">
                    <Input 
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="h-7 text-sm border-none focus-visible:ring-0 px-2"
                        autoFocus
                    />
                    <Button size="icon" variant="ghost" className="h-6 w-6 text-green-600 hover:text-green-700 hover:bg-green-100" onClick={handleSave}>
                        <Check className="h-3 w-3" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-6 w-6 text-muted-foreground hover:text-destructive hover:bg-destructive/10" onClick={handleCancel}>
                        <X className="h-3 w-3" />
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="relative group px-2">
            <Link
                to={`/channel/${channel.id}`}
                className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors pr-8", // pr-8 for menu button space
                    isActive 
                        ? "bg-sidebar-accent text-sidebar-accent-foreground" 
                        : "text-sidebar-foreground hover:bg-sidebar-accent/50"
                )}
            >
                <Hash className="h-4 w-4 text-muted-foreground/70 flex-shrink-0" />
                <span className="truncate">{channel.name}</span>
            </Link>

            {/* Menu Trigger */}
            <div className={cn(
                "absolute right-3 top-1/2 -translate-y-1/2 opacity-0 transition-opacity",
                (isActive || showMenu) && "opacity-100", // Show if active or menu open
                "group-hover:opacity-100" // Show on hover
            )}>
                 <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-6 w-6 text-muted-foreground hover:text-foreground"
                    onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setShowMenu(!showMenu);
                    }}
                >
                    <MoreVertical className="h-3 w-3" />
                </Button>
            </div>

            {/* Context Menu Dropdown */}
            {showMenu && (
                <div 
                    ref={menuRef}
                    className="absolute right-0 top-8 z-50 w-32 rounded-md border bg-popover p-1 text-popover-foreground shadow-md outline-none animate-in fade-in-0 zoom-in-95"
                >
                    <button
                        onClick={() => {
                            setIsEditing(true);
                            setShowMenu(false);
                        }}
                        className="relative flex w-full cursor-default select-none items-center rounded-sm px-2 py-1.5 text-xs outline-none hover:bg-accent hover:text-accent-foreground gap-2"
                    >
                        <Pencil className="h-3 w-3" />
                        Rename
                    </button>
                    <button
                        onClick={() => {
                            if (confirm(`Delete channel "${channel.name}"?`)) {
                                onDelete(channel.id);
                            }
                            setShowMenu(false);
                        }}
                        className="relative flex w-full cursor-default select-none items-center rounded-sm px-2 py-1.5 text-xs outline-none hover:bg-destructive/10 hover:text-destructive gap-2 text-destructive"
                    >
                        <Trash2 className="h-3 w-3" />
                        Delete
                    </button>
                </div>
            )}
        </div>
    );
}

export function Sidebar() {
  const { channelId } = useParams();
  const navigate = useNavigate();
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const [newChannelName, setNewChannelName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  useEffect(() => {
    fetchChannels();
    
    // Subscribe to channel changes for realtime updates
    const channelSubscription = supabase
      .channel('public:channels')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'channels' }, () => {
        fetchChannels();
      })
      .subscribe((status) => {
        if (status !== 'SUBSCRIBED') {
           console.log('Sidebar Subscription status:', status);
        }
      });

    return () => {
      supabase.removeChannel(channelSubscription);
    };
  }, []);

  async function fetchChannels() {
    const { data, error } = await supabase
      .from("channels")
      .select("*")
      .order("name");
    
    if (error) {
      console.error("Error fetching channels:", error);
    } else {
      setChannels(data || []);
    }
    setLoading(false);
  }

  async function createChannel(e: FormEvent) {
    e.preventDefault();
    if (!newChannelName.trim()) return;

    // Get current user to satisfy RLS/table constraints
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("channels")
      .insert({ 
        name: newChannelName, 
        user_id: user.id 
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating channel:", error);
    } else if (data) {
      setNewChannelName("");
      setIsCreating(false);
      // Optimistically update or refetch
      setChannels(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
      navigate(`/channel/${data.id}`);
    }
  }

  async function handleEditChannel(id: string, newName: string) {
      // Optimistic
      setChannels(prev => prev.map(c => c.id === id ? { ...c, name: newName } : c));
      
      const { error } = await supabase
          .from("channels")
          .update({ name: newName })
          .eq("id", id);
      
      if (error) {
          console.error("Error updating channel:", error);
          fetchChannels(); // Revert on error
      }
  }

  async function handleDeleteChannel(id: string) {
      // Optimistic
      setChannels(prev => prev.filter(c => c.id !== id));
      
      // If we are on the deleted channel, go home
      if (channelId === id) {
          navigate("/");
      }

      try {
          // 1. Identify Attachments to Cleanup
          // Query messages in this channel -> join message_attachments -> join attachments
          const { data: messagesData } = await supabase
              .from('messages')
              .select(`
                  message_attachments (
                      attachment:attachments ( id, bucket, object_key )
                  )
              `)
              .eq('channel_id', id);

          if (messagesData) {
              // Flatten the structure to get a list of attachments
              const attachments = messagesData
                  .flatMap((m: any) => m.message_attachments)
                  .map((ma: any) => ma.attachment)
                  .filter((a: any) => a !== null);

              if (attachments.length > 0) {
                  // 2. Delete Files from Storage
                  // Assuming they are all in the same 'attachments' bucket for this MVP
                  const paths = attachments.map((a: any) => a.object_key);
                  const { error: storageError } = await supabase.storage
                      .from('attachments')
                      .remove(paths);
                  
                  if (storageError) console.error("Error cleaning up storage files:", storageError);

                  // 3. Delete Rows from 'attachments' table
                  // This is necessary because 'message_attachments' deletion (via cascade) 
                  // usually doesn't cascade to the 'attachments' table row itself.
                  const attachmentIds = attachments.map((a: any) => a.id);
                  const { error: dbError } = await supabase
                      .from('attachments')
                      .delete()
                      .in('id', attachmentIds);

                   if (dbError) console.error("Error cleaning up attachment rows:", dbError);
              }
          }
      } catch (cleanupError) {
          console.error("Cleanup failed, but proceeding with channel delete:", cleanupError);
      }

      // 4. Finally Delete the Channel (cascades to messages)
      const { error } = await supabase
          .from("channels")
          .delete()
          .eq("id", id);
      
      if (error) {
          console.error("Error deleting channel:", error);
          fetchChannels(); // Revert
      }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    navigate("/login");
  }

  return (
    <div className="flex flex-col h-full bg-sidebar border-r border-sidebar-border w-64 flex-shrink-0">
      {/* Header */}
      <div className="p-4 border-b border-sidebar-border flex items-center justify-between">
        <h2 className="font-semibold text-lg tracking-tight">Sendnote</h2>
        <div className="flex items-center gap-1">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setIsSearchOpen(true)}
            title="Search Messages"
            className="h-8 w-8 hidden md:inline-flex"
          >
            <Search className="h-4 w-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setIsCreating(!isCreating)}
            title="Create Channel"
            className="h-8 w-8"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Channel List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {isCreating && (
          <form onSubmit={createChannel} className="p-2 mb-2 bg-sidebar-accent/30 rounded-md">
            <Input 
              autoFocus
              placeholder="Channel name..." 
              value={newChannelName}
              onChange={(e) => setNewChannelName(e.target.value)}
              className="h-8 text-sm mb-2 bg-background"
            />
            <div className="flex gap-2">
                <Button type="submit" size="sm" className="h-7 text-xs w-full">Create</Button>
                <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setIsCreating(false)}>Cancel</Button>
            </div>
          </form>
        )}

        {loading ? (
            <div className="p-4 text-xs text-muted-foreground text-center">Loading...</div>
        ) : channels.length === 0 && !isCreating ? (
            <div className="p-4 text-xs text-muted-foreground text-center">
              No channels yet.<br/>Click + to create one.
            </div>
        ) : (
            channels.map((channel) => (
                <SidebarItem 
                    key={channel.id} 
                    channel={channel} 
                    isActive={channelId === channel.id}
                    onEdit={handleEditChannel}
                    onDelete={handleDeleteChannel}
                />
            ))
        )}
      </div>

      {/* Footer / User */}
      <div className="p-4 border-t border-sidebar-border space-y-1">
        <Sheet>
            <SheetTrigger asChild>
                <Button
                    variant="ghost"
                    className="w-full justify-start gap-2 text-sidebar-foreground hover:bg-sidebar-accent/50 h-9 px-2"
                >
                    <User className="h-4 w-4" />
                    <span className="text-sm">Profile</span>
                </Button>
            </SheetTrigger>
            <SheetContent side="left">
                <SheetHeader className="mb-6">
                    <SheetTitle>Edit Profile</SheetTitle>
                </SheetHeader>
                <ProfileForm />
            </SheetContent>
        </Sheet>

        <Button
            variant="ghost"
            disabled
            className="w-full justify-start gap-2 text-muted-foreground hover:bg-sidebar-accent/50 h-9 px-2 opacity-50 cursor-not-allowed"
        >
            <Settings className="h-4 w-4" />
            <span className="text-sm">Settings</span>
        </Button>

        <Button 
          variant="ghost" 
          className="w-full justify-start gap-2 text-muted-foreground hover:text-destructive h-9 px-2" 
          onClick={handleLogout}
        >
            <LogOut className="h-4 w-4" />
            <span className="text-sm">Sign Out</span>
        </Button>
      </div>
      <SearchOverlay open={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
    </div>
  );
}
