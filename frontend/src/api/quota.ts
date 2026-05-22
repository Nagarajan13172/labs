import { api } from "./client";

export interface Quota {
  max_client_peers: number;
  max_domains: number;
  max_databases: number;
}

export const quotaApi = {
  get: () => api.get<Quota>("/quota"),
};
