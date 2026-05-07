import { spawnSync } from "node:child_process";
import path from "node:path";

function runStep(label, cwd, args) {
  console.log(`\n== ${label} ==`);
  const result = spawnSync("npm", args, {
    cwd,
    env: process.env,
    stdio: "inherit",
  });
  if (result.status !== 0) {
    throw new Error(`${label} failed with exit code ${result.status ?? "unknown"}`);
  }
}

function main() {
  if (!process.env.IDP_BASE_URL || !process.env.IDP_SERVICE_TOKEN) {
    console.error("Missing IDP_BASE_URL or IDP_SERVICE_TOKEN env vars.");
    process.exit(1);
  }

  const forwarded = process.argv.slice(2);
  const npmArgs = ["run", "idp:migrate-users"];
  if (forwarded.length > 0) {
    npmArgs.push("--", ...forwarded);
  }

  const root = process.cwd();
  runStep("trefolio migration", root, npmArgs);
  runStep("Clara migration", path.join(root, "external/etracker"), npmArgs);
  runStep("Will migration", path.join(root, "external/notetaker"), npmArgs);

  console.log("\nAll migrations finished.");
}

main();
