import { useAuth } from "../context/AuthContext";

export function usePermission() {
  const { user } = useAuth();

  const hasPermission = (permission: string): boolean => {
    return user?.permissions?.includes(permission) ?? false;
  };

  const hasAnyPermission = (...permissions: string[]): boolean => {
    return permissions.some((p) => user?.permissions?.includes(p));
  };

  const hasAllPermissions = (...permissions: string[]): boolean => {
    return permissions.every((p) => user?.permissions?.includes(p));
  };

  return { permissions: user?.permissions ?? [], hasPermission, hasAnyPermission, hasAllPermissions };
}
