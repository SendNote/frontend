import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/components/AuthProvider";

export function PrivateRoute() {
  const { session, loading } = useAuth();

  if (loading) {
    return <div className="flex h-screen items-center justify-center">Loading...</div>;
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
