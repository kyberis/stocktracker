#!/usr/bin/env node

import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";

const RELEASE_NOTES_PATH = "src/lib/release-notes.ts";
const PRODUCT_SPECS_PREFIX = "knowledge/product-specs/";
const PRODUCT_SPECS_INDEX = "knowledge/product-specs/index.md";
const LANDING_PAGE_PATH = "src/app/landing/page.tsx";
const LANDING_REVIEW_MARKER = ".cursor/feature-gate.json";

function run(command) {
  return execSync(command, { encoding: "utf8" }).trim();
}

function getBaseRef() {
  const githubBaseRef = process.env.GITHUB_BASE_REF;
  if (githubBaseRef) {
    return `origin/${githubBaseRef}`;
  }

  try {
    run("git show-ref --verify --quiet refs/remotes/origin/main");
    return "origin/main";
  } catch {
    try {
      run("git show-ref --verify --quiet refs/heads/main");
      return "main";
    } catch {
      return "HEAD~1";
    }
  }
}

function splitLines(content) {
  if (!content) return [];
  return content.split("\n").map((line) => line.trim()).filter(Boolean);
}

function parseLandingMarkerFromDiff(diffText) {
  const reviewedAdded =
    /^\+\s*"landingPageReviewed"\s*:\s*true/m.test(diffText) ||
    /^\+\s*"landingPageReviewed"\s*:\s*true\s*,/m.test(diffText);
  return reviewedAdded;
}

function readJson(path) {
  if (!existsSync(path)) return null;
  return JSON.parse(readFileSync(path, "utf8"));
}

const baseRef = getBaseRef();
const mergeBase = run(`git merge-base ${baseRef} HEAD`);
const changedFiles = splitLines(run(`git diff --name-only ${mergeBase}...HEAD`));

const changedSet = new Set(changedFiles);
const releaseNotesDiff = run(`git diff -U0 ${mergeBase}...HEAD -- ${RELEASE_NOTES_PATH}`);

const addedFeatureEntry =
  /^\+\s*type:\s*["']feature["']/m.test(releaseNotesDiff) ||
  /^\+\s*type:\s*["']feature["'],/m.test(releaseNotesDiff);

const productSpecChanged = changedFiles.some(
  (file) =>
    file.startsWith(PRODUCT_SPECS_PREFIX) &&
    file !== PRODUCT_SPECS_INDEX &&
    file.endsWith(".md"),
);

const landingPageChanged = changedSet.has(LANDING_PAGE_PATH);
const markerChanged = changedSet.has(LANDING_REVIEW_MARKER);
const markerDiff = markerChanged
  ? run(`git diff -U0 ${mergeBase}...HEAD -- ${LANDING_REVIEW_MARKER}`)
  : "";
const markerSetsLandingReviewed = parseLandingMarkerFromDiff(markerDiff);

const featureDetected = addedFeatureEntry || productSpecChanged;

if (!featureDetected) {
  console.log("Feature guard: no feature signal found in this PR, skipping.");
  process.exit(0);
}

const errors = [];

if (!addedFeatureEntry) {
  errors.push(
    `Missing feature release note entry in \`${RELEASE_NOTES_PATH}\` (add \`type: "feature"\`).`,
  );
}

if (!productSpecChanged) {
  errors.push(
    `Missing product spec update under \`${PRODUCT_SPECS_PREFIX}\` (excluding index).`,
  );
}

if (!landingPageChanged && !markerSetsLandingReviewed) {
  errors.push(
    `Landing page check missing: update \`${LANDING_PAGE_PATH}\` or update \`${LANDING_REVIEW_MARKER}\` with \`"landingPageReviewed": true\` in this PR.`,
  );
}

if (errors.length > 0) {
  console.error("Feature guard failed:");
  for (const error of errors) {
    console.error(`- ${error}`);
  }

  const markerJson = readJson(LANDING_REVIEW_MARKER);
  if (markerJson) {
    console.error("\nCurrent landing review marker content:");
    console.error(JSON.stringify(markerJson, null, 2));
  }

  process.exit(1);
}

console.log("Feature guard passed.");
