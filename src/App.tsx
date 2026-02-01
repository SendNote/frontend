import { BrowserRouter, Route, Routes } from "react-router-dom";
import { AuthProvider } from "@/components/AuthProvider";
import { AuthPage } from "@/components/AuthPage";
import { PrivateRoute } from "@/components/PrivateRoute";
import { MainLayout } from "@/components/MainLayout";
import { ChatWindow } from "@/components/ChatWindow";
import { ProfilePage } from "@/components/ProfilePage";
import "./index.css";

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<AuthPage />} />
          <Route element={<PrivateRoute />}>
            <Route path="/" element={<MainLayout />}>
              <Route path="channel/:channelId" element={<ChatWindow />} />
            </Route>
            <Route path="/profile" element={<ProfilePage />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
