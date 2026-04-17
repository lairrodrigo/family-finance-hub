import { useAuth } from "@/contexts/AuthContext";

export type AppRole = 'admin' | 'member' | 'viewer';

export const usePermissions = () => {
  const { role, user } = useAuth();

  const isAdmin = role === 'admin';
  const isMember = role === 'member';
  const isViewer = role === 'viewer';

  // Specific Permission Checks
  const canManageFamily = isAdmin;
  
  const canCreateTransaction = isAdmin || isMember;
  
  // Members can only edit their own transactions, Admins can edit all
  const canEditTransaction = (ownerId?: string) => {
    if (isAdmin) return true;
    if (isMember && user?.id === ownerId) return true;
    return false;
  };

  const canDeleteTransaction = canEditTransaction;

  const canManageAssets = isAdmin; // Cards, Goals, Accounts
  const canViewAssets = isAdmin || isMember || isViewer;

  const canEditShoppingList = isAdmin || isMember;

  return {
    role,
    isAdmin,
    isMember,
    isViewer,
    canManageFamily,
    canCreateTransaction,
    canEditTransaction,
    canDeleteTransaction,
    canManageAssets,
    canViewAssets,
    canEditShoppingList
  };
};
