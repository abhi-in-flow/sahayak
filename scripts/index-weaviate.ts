import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import weaviate, { vectors } from "weaviate-client";
import { CIVIC_COLLECTION, type CivicProperties } from "../app/_lib/weaviate";

interface SeedChunk {
  id: string;
  title: string;
  url: string;
  fetchedAt: string;
  text: string;
}

const BATCH = 200;
const FETCHED_AT = "2026-08-29";

const ASSAM_SEED = new Set([
  "t1-death-cert",
  "gmc-office",
  "t1-fee",
  "docs-t1",
  "legal-aid-kamrup",
  "practice-form",
  "bakijai-clearance",
  "income-certificate-assam",
]);

interface ExtractedService {
  service_name: string;
  service_url: string;
  state_or_union_territory: string;
  metadata?: { is_online_application_available?: boolean };
}

function env(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is not set`);
  }
  return value;
}

function directoryRows(): CivicProperties[] {
  const raw = JSON.parse(readFileSync(resolve("services-corpus.json"), "utf8")) as {
    india_gov_services?: ExtractedService[];
  };
  return (raw.india_gov_services ?? []).map((service) => {
    const online = service.metadata?.is_online_application_available
      ? "An online application is listed."
      : "No online application is listed in this snapshot.";
    return {
      title: service.service_name,
      url: service.service_url,
      region: service.state_or_union_territory,
      source: "directory",
      fetchedAt: FETCHED_AT,
      text: `${service.service_name}. State or UT: ${service.state_or_union_territory}. ${online} Official listing: ${service.service_url}. This is a static snapshot collected by the team, not a live government system.`,
    };
  });
}

function seedRows(): CivicProperties[] {
  const seed = JSON.parse(readFileSync(resolve("app/_lib/rag/corpus.json"), "utf8")) as SeedChunk[];
  return seed.map((chunk) => ({
    title: chunk.title,
    text: chunk.text,
    url: chunk.url,
    region: ASSAM_SEED.has(chunk.id) ? "Assam" : "National",
    source: "seed",
    fetchedAt: chunk.fetchedAt,
  }));
}

async function main() {
  const client = await weaviate.connectToWeaviateCloud(env("WEAVIATE_URL"), {
    authCredentials: new weaviate.ApiKey(env("WEAVIATE_API_KEY")),
    skipInitChecks: true,
    timeout: { init: 30, query: 60, insert: 120 },
  });

  try {
    if (await client.collections.exists(CIVIC_COLLECTION)) {
      await client.collections.delete(CIVIC_COLLECTION);
      console.log(`Deleted existing ${CIVIC_COLLECTION}`);
    }

    await client.collections.create({
      name: CIVIC_COLLECTION,
      vectorizers: vectors.text2VecWeaviate({ sourceProperties: ["title", "text"] }),
      properties: [
        { name: "title", dataType: "text" },
        { name: "text", dataType: "text" },
        { name: "url", dataType: "text", skipVectorization: true },
        { name: "region", dataType: "text", skipVectorization: true },
        { name: "source", dataType: "text", skipVectorization: true },
        { name: "fetchedAt", dataType: "text", skipVectorization: true },
      ],
    });
    console.log(`Created ${CIVIC_COLLECTION}`);

    const rows = [...directoryRows(), ...seedRows()];
    const collection = client.collections.use(CIVIC_COLLECTION);
    let failed = 0;

    for (let i = 0; i < rows.length; i += BATCH) {
      const slice = rows.slice(i, i + BATCH);
      const result = await collection.data.insertMany(slice as unknown as Record<string, string>[]);
      if (result.hasErrors) {
        failed += Object.keys(result.errors).length;
        console.error(`Batch ${i / BATCH + 1} errors: ${Object.keys(result.errors).length}`);
      } else {
        console.log(`Indexed ${Math.min(i + BATCH, rows.length)} / ${rows.length}`);
      }
    }

    const count = await collection.length();
    console.log(`Done. objects=${count} failed=${failed}`);
    if (failed > 0) process.exitCode = 1;
  } finally {
    await client.close();
  }
}

main().catch((error) => {
  const name = error instanceof Error ? error.name : "Error";
  const message = error instanceof Error ? error.message.replace(/https?:\/\/\S+/g, "[url]") : "";
  console.error(`index failed: ${name} ${message.slice(0, 240)}`);
  process.exitCode = 1;
});
