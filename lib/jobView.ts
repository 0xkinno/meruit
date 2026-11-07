import { jobs, isValidJobId, type Job } from "./jobs";
import { backendName } from "./store";

export async function loadJob(id: string): Promise<{ job: Job | null; error?: string }> {
  if (!isValidJobId(id)) return { job: null, error: "That is not a valid job id." };
  if (backendName() === "unconfigured") return { job: null, error: "Job storage is not configured on this deployment." };
  try {
    return { job: await jobs.get(id) };
  } catch (e) {
    return { job: null, error: (e as Error).message };
  }
}
