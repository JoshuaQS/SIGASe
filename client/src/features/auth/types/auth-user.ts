/** Alineado con backend (Spring / JWT claims típicos). */
export const ROLE_STUDENT = 'ROLE_STUDENT' as const;
export const ROLE_ADMIN_TI = 'ROLE_ADMIN_TI' as const;
export const ROLE_ADMIN_BIBLIOTECA = 'ROLE_ADMIN_BIBLIOTECA' as const;

export const ADMIN_ROLES = [ROLE_ADMIN_TI, ROLE_ADMIN_BIBLIOTECA] as const;

export type AdminRole = (typeof ADMIN_ROLES)[number];

export type AuthUser = {
  id?: string;
  role: string;
  mustChangePassword?: boolean;
  hasChangedTemporaryPassword?: boolean;
  displayName?: string;
  email?: string;
  token?: string;
  tokenType?: string;
  expiresInSeconds?: number;
};

export function isAdminRole(role?: string | null): role is AdminRole {
  return role === ROLE_ADMIN_TI || role === ROLE_ADMIN_BIBLIOTECA;
}
