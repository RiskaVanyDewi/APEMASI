import { Navigate, useLocation } from "react-router-dom";
import { getAuth } from "../lib/auth";

export default function ProtectedRoute({ allow = [], children }) {
  const loc = useLocation();
  const auth = getAuth();

  // Debug logging
  console.log("ProtectedRoute check:", {
    path: loc.pathname,
    auth,
    allow,
    hasAuth: !!auth,
    isAllowed: auth && allow.length ? allow.includes(auth.role) : true,
  });

  // Tidak ada authentication
  if (!auth) {
    return <Navigate to="/login" replace state={{ from: loc.pathname }} />;
  }

  // Ada allow list tapi role tidak sesuai
  if (allow.length && !allow.includes(auth.role)) {
    console.warn(`Access denied: role '${auth.role}' not in allowed: ${allow.join(", ")}`);
    return <Navigate to="/" replace />;
  }

  return children;
}
