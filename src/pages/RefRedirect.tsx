import { useEffect } from "react";
import { Navigate, useParams } from "react-router-dom";

export default function RefRedirect() {
  const { code } = useParams<{ code: string }>();
  useEffect(() => {
    if (code) {
      try {
        localStorage.setItem("ntr_ref_code", code.toLowerCase().trim());
      } catch {
        /* ignore */
      }
    }
  }, [code]);
  return <Navigate to="/login?mode=signup" replace />;
}
