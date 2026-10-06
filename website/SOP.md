# SOP — Aiko Sakurai Seminar Website

**Website:** https://main.d1emmy6bi3ik7m.amplifyapp.com
**Admin console:** add `/admin` to the address · **Members area:** add `/portal` to the address
**Hosting:** AWS Amplify, Tokyo region, AWS account 062788795296 (Free plan)

---

## 1. Roles

| Role | Who | Can do | Cannot do |
|---|---|---|---|
| **Professor** | Prof. Sakurai (and the site owner during setup) | Everything. Only role that can create, promote or remove **admins**. | — |
| **Admin** | 2+ seminar administrators | Add/edit/delete students, news, gallery, publications, projects, awards, visitors, cover page and site text. Invite students. Approve or return student submissions. Bulk uploads, CSV import, backups. | Create or change admin/professor accounts. |
| **Student** | Current students and alumni | Edit **own** profile (photo, CV, bio, research topic, links, documents). Send news/reports and publications **for approval**. | Publish directly. Edit anyone else's page. Open `/admin`. |
| **Visitor** | Public | View all public pages. | Sign in or change anything. |

There is no public sign-up. Every account starts with an invitation.

---

## 2. Access

### First sign-in (everyone)
1. Open the invitation email from Amazon Cognito ("Your account for the Aiko Sakurai Seminar website"). Check the spam folder too.
2. Open the website and click **Sign in** (top right).
3. Enter your email and the **temporary password** from the email.
4. Choose your own password: at least 8 characters, with upper case, lower case, a number and a symbol.
5. Staff land on **Admin**; students land on **My page**.

The temporary password expires after **7 days**. After that, an admin clicks **Resend** under Accounts & roles.

### Forgotten password
On the sign-in page, click **Forgot your password?** and enter your email. Cognito emails a code; enter it with your new password.

### Sign out
Go to **My page** and click **Sign out**, or in the Admin menu click **Sign out**. Always sign out on shared computers.

---

## 3. Account management (Professor / Admin)

| Task | Steps |
|---|---|
| Invite an admin *(Professor only)* | Admin → **Accounts & roles** → email, name, role `admin` → **Send invitation** |
| Invite a student | Admin → **Students & alumni** → open the student (or **+ Add student**) → **Send invitation** with their email. This also links the login to their profile page. |
| Change a role | Accounts & roles → change the **Role** dropdown |
| Block access temporarily | Accounts & roles → **Disable** (and **Enable** to restore) |
| Remove a person completely | 1) Students & alumni → **Delete** (removes their page). 2) Accounts & roles → **Delete** (removes their login). |
| Resend an expired invitation | Accounts & roles → **Resend** (shown while the status is "Invited") |

**Handover rule:** at least **two** people must hold professor or admin rights at all times, so access is never lost.

---

## 4. Routine content work (Admin)

| What | Where | Notes |
|---|---|---|
| Cover photos, headlines, motto, announcement banner | Admin → **Cover page & site text** → Home page | Each slide can have its own headline, text and link. **Save** publishes immediately. |
| Prof. Sakurai profile, contact details, career, courses, links | Cover page & site text → Pages / Profile lists / Research & teaching | **Restore default** undoes your edits to that block. |
| News, events, activity reports | Admin → **News & events** → **+ Add post** | Untick **Published** to keep a post as a draft. **Pin** keeps it at the top. |
| Gallery album | Admin → **Gallery** → **+ Add album**, then drop the photos in | Albums are grouped by academic year (AY 2025 = April 2025 to March 2026). |
| Many photos at once / student portraits | Admin → **Upload center** | Open several upload tabs; they run in parallel. Portraits are matched to students by file name; check the matches, then click **Apply**. |
| Publications, projects, awards, visitors | The matching Admin page | Publications and visitors can also be imported from CSV. |
| Students in bulk | Admin → **Import & export** → Students | Download the template, fill it in Excel, save as CSV, drop the file in, check the preview, then click **Import**. |
| A student graduates | Students & alumni → **Graduate** | They move to the Alumni page. |

### Approving student submissions
1. The dashboard and the menu badge show pending items.
2. Go to Admin → **Submissions** → **Review**.
3. Either **Approve & publish**, which publishes the item at once (it stays editable under News & events or Publications), or **Return with note**, which requires a short note for the student.

---

## 5. Student guide

1. Sign in and go to **My page** → **My profile**.
2. Upload your photo (a portrait is best), your CV (PDF), your research topic and a short biography. Japanese fields are optional.
3. Click **Save profile**. Your page updates immediately; check it with **View my page**.
4. To report an internship, fieldwork, a conference or an award, use **Submit news / report**. Add a title, date, text and photos, then send it.
5. To add a paper or talk, use **Submit publication**.
6. Track the status under **My submissions**: Waiting, Published or Returned (with a note).

Your name, programme and year of entry are set by the seminar office. Ask an admin to change them.

---

## 6. Weekly checklist (Admin, about 10 minutes)

- [ ] Dashboard: clear **Waiting for approval**.
- [ ] Post at least one news item, event or photo album if there was seminar activity.
- [ ] Check that new students have accepted their invitations; **Resend** any that expired.
- [ ] Glance at the visits chart and the **Activity log** for anything unexpected.

## Monthly
- [ ] Admin → Import & export → **Download backup**, and store the file in the seminar's shared drive.
- [ ] Check the AWS billing email or console. The **US$1 budget alert** emails the account owner if any cost appears.

## Each April (new academic year)
- [ ] **Graduate** last year's finishing students.
- [ ] Add and invite the new cohort.
- [ ] Refresh the cover slideshow with new photos.

---

## 7. Cost and AWS account

- The account is on the **AWS Free plan** (credits). Normal seminar use is expected to cost **$0**.
- **Budget alert:** "sakurai-seminar-website-1usd" emails the account owner if monthly cost passes $0.50 (actual) or $1 (forecast).
- **Deadline: 24 March 2027.** The Free plan ends on that date. Before then, the account owner must **upgrade to a paid account** in the AWS console, or AWS closes the account and the website goes offline. After the upgrade, expect at most a few US dollars a month.
- Keep photos reasonable. The site already shrinks them to 2000 px. Do not upload videos; link to YouTube instead.

---

## 8. Troubleshooting

| Problem | Fix |
|---|---|
| "Incorrect username or password" | Use **Forgot your password?** First-time users: the temporary password expires after 7 days, so ask an admin to **Resend**. |
| A student can't edit their page | Admin → Students & alumni → open the student: the login must show **Linked**. If not, send the invitation from there. |
| An upload fails | Check your internet connection and click **Retry**. Very large files (over 50 MB) should be compressed first. |
| An edit "was changed in another tab" warning | Someone else saved the same item. Choose **Cancel** to reload their version, or **OK** to overwrite. |
| The page shows "Something went wrong" | Reload the page. If it continues, note the page address and contact the site maintainer. |

**Site maintainer:** Hitesh Chugh (hiteshchugh7iitd@gmail.com). Technical details are in `website/README.md`.
