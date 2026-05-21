import { api } from "./client";
import type { Lab, LabCredentials } from "./types";

export const labsApi = {
  get: () => api.get<Lab | null>("/labs"),
  deploy: () => api.post<Lab>("/labs/deploy"),
  stop: () => api.post<Lab>("/labs/stop"),
  start: () => api.post<Lab>("/labs/start"),
  destroy: () => api.del<null>("/labs"),
  credentials: () => api.get<LabCredentials>("/labs/credentials"),
};
