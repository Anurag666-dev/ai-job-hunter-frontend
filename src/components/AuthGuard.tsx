// AuthGuard — redirects to /signin if not authenticated or token is expired
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '@/store/useAuthStore';

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const logout = useAuthStore((state) => state.logout);
  const user = useAuthStore((state) => state.user);

  if (!user) {
    return <Navigate to="/signin" replace />;
  }

  try {
    const currentTime = Date.now() / 1000;
    if (user.session_exp && user.session_exp <= currentTime) {
      logout();
      return <Navigate to="/signin" replace />;
    }
    return <>{children}</>;
  } catch {
    logout();
    return <Navigate to="/signin" replace />;
  }
}