# Animated GitHub contribution graph — SaiNagendra007

A no-framework, static portfolio page with six Canvas animations, plus a generated SVG contribution grid suitable for a GitHub profile README. Data is fetched during a script/workflow run, never from the visitor's browser.

## What's included

- `scripts/fetch-github.mjs`: GitHub GraphQL API → `data/github.json`
- `scripts/build-readme-svg.mjs`: creates `generated/contribution-grid.svg`
- `index.html`, `styles.css`, `app.js`: responsive page and six animations
- `.github/workflows/update-contributions.yml`: refresh data daily and commit the generated files
- `.github/workflows/deploy-pages.yml`: deploy the page to GitHub Pages
- `data/github.json`: placeholder until you fetch your real data

## 1. Fetch real data locally

Requirements: Node.js 20+ (22 recommended). For local auth, either use GitHub CLI or an environment token.

**Option A — GitHub CLI (easy):**
```bash
gh auth login
gh auth status
npm run update-data
```

**Option B — token in your terminal:**

Create a fine-grained personal access token with access to public profile data. For private contribution counts, the token/account settings must also permit the relevant user contribution data. Never commit a token or paste it into source files.

PowerShell:
```powershell
$env:GITHUB_TOKEN = "YOUR_TOKEN"
npm run update-data
Remove-Item Env:GITHUB_TOKEN
```

macOS/Linux:
```bash
export GITHUB_TOKEN="YOUR_TOKEN"
npm run update-data
unset GITHUB_TOKEN
```

The script writes the actual GraphQL `totalContributions`, dates, daily counts and GitHub `contributionLevel` values. The sum of daily counts may differ from `totalContributions`; the page deliberately displays GitHub's reported total.

## 2. Create the GitHub repository

Create a **public** repository named `github-contribution-animations` under `SaiNagendra007`, then push this project into its `main` branch:

```bash
git init
git add .
git commit -m "Add animated GitHub contribution portfolio"
git branch -M main
git remote add origin https://github.com/SaiNagendra007/github-contribution-animations.git
git push -u origin main
```

If you choose a different repository name, the GitHub Pages URL will use that name.

## 3. Configure daily refresh securely

In the `github-contribution-animations` repository:

1. Open **Settings → Secrets and variables → Actions**.
2. Choose **New repository secret**.
3. Name it `CONTRIBUTION_TOKEN`.
4. Paste your token into the secret value and save it.
5. Open **Settings → Actions → General → Workflow permissions** and enable **Read and write permissions** so the workflow can commit updated JSON/SVG.
6. Open **Actions → Refresh contribution data → Run workflow** to test immediately.

The workflow also runs daily at 03:17 UTC. GitHub scheduled jobs can be delayed during heavy load. The token is injected only into the workflow environment; it is not written into the JSON, site, or logs by this project.

## 4. Publish the animated portfolio

1. Open **Settings → Pages**.
2. Under **Build and deployment**, set **Source** to **GitHub Actions**.
3. Push to `main`, or run **Deploy animated portfolio to GitHub Pages** from the Actions tab.
4. Once deployment succeeds, visit:

   `https://sainagendra007.github.io/github-contribution-animations/`

The page is static and does not need a server-side token. If you change the repository name, update the URL accordingly.

## 5. Add the graph to your GitHub profile README

A profile README is the repository named exactly `SaiNagendra007` owned by your account. If it doesn't exist, create a public repository named `SaiNagendra007` and add a `README.md`.

After the data workflow has generated the SVG, add:

```md
## GitHub Contributions

![GitHub contribution calendar](https://raw.githubusercontent.com/SaiNagendra007/github-contribution-animations/main/generated/contribution-grid.svg)

[Open the animated contribution lab](https://sainagendra007.github.io/github-contribution-animations/)
```

The SVG is an image, so it works in a README. The six Canvas animations are interactive browser code and will **not** execute inside the README itself; the link opens the live portfolio instead.

## 6. Local preview

After `npm run update-data`, serve the folder over HTTP (avoid opening `index.html` directly because browsers restrict `fetch()` from `file://`):

```bash
npx serve .
```

Open the URL printed by the server.

## Data and privacy notes

- The page only downloads `data/github.json`, which contains contribution dates, counts, levels and the account username.
- `GITHUB_TOKEN` is used only by the fetch script or GitHub Actions; never add it to `app.js`, HTML, or a public `.env` file.
- GitHub may omit private contributions unless the account has enabled **Include private contributions on my profile** and the API token has the needed permissions.
- The displayed all-time-window total is GitHub's own `totalContributions`; it is not recomputed from daily squares.
- The calendar may include leading/trailing dates to complete week columns. The animations use the API's order and preserve GitHub's five contribution levels.
- The terminal's pre-animation scramble is decorative; the final characters are based on actual contribution levels.
