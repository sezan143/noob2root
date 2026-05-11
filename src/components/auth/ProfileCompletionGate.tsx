import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

const EXEMPT_PREFIXES = ["/complete-profile", "/login", "/admin/login", "/admin"];

export default function ProfileCompletionGate() {
  const { user, profile, loading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading || !user || !profile) return;
    if (profile.profile_completed) return;
    if (EXEMPT_PREFIXES.some((p) => location.pathname.startsWith(p))) return;
    navigate(
      `/complete-profile?redirect=${encodeURIComponent(location.pathname + location.search)}`,
      { replace: true }
    );
  }, [user, profile, loading, location.pathname, location.search, navigate]);

  return null;
}
