import { api } from "./client";

export interface JobEnqueueResult {
  task_id: string;
  topic: string;
}

export interface JobStatus {
  task_id: string;
  state: string; // PENDING | STARTED | SUCCESS | FAILURE | ...
  result: unknown;
}

export const jobsApi = {
  runSample: () => api.post<JobEnqueueResult>("/jobs/sample"),
  status: (taskId: string) => api.get<JobStatus>(`/jobs/${taskId}`),
};
