import { execSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");
const username = process.env.GITHUB_USERNAME || "SaiNagendra007";
const output = resolve(root, "data/github.json");
const LEVEL = {
  NONE: 0,
  FIRST_QUARTILE: 1,
  SECOND_QUARTILE: 2,
  THIRD_QUARTILE: 3,
  FOURTH_QUARTILE: 4
};

let token = process.env.GITHUB_TOKEN;
if (!token) {
  try {
    token = execSync("gh auth token", { stdio: ["ignore", "pipe", "ignore"] }).toString().trim();
  } catch {
    throw new Error(
      "Missing GITHUB_TOKEN. Set it in your shell, or install GitHub CLI and run `gh auth login`."
    );
  }
}
if (!token) throw new Error("GitHub token is empty.");

const query = `
  query($login: String!) {
    user(login: $login) {
      login
      contributionsCollection {
        contributionCalendar {
          totalContributions
          weeks {
            contributionDays {
              date
              contributionCount
              contributionLevel
            }
          }
        }
      }
    }
  }
`;

const response = await fetch("https://api.github.com/graphql", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    "User-Agent": "github-contribution-animations"
  },
  body: JSON.stringify({ query, variables: { login: username } })
});

if (!response.ok) {
  throw new Error(`GitHub GraphQL returned HTTP ${response.status}: ${await response.text()}`);
}
const payload = await response.json();
if (payload.errors?.length) {
  throw new Error(payload.errors.map((error) => error.message).join("\n"));
}
const user = payload.data?.user;
if (!user) throw new Error(`GitHub user "${username}" was not found or is not accessible.`);

const calendar = user.contributionsCollection.contributionCalendar;
const days = calendar.weeks.flatMap((week) => week.contributionDays);
if (!days.length) throw new Error("GitHub returned an empty contribution calendar.");

const result = {
  username: user.login,
  start: days[0].date,
  end: days.at(-1).date,
  totalContributions: calendar.totalContributions,
  counts: days.map((day) => day.contributionCount),
  levels: days.map((day) => String(LEVEL[day.contributionLevel] ?? 0)).join(""),
  days: days.map((day) => ({
    date: day.date,
    count: day.contributionCount,
    level: LEVEL[day.contributionLevel] ?? 0,
    contributionLevel: day.contributionLevel
  })),
  generatedAt: new Date().toISOString()
};

mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, `${JSON.stringify(result, null, 2)}\n`);
console.log(`Saved ${days.length} days for ${user.login}; GitHub total: ${calendar.totalContributions}.`);
