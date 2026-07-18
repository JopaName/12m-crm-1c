import { useAuth } from "../context/AuthContext";
import { ReactNode } from "react";

interface Props {
  permission: string;
  children: ReactNode;
  fallback?: ReactNode;
}

export function RequirePermission({ permission, children, fallback = null }: Props) {
  const { user } = useAuth();
  const has = user?.permissions?.includes(permission);
  return has ? <>{children}</> : <>{fallback}</>;
}
