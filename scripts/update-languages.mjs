#!/usr/bin/env node
/**
 * Refreshes data/languages.json: the language mix of the projects whose repos are private, so the
 * homepage can draw their language ring and hover chart from a static file instead of calling the
 * GitHub API from the browser (which can't see private repos, and rate-limits visitors anyway).
 *
 * Input (environment):
 *   LANGUAGE_STATS_REPOS  JSON object, public project key -> "owner/repo".
 *                         e.g. {"what-the-bill":"some-org/what-the-bill"}
 *                         The keys match the data-lang-key attributes in index.html.
 *   GH_TOKEN              a token that can read those repos (read-only is enough). A fine-grained
 *                         token only covers one owner, so this assumes every repo has the same one.
 *                         Locally: GH_TOKEN="$(gh auth token)" node scripts/update-languages.mjs
 *
 * Output: data/languages.json, { key: [[language, percent], ...] }, largest first. Only shares are
 * stored (never byte counts), and only the public key is ever written or logged: this repo and its
 * Actions logs are public, the repos behind the keys are not.
 *
 * All or nothing: if any repo can't be read the run fails and the existing file is left alone.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";

const OUTPUT = new URL("../data/languages.json", import.meta.url);

const fail = (message) => {
  console.error(message);
  process.exit(1);
};

const readJsonObject = (name) => {
  const raw = process.env[name];
  if (!raw) fail(`${name} is not set.`);
  let value;
  try {
    value = JSON.parse(raw);
  } catch {
    fail(`${name} is not valid JSON.`); // never echo the value: it may be a secret
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) fail(`${name} must be a JSON object.`);
  return value;
};

const repos = readJsonObject("LANGUAGE_STATS_REPOS");
const token = process.env.GH_TOKEN;
if (!token) fail("GH_TOKEN is not set.");

const REPO_SLUG = /^[\w.-]+\/[\w.-]+$/;

const fetchLanguages = async (slug) => {
  if (!REPO_SLUG.test(slug)) throw new Error('the repo must look like "owner/name"');

  const res = await fetch(`https://api.github.com/repos/${slug}/languages`, {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "language-stats-job",
    },
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} (is the token allowed to read this repo?)`);
  return res.json();
};

// Bytes -> percentages, largest first (ties by name so the file is stable between runs).
const toShares = (bytesByLanguage) => {
  const entries = Object.entries(bytesByLanguage)
    .filter(([, bytes]) => Number.isFinite(bytes) && bytes > 0)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  const total = entries.reduce((sum, [, bytes]) => sum + bytes, 0);
  return entries
    .map(([name, bytes]) => [name, Math.round((bytes / total) * 10000) / 100])
    .filter(([, percent]) => percent > 0);
};

const result = {};
const problems = [];
for (const key of Object.keys(repos).sort()) {
  try {
    const shares = toShares(await fetchLanguages(String(repos[key])));
    if (shares.length) result[key] = shares;
    else console.log(`${key}: no language data yet, skipped`);
  } catch (error) {
    problems.push(`${key}: ${error.message}`); // the key is public; the repo slug never is logged
  }
}

if (problems.length) fail(`Could not refresh the language stats, existing file left untouched:\n${problems.join("\n")}`);

// One project per line keeps the diffs of a daily job readable.
const body = Object.keys(result)
  .map((key) => `  ${JSON.stringify(key)}: ${JSON.stringify(result[key])}`)
  .join(",\n");
const next = `{\n${body}\n}\n`;

const previous = await readFile(OUTPUT, "utf8").catch(() => null);
if (previous === next) {
  console.log(`Unchanged (${Object.keys(result).length} projects).`);
} else {
  await mkdir(new URL("./", OUTPUT), { recursive: true });
  await writeFile(OUTPUT, next);
  console.log(`Wrote ${Object.keys(result).length} projects.`);
}
