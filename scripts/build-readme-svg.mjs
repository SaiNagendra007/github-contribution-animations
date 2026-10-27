import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const data = JSON.parse(readFileSync(resolve(root, "data/github.json"), "utf8"));
if (!data.days?.length) throw new Error("No contribution data found. Run `npm run fetch-data` first.");

const palette = ["#ebedf0", "#9be9a8", "#40c463", "#30a14e", "#216e39"];
const cell = 11, gap = 3, step = cell + gap, left = 28, top = 38;
const cols = Math.ceil(data.days.length / 7);
const width = left + cols * step + 10;
const height = top + 7 * step + 30;
const esc = (s) => String(s).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll('"', "&quot;");
const rects = data.days.map((day, i) => {
  const col = Math.floor(i / 7), row = i % 7;
  const x = left + col * step, y = top + row * step;
  const label = `${day.count} contributions on ${day.date}`;
  return `<rect x="${x}" y="${y}" width="${cell}" height="${cell}" rx="2" fill="${palette[day.level]}"><title>${esc(label)}</title></rect>`;
}).join("\n");
const monthLabels = [];
let lastMonth = "";
data.days.forEach((day, i) => {
  const month = day.date.slice(0, 7);
  if (month !== lastMonth) {
    monthLabels.push(`<text x="${left + Math.floor(i / 7) * step}" y="25">${new Date(`${day.date}T12:00:00Z`).toLocaleString("en", { month: "short", timeZone: "UTC" })}</text>`);
    lastMonth = month;
  }
});
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="GitHub contribution calendar for ${esc(data.username)}">
<rect width="100%" height="100%" rx="10" fill="#ffffff"/>
<g font-family="Arial,sans-serif" fill="#24292f">
<text x="18" y="18" font-size="12" font-weight="600">${esc(data.totalContributions)} contributions in the last year</text>
<g font-size="9" fill="#57606a">${monthLabels.join("")}
<text x="3" y="${top + 9}">Mon</text><text x="3" y="${top + 4 * step + 9}">Fri</text></g>
${rects}
<text x="18" y="${height - 9}" font-size="9" fill="#57606a">Less</text>
${palette.map((color, i) => `<rect x="${48 + i * 15}" y="${height - 18}" width="10" height="10" rx="2" fill="${color}"/>`).join("")}
<text x="${width - 36}" y="${height - 9}" font-size="9" fill="#57606a">More</text>
</g></svg>`;
const out = resolve(root, "generated/contribution-grid.svg");
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, svg);
console.log(`Wrote ${out}`);
