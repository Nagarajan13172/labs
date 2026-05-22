import { api } from "./client";
import type { UserRole } from "./types";

export interface AdminStats {
  users_total: number;
  users_verified: number;
  labs_total: number;
  labs_running: number;
  peers_total: number;
  databases_total: number;
}

export interface AdminUser {
  id: string;
  email: string;
  username: string;
  role: UserRole;
  is_verified: boolean;
  is_active: boolean;
  created_at: string;
  labs: number;
  peers: number;
  databases: number;
}

export const adminApi = {
  stats: () => api.get<AdminStats>("/admin/stats"),
  listUsers: () => api.get<AdminUser[]>("/admin/users"),
  setRole: (id: string, role: UserRole) =>
    api.patch<AdminUser>(`/admin/users/${id}/role`, { role }),
  setActive: (id: string, is_active: boolean) =>
    api.patch<AdminUser>(`/admin/users/${id}/active`, { is_active }),
};
