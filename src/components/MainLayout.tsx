import { Outlet, useParams, useLocation } from "react-router-dom";
import { Sidebar } from "@/components/Sidebar";
import { cn } from "@/lib/utils";

export function MainLayout() {
  const { channelId } = useParams();
  const location = useLocation();
  const isChannelOrStarred = !!channelId || location.pathname === "/starred";
  
  // Mobile responsiveness logic:
  // If we are on mobile (hidden by CSS media queries usually, but handled here via class toggling)
  // and a channel is selected, we might want to hide the sidebar.
  // For this MVP version, we'll stick to a simple split view that collapses on mobile.
  
  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      {/* Sidebar - hidden on mobile if channel is selected */}
      <div className={cn(
        "h-full transition-all duration-300 ease-in-out",
        // Mobile: Show sidebar only if NO channel selected
        isChannelOrStarred ? "hidden md:block" : "block w-full md:w-auto"
      )}>
        <Sidebar />
      </div>

      {/* Main Content Area */}
      <main className={cn(
        "flex-1 h-full flex flex-col min-w-0 bg-background",
        // Mobile: Show content only if channel IS selected
        !isChannelOrStarred ? "hidden md:flex" : "flex"
      )}>
        {isChannelOrStarred ? (
            <Outlet />
        ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground p-8 text-center">
                <div className="max-w-md space-y-2">
                    <h3 className="text-lg font-semibold text-foreground">Welcome to Sendnote</h3>
                    <p>Select a channel from the sidebar to start writing notes to yourself.</p>
                </div>
            </div>
        )}
      </main>
    </div>
  );
}
