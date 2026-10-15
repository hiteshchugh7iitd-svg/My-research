# Hitesh · research website

Static site + browser admin panel.

- **Edit the site:** open `https://YOUR-SITE.netlify.app/admin/`, log in with GitHub, edit, click Publish. Netlify rebuilds in about a minute.
- **What you can edit:** homepage, menu, every page, new pages, projects, papers (PDF upload), progress, news, and private pages. Every page has a "Page sections" builder (text, cards, timeline, downloads, image, embed, buttons).
- **Private area:** everything under `/private/` is password-protected by `netlify/edge-functions/private-auth.js`.
- **Content lives in** `content/`; uploads in `static/uploads/` (public) and `static/private/files/` (private).
- **Old dashboards** (Lao PDR, Delhi maps) are kept unchanged in `static/dashboard/`.

## One-time Netlify setup
1. Keep this repository **private** (private files are stored in it).
2. Netlify > Add new site > Import from GitHub > pick this repo, branch `main`. Build settings come from `netlify.toml`.
3. Site configuration > Environment variables: add `PRIVATE_PASSWORD` (required) and optionally `PRIVATE_USER` (default `hitesh`).
4. Site configuration > Access & security > OAuth > Install provider > GitHub (create a GitHub OAuth app; callback `https://api.netlify.com/auth/done`). This lets `/admin` log you in.
5. Edit `static/admin/config.yml` if your repo or branch name differs.

Local preview: `npm install && npm start`.
