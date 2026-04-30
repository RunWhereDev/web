import { SecretManagerServiceClient } from "@google-cloud/secret-manager";
import { requireProjectId } from "./config.js";

const secretManager = new SecretManagerServiceClient();
const secretCache = new Map<string, Promise<string>>();

export async function getRequiredSecret(name: string) {
  const cached = secretCache.get(name);

  if (cached) {
    return cached;
  }

  const projectId = requireProjectId();
  const loadPromise = loadSecret(name, projectId);
  secretCache.set(name, loadPromise);

  try {
    return await loadPromise;
  } catch (error) {
    secretCache.delete(name);
    throw error;
  }
}

async function loadSecret(name: string, projectId: string) {
  const [version] = await secretManager.accessSecretVersion({
    name: `projects/${projectId}/secrets/${name}/versions/latest`
  });

  const value = version.payload?.data?.toString().trim();

  if (!value) {
    throw new Error(`Secret Manager returned an empty ${name} payload.`);
  }

  return value;
}
