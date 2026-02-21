import dotenv from "dotenv";
import { supabaseAdmin } from "./config/supabase.js";
import { processIngestJob } from "./services/ragService.js";

dotenv.config({ path: "../.env" });

const POLL_INTERVAL_MS = parseInt(process.env.INGEST_POLL_INTERVAL_MS || "5000", 10);
const MAX_JOBS_PER_TICK = parseInt(process.env.INGEST_MAX_JOBS_PER_TICK || "2", 10);

async function tick() {
  const { data: jobs, error } = await supabaseAdmin
    .from("ingest_jobs")
    .select("id")
    .eq("status", "queued")
    .order("created_at", { ascending: true })
    .limit(MAX_JOBS_PER_TICK);

  if (error) {
    console.error(`[Worker] Failed to fetch jobs: ${error.message}`);
    return;
  }

  for (const job of jobs || []) {
    try {
      console.log(`[Worker] Processing job ${job.id}`);
      await processIngestJob(job.id);
    } catch (err: any) {
      console.error(`[Worker] Job ${job.id} failed: ${err.message}`);
    }
  }
}

async function run() {
  console.log("[Worker] ScholarSync ingest worker started");
  while (true) {
    await tick();
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }
}

run().catch((err) => {
  console.error(`[Worker] Fatal error: ${err.message}`);
  process.exit(1);
});
