export function requireProjectId() {
  const projectId = process.env.RUNWHERE_GCP_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT || process.env.GCP_PROJECT;

  if (!projectId) {
    throw new Error("Missing required Google Cloud project ID environment variable.");
  }

  return projectId;
}
