// Static site generator: reads /content (edited via /admin) and writes /dist.
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { marked } from "marked";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const CONTENT = path.join(ROOT, "content");
const DIST = path.join(ROOT, "dist");

const esc = (s = "") => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const md = (s = "") => marked.parse(String(s ?? ""));
const url = (u = "") => (u && !/^(https?:|mailto:|\/|#)/.test(u) ? "/" + u : u);
const fmtDate = (d) => {
  if (!d) return "";
  const dt = new Date(d);
  return isNaN(dt) ? String(d) : dt.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
};
const ts = (d) => (d ? new Date(d).getTime() || 0 : 0);

function readDir(dir) {
  const abs = path.join(CONTENT, dir);
  if (!fs.existsSync(abs)) return [];
  return fs.readdirSync(abs).filter((f) => f.endsWith(".md")).map((f) => {
    const { data, content } = matter(fs.readFileSync(path.join(abs, f), "utf8"));
    return { ...data, slug: f.replace(/\.md$/, ""), body: content };
  }).filter((x) => !x.draft);
}
const readJson = (f, fallback = {}) => {
  try { return JSON.parse(fs.readFileSync(path.join(CONTENT, f), "utf8")); } catch { return fallback; }
};

const settings = readJson("settings.json");
const home = matter(fs.readFileSync(path.join(CONTENT, "home.md"), "utf8"));
const projects = readDir("projects").sort((a, b) => (a.order ?? 99) - (b.order ?? 99));
const pages = readDir("pages");
const news = readDir("news").sort((a, b) => ts(b.date) - ts(a.date));
const papers = readDir("papers").sort((a, b) => ts(b.date) - ts(a.date));
const progress = readDir("progress").sort((a, b) => ts(b.date) - ts(a.date));
const privPages = readDir("private/pages");
const privPapers = readDir("private/papers").sort((a, b) => ts(b.date) - ts(a.date));

const projTitle = (slug) => projects.find((p) => p.slug === slug)?.title;

/* ---------- layout ---------- */
function navItems(isPrivate) {
  const items = (settings.nav || []).map((n) => ({ label: n.label, href: n.url, order: n.order ?? 50 }));
  for (const p of pages) if (p.show_in_menu) items.push({ label: p.menu_label || p.title, href: `/${p.slug}/`, order: p.menu_order ?? 60 });
  return items.sort((a, b) => a.order - b.order);
}

function layout({ title, description, body, path: p = "/", isPrivate = false, wide = false }) {
  const site = settings.site_title || "Research";
  const full = title && title !== site ? `${title} · ${site}` : site;
  const nav = navItems(isPrivate).map((n) => `<a href="${esc(n.href)}"${n.href === p ? ' aria-current="page"' : ""}>${esc(n.label)}</a>`).join("");
  const social = (settings.links || []).map((l) => `<a href="${esc(l.url)}" rel="noopener">${esc(l.label)}</a>`).join(" · ");
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(full)}</title>
<meta name="description" content="${esc(description || settings.tagline || "")}">
${isPrivate ? '<meta name="robots" content="noindex,nofollow">' : ""}
<link rel="icon" href="/favicon.svg"><link rel="stylesheet" href="/css/site.css"></head>
<body>
<header class="top"><div class="wrap bar">
  <a class="brand" href="/"><span class="mark">${esc((settings.author || "H").trim().charAt(0))}</span><span><strong>${esc(site)}</strong><small>${esc(settings.site_subtitle || "")}</small></span></a>
  <button class="menu-btn" aria-label="Menu" onclick="document.body.classList.toggle('open')">Menu</button>
  <nav>${nav}<a class="login" href="/private/">Private</a></nav>
</div></header>
${isPrivate ? '<div class="privbar">Private area. Visible only to you. Not indexed.</div>' : ""}
<main>${body}</main>
<footer><div class="wrap"><p>${md(settings.footer_text || "").replace(/<\/?p>/g, "")}</p><p class="small">${social}</p></div></footer>
</body></html>`;
}

/* ---------- blocks (page builder) ---------- */
function auto(kind, b) {
  const n = b.count || 3;
  if (kind === "projects") return `<div class="cards">${projects.map((p) => card(p.title, p.summary, `/research/${p.slug}/`, p.status)).join("")}</div>`;
  if (kind === "news") return `<div class="rows">${news.slice(0, n).map((x) => `<a class="row" href="/news/${x.slug}/"><time>${fmtDate(x.date)}</time><span>${esc(x.title)}</span></a>`).join("")}</div><p><a class="more" href="/news/">All news →</a></p>`;
  if (kind === "papers") return paperList(papers.slice(0, n)) + `<p><a class="more" href="/papers/">All papers →</a></p>`;
  if (kind === "progress") return timeline(progress.slice(0, n).map((x) => ({ date: fmtDate(x.date), title: x.title, text: x.summary, tag: projTitle(x.project) }))) + `<p><a class="more" href="/progress/">Full timeline →</a></p>`;
  return "";
}
const card = (title, text, href, tag) => `<a class="card" href="${esc(href || "#")}">${tag ? `<span class="tag">${esc(tag)}</span>` : ""}<h3>${esc(title)}</h3><p>${esc(text || "")}</p></a>`;
const timeline = (items) => `<ol class="timeline">${items.map((i) => `<li><time>${esc(i.date || "")}</time><div>${i.tag ? `<span class="tag">${esc(i.tag)}</span>` : ""}<h3>${esc(i.title)}</h3>${i.text ? `<p>${esc(i.text)}</p>` : ""}</div></li>`).join("")}</ol>`;
const files = (items) => `<ul class="files">${items.map((i) => `<li><a href="${esc(url(i.file || i.url))}">${esc(i.title || i.file)}</a>${i.note ? `<span>${esc(i.note)}</span>` : ""}</li>`).join("")}</ul>`;

function block(b) {
  const h = b.heading ? `<h2>${esc(b.heading)}</h2>` : "";
  const sec = (inner, cls = "") => `<section class="block ${cls}"><div class="wrap">${h}${inner}</div></section>`;
  switch (b.type) {
    case "text": return sec(`<div class="prose">${md(b.body)}</div>`);
    case "cards": return sec(`<div class="cards">${(b.items || []).map((i) => card(i.title, i.text, i.link, i.tag)).join("")}</div>`);
    case "timeline": return sec(timeline(b.items || []));
    case "files": return sec(files(b.items || []));
    case "image": return sec(`<figure><img src="${esc(url(b.image))}" alt="${esc(b.caption || "")}">${b.caption ? `<figcaption>${esc(b.caption)}</figcaption>` : ""}</figure>`);
    case "embed": return sec(b.embed_url ? `<iframe class="embed" src="${esc(url(b.embed_url))}" style="height:${+b.height || 600}px" loading="lazy"></iframe>` : b.html || "", "wide");
    case "buttons": return sec(`<p class="btns">${(b.items || []).map((i) => `<a class="btn" href="${esc(url(i.url))}">${esc(i.label)}</a>`).join("")}</p>`);
    case "auto_projects": return sec(auto("projects", b));
    case "auto_news": return sec(auto("news", b));
    case "auto_papers": return sec(auto("papers", b));
    case "auto_progress": return sec(auto("progress", b));
    default: return "";
  }
}
const blocks = (list = []) => list.map(block).join("");

function pageHead(title, lead, extra = "") {
  return `<section class="pagehead"><div class="wrap"><h1>${esc(title)}</h1>${lead ? `<p class="lead">${esc(lead)}</p>` : ""}${extra}</div></section>`;
}
const statusPill = (s) => (s ? `<span class="pill s-${esc(String(s).toLowerCase().replace(/\W+/g, "-"))}">${esc(s)}</span>` : "");

function paperList(list, priv = false) {
  if (!list.length) return `<p class="muted">Nothing here yet.</p>`;
  return `<ul class="papers">${list.map((p) => `<li>
    <div class="ph"><h3>${esc(p.title)}</h3>${statusPill(p.status)}</div>
    <p class="meta">${[p.authors, p.venue, fmtDate(p.date), projTitle(p.project)].filter(Boolean).map(esc).join(" · ")}</p>
    ${p.abstract ? `<details><summary>Abstract</summary><p>${esc(p.abstract)}</p></details>` : ""}
    <p class="btns">${p.file ? `<a class="btn" href="${esc(url(p.file))}">Download</a>` : ""}${p.link ? `<a class="btn ghost" href="${esc(p.link)}" rel="noopener">Open link</a>` : ""}</p>
  </li>`).join("")}</ul>`;
}

/* ---------- writers ---------- */
function write(rel, html) {
  const out = path.join(DIST, rel, "index.html");
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, html);
}
fs.rmSync(DIST, { recursive: true, force: true });
fs.mkdirSync(DIST, { recursive: true });
fs.cpSync(path.join(ROOT, "static"), DIST, { recursive: true });

// Home
{
  const d = home.data;
  const hero = `<section class="hero"><div class="wrap herogrid"><div>
    ${d.eyebrow ? `<p class="eyebrow">${esc(d.eyebrow)}</p>` : ""}
    <h1>${esc(d.hero_title || settings.site_title)}</h1>
    <p class="lead">${esc(d.hero_text || "")}</p>
    <p class="btns">${(d.hero_buttons || []).map((b, i) => `<a class="btn${i ? " ghost-light" : " light"}" href="${esc(url(b.url))}">${esc(b.label)}</a>`).join("")}</p>
  </div>${d.photo ? `<img class="portrait" src="${esc(url(d.photo))}" alt="${esc(settings.author || "")}">` : `<div class="portrait ph-initial">${esc((settings.author || "H").charAt(0))}</div>`}</div></section>`;
  const intro = home.content.trim() ? `<section class="block"><div class="wrap"><div class="prose">${md(home.content)}</div></div></section>` : "";
  write("", layout({ title: settings.site_title, description: d.hero_text, body: hero + intro + blocks(d.sections), path: "/" }));
}

// Generic pages
for (const p of pages) {
  write(p.slug, layout({ title: p.title, description: p.description, path: `/${p.slug}/`,
    body: pageHead(p.title, p.description) + (p.body.trim() ? `<section class="block"><div class="wrap"><div class="prose">${md(p.body)}</div></div></section>` : "") + blocks(p.blocks) }));
}

// Research hub + project pages
write("research", layout({ title: "Research", path: "/research/", body: pageHead("Research", settings.research_intro) + `<section class="block"><div class="wrap">${auto("projects", {})}</div></section>` }));
for (const p of projects) {
  const rp = papers.filter((x) => x.project === p.slug), rg = progress.filter((x) => x.project === p.slug), rn = news.filter((x) => x.project === p.slug);
  const links = (p.links || []).length ? `<p class="btns">${p.links.map((l, i) => `<a class="btn${i ? " ghost" : ""}" href="${esc(url(l.url))}">${esc(l.label)}</a>`).join("")}</p>` : "";
  const body = pageHead(p.title, p.summary, `<p>${statusPill(p.status)} ${p.place ? `<span class="muted">${esc(p.place)}</span>` : ""}</p>${links}`)
    + (p.body.trim() ? `<section class="block"><div class="wrap"><div class="prose">${md(p.body)}</div></div></section>` : "")
    + blocks(p.blocks)
    + (rp.length ? `<section class="block"><div class="wrap"><h2>Papers</h2>${paperList(rp)}</div></section>` : "")
    + (rg.length ? `<section class="block"><div class="wrap"><h2>Progress</h2>${timeline(rg.map((x) => ({ date: fmtDate(x.date), title: x.title, text: x.summary })))}</div></section>` : "")
    + (rn.length ? `<section class="block"><div class="wrap"><h2>News</h2><div class="rows">${rn.map((x) => `<a class="row" href="/news/${x.slug}/"><time>${fmtDate(x.date)}</time><span>${esc(x.title)}</span></a>`).join("")}</div></div></section>` : "");
  write(`research/${p.slug}`, layout({ title: p.title, description: p.summary, path: `/research/${p.slug}/`, body }));
}

// Papers, progress, news
write("papers", layout({ title: "Papers", path: "/papers/", body: pageHead("Papers", settings.papers_intro) + `<section class="block"><div class="wrap">${paperList(papers)}</div></section>` }));
write("progress", layout({ title: "Progress", path: "/progress/", body: pageHead("Research progress", settings.progress_intro) + `<section class="block"><div class="wrap">${timeline(progress.map((x) => ({ date: fmtDate(x.date), title: x.title, text: x.summary, tag: projTitle(x.project) })))}</div></section>` }));
write("news", layout({ title: "News", path: "/news/", body: pageHead("News") + `<section class="block"><div class="wrap"><div class="rows">${news.map((x) => `<a class="row" href="/news/${x.slug}/"><time>${fmtDate(x.date)}</time><span>${esc(x.title)}</span></a>`).join("")}</div></div></section>` }));
for (const n of news) {
  write(`news/${n.slug}`, layout({ title: n.title, path: `/news/${n.slug}/`, description: n.summary,
    body: pageHead(n.title, "", `<p class="muted">${fmtDate(n.date)}</p>`) + `<section class="block"><div class="wrap"><div class="prose">${n.image ? `<img src="${esc(url(n.image))}" alt="">` : ""}${md(n.body)}</div>${blocks(n.blocks)}</div></section>` }));
}

// Private area (served behind the edge-function password)
write("private", layout({ title: "Private area", path: "/private/", isPrivate: true,
  body: pageHead("Private area", "Drafts, supervisor feedback and working papers. Not public, not indexed.")
    + `<section class="block"><div class="wrap"><h2>Pages</h2><div class="cards">${privPages.map((p) => card(p.title, p.description, `/private/p/${p.slug}/`)).join("") || '<p class="muted">No private pages yet.</p>'}</div></div></section>`
    + `<section class="block"><div class="wrap"><h2>Private papers and files</h2>${paperList(privPapers, true)}</div></section>` }));
for (const p of privPages) {
  write(`private/p/${p.slug}`, layout({ title: p.title, path: `/private/p/${p.slug}/`, isPrivate: true,
    body: pageHead(p.title, p.description) + `<section class="block"><div class="wrap"><div class="prose">${md(p.body)}</div></div></section>` + blocks(p.blocks) }));
}

// CMS config is static; robots + 404
fs.writeFileSync(path.join(DIST, "robots.txt"), "User-agent: *\nDisallow: /private/\nDisallow: /admin/\n");
fs.writeFileSync(path.join(DIST, "404.html"), layout({ title: "Not found", body: pageHead("Page not found", "That page does not exist. Use the menu above.") }));
console.log(`Built: ${pages.length} pages, ${projects.length} projects, ${news.length} news, ${papers.length} papers, ${progress.length} progress, ${privPages.length + privPapers.length} private.`);
