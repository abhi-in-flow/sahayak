import weaviate, { type WeaviateClient } from "weaviate-client";

export const CIVIC_COLLECTION = "CivicService";

let client: WeaviateClient | null = null;

export function hasWeaviate(): boolean {
  return Boolean(process.env.WEAVIATE_URL && process.env.WEAVIATE_API_KEY);
}

export async function getWeaviate(): Promise<WeaviateClient> {
  const url = process.env.WEAVIATE_URL;
  const key = process.env.WEAVIATE_API_KEY;
  if (!url || !key) {
    throw new Error("WEAVIATE_URL or WEAVIATE_API_KEY is not set");
  }
  if (!client) {
    client = await weaviate.connectToWeaviateCloud(url, {
      authCredentials: new weaviate.ApiKey(key),
      skipInitChecks: true,
      timeout: { init: 30, query: 60, insert: 120 },
    });
  }
  return client;
}

export interface CivicProperties {
  title: string;
  text: string;
  url: string;
  region: string;
  source: string;
  fetchedAt: string;
}
