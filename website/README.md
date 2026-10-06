# Aiko Sakurai Seminar — website

The website of the Aiko Sakurai Seminar, Graduate School of International Cooperation
Studies (GSICS), Kobe University. The code is kept on GitHub and the site is hosted on
AWS Amplify. Visitors see the public pages. Students sign in to keep their own profile
up to date. Prof. Sakurai and the seminar administrators manage everything from an
admin console in the browser, so nobody needs to touch code to update the site.

## What is on the site

| Public pages | Members area (`/portal`, students) | Admin console (`/admin`, professor & admins) |
|---|---|---|
| Home: cover slideshow, feature tiles, motto, recent news | Edit own profile: photo, CV, research topic, biography (EN/JA), links, documents | Dashboard: visit counter and 30-day chart, approvals waiting, recent activity |
| Prof. Sakurai: biography, career, education, awards | Send news / activity reports with photos for approval | Students & alumni: add, edit, delete, graduate to alumni, send login invitations |
| Research: themes, field sites, funded projects | Send publications for approval | Accounts & roles: invite, change role, disable, delete logins |
| Publications: 157 records, filter by type, year, peer review, search | See the status of everything sent | Cover page & site text: slides, headlines, tiles, banner, all page text |
| Students (by programme and cohort) and individual profile pages | | News & events, gallery albums, publications, projects, awards, visitors |
| Alumni, News & Events (categories, archive), Gallery (by academic year) | | Submissions: approve or return student news and publications |
| Visitors (guest scholars by country), Teaching, Contact, site search | | Upload center: parallel bulk uploads in several tabs, auto-matching to students |
| English / 日本語 switch, visit counter in the footer | | Import & export: CSV import with matching preview, full JSON backup, activity log |

### Roles

* **professor**: Prof. Sakurai. Full control, and the only role that can create or
  change admin accounts.
* **admin**: seminar administrators (two or more). Manage all content and student
  accounts.
* **student**: current students and alumni. Edit their own profile and send news and
  publications, which an admin approves before they go live.

Accounts are invitation-only. There is no public sign-up, and passwords are held by
Amazon Cognito, never in the website code.

### Uploading many files at once

* Every file field accepts drag-and-drop of many files. Up to 4 upload at the same time,
  each with its own progress bar, cancel and retry.
* The **Upload center** opens several upload jobs as tabs, for example a gallery album in
  one tab and student portraits in another, and runs them all in parallel. Opening the
  admin console in more browser tabs works too: each tab shows the uploads running in the
  others.
* Each file is fingerprinted (SHA-256), so a file already stored is skipped instead of
  being stored twice.
* Large photos are resized in the browser to a maximum of 2000 px before upload.
* Student portraits and CVs are matched to students by file name (e.g.
  `Hinata Tanaka.jpg`). You check the matches, then apply them.
* Several admins can work at the same time. Admin lists refresh after every save (and
  live when another admin edits). If two people edit the same record, the second one to
  save is warned before overwriting.

## Architecture

```
GitHub (this repo) ──push──▶ AWS Amplify Hosting ──builds──▶ website (React, CDN)
                                     │
                                     └─ deploys the backend defined in website/amplify/:
                                          Cognito   – sign-in, groups professor/admin/student
                                          AppSync + DynamoDB – all content (12 tables)
                                          S3        – photos, PDFs, CVs
                                          Lambda    – account management, visit counter
```

* `website/amplify/` contains the backend definition (Amplify Gen 2, TypeScript).
  * `data/resource.ts` defines the content model and who may read or write each part.
  * `auth/resource.ts` defines sign-in, the groups and the invitation email.
  * `storage/resource.ts` defines the file areas.
  * `functions/` contains the two Lambda functions.
* `website/src/` contains the React frontend: `pages/public`, `pages/portal` and
  `pages/admin`.
* `website/src/seed/starter.json` holds the content of the previous site. It is imported
  once from the admin dashboard.
* `amplify.yml` (repository root) holds the Amplify build settings.

## Current deployment

