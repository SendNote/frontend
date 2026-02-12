import { BrowserRouter, Route, Routes } from "react-router-dom";
import { AuthProvider } from "@/components/AuthProvider";
import { ChatCacheProvider } from "@/contexts/ChatCacheContext";
import { AuthPage } from "@/components/AuthPage";
import { PrivateRoute } from "@/components/PrivateRoute";
import { MainLayout } from "@/components/MainLayout";
import { ChatWindow } from "@/components/ChatWindow";
import { StarredMessages } from "@/components/StarredMessages";
import { ProfilePage } from "@/components/ProfilePage";
import "./index.css";
import "./styles/markdown.css";

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ChatCacheProvider>
          <Routes>
            <Route path="/login" element={<AuthPage />} />
            <Route element={<PrivateRoute />}>
              <Route path="/" element={<MainLayout />}>
                <Route path="starred" element={<StarredMessages />} />
                <Route path="channel/:channelId" element={<ChatWindow />} />
              </Route>
              <Route path="/profile" element={<ProfilePage />} />
            </Route>
          </Routes>
        </ChatCacheProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
