import { Navigate } from "react-router-dom";
import useAuthStore from "../store/authStore";

function RequireAuth({ children }) {
  const user = useAuthStore((state) => state.user);

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

export default RequireAuth;