| | |
|---|---|
| Website | https://main.d1emmy6bi3ik7m.amplifyapp.com |
| Amplify app | `Sakurai-Seminar-Website` (`d1emmy6bi3ik7m`), branch `main`, region Tokyo (ap-northeast-1) |
| Backend stack | CloudFormation `amplify-d1emmy6bi3ik7m-main-branch-0d37a85db6` |
| AWS account plan | Free plan (credits). A US$1/month budget alert emails the account owner. |

This app was deployed directly through the AWS APIs, without the GitHub connection, so pushing
to GitHub does **not** redeploy it. Content changes made in the admin console go live
immediately and never need a redeploy. To deploy a *code* change, either repeat the direct
deployment, or create a GitHub-connected Amplify app as described below. That app gets its own
new backend, so export a backup first and import it there.

## First deployment (about 20 minutes)

1. **Connect GitHub to Amplify.** In the AWS Console, open **Amplify**, choose
   **Create new app**, then **GitHub**, and authorise. Choose the repository
   `hiteshchugh7iitd-svg/My-research` and the branch to deploy. Tick
   **My app is a monorepo** and enter `website` as the root directory. The region
   **Asia Pacific (Tokyo) ap-northeast-1** is recommended.
2. **Save and deploy.** The first build creates the backend and takes about 10 minutes.
   You get an address like `https://main.xxxxxxxx.amplifyapp.com`.
3. **Add the page-routing rule.** Go to **Hosting → Rewrites and redirects → Manage →
   Add rule**. This makes links like `/members/hinata-tanaka` work on refresh:
   * Source: `</^[^.]+$|\.(?!(css|gif|ico|jpg|js|png|txt|svg|woff|woff2|ttf|map|json|webp)$)([^.]+$)/>`
   * Target: `/index.html`
   * Type: `200 (Rewrite)`
4. **Create Prof. Sakurai's account.** Go to **Amplify → your app → Authentication →
   User management** (or the Amazon Cognito console). Choose **Create user** and enter
   `sakuraia@people.kobe-u.ac.jp` with "send an email invitation". Then open **Groups →
   professor → Add user**.
5. **Sign in** on the website, go to **Admin → Dashboard** and click **Import starter
   content**. This loads the 157 publications, 14 funded projects, awards, career,
   education, research themes, courses and links from the previous site.
6. **Admins and students.**
   * Admins: go to **Admin → Accounts & roles** and invite them with role `admin`.
   * Students: go to **Admin → Students & alumni → Add student**, then
     **Send invitation**. Or import many at once from a CSV under **Import & export**.
7. Optional: under **Hosting → Custom domains**, add a domain (for example
   `sakurai-seminar.org`).

After this, every push to the connected branch redeploys automatically. Content changes
made in the admin console go live immediately, without a redeploy.

## Running locally (for developers)

```bash
cd website
npm install
npx ampx sandbox      # creates a personal copy of the backend in your AWS account and writes amplify_outputs.json
npm run dev           # http://localhost:5173
```

`npm run build` type-checks the frontend and backend and then builds the site.

## Costs

Everything runs on pay-per-use services with no servers to keep running. A seminar
website with a few thousand visits a month typically stays within the AWS free allowances
(DynamoDB, Lambda and Cognito have permanent free tiers). Beyond those allowances it
typically costs a few US dollars a month, mostly Amplify Hosting traffic and S3 storage
for photos. Set an **AWS Budget** alert (for example at USD 5) in the Billing console so
any change is noticed early.

## Maintenance notes

* **Backups:** use **Admin → Import & export → Download backup** for a JSON copy of all
  records. Uploaded files remain in the S3 bucket.
* **Removing a student entirely:** delete them under Students & alumni, which removes the
  profile, and delete their login under Accounts & roles.
* **Visit counter:** counts one visit per browser session, with days in Japan time.
* **Drafts:** unpublished news posts and hidden albums or members do not appear on any
  page. They are not secret, though: the content API is public, so anyone querying it
  directly could read them. Keep anything confidential out of the website.
* **Search engines:** `public/robots.txt` allows indexing, except for `/admin` and
  `/portal`.
