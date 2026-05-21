import { api } from "./client";
import type { DatabaseEngine, ManagedDatabase } from "./types";

export interface EngineInfo {
  engine: string;
  host: string;
  port: number;
}

export const servicesApi = {
  listEngines: () => api.get<EngineInfo[]>("/services/engines"),
  listDatabases: () => api.get<ManagedDatabase[]>("/services/databases"),
  createDatabase: (engine: DatabaseEngine, name: string) =>
    api.post<ManagedDatabase>("/services/databases", { engine, name }),
  deleteDatabase: (id: string) => api.del<null>(`/services/databases/${id}`),
};
