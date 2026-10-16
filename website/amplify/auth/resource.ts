import { defineAuth } from '@aws-amplify/backend';

/**
 * Sign-in for seminar members.
 *
 * Accounts are invitation-only: Prof. Sakurai or an admin invites a person from
 * the admin console, Cognito emails them a temporary password, and they choose
 * their own password at first sign-in. Nobody can self-register.
 *
 * Groups (roles):
 *   professor – Prof. Sakurai. Full control, including appointing admins.
 *   admin     – seminar administrators. Manage all content and student accounts.
 *   student   – current students and alumni. Edit their own profile and submit
 *               news / publications for approval.
 */
/** Public address of the website, used in invitation emails. Update it if a custom domain is added. */
const SITE_URL = 'https://main.d1emmy6bi3ik7m.amplifyapp.com';

export const auth = defineAuth({
  loginWith: {
    email: {
      userInvitation: {
        emailSubject: 'Invitation: Aiko Sakurai Seminar website / 桜井愛子ゼミ ウェブサイトへの招待',
        emailBody: (user, code) =>
          `You have been invited to the Aiko Sakurai Seminar website (Kobe University GSICS).<br/><br/>` +
          `1. Open the website: <a href="${SITE_URL}/login">${SITE_URL}/login</a><br/>` +
          `2. Sign in with this email address: ${user()}<br/>` +
          `3. Temporary password: <b>${code()}</b><br/>` +
          `4. Choose your own password when asked.<br/><br/>` +
          `The temporary password expires in 7 days. If it expires, ask the seminar administrator to resend the invitation.<br/><br/>` +
          `<hr/>` +
          `桜井愛子ゼミ（神戸大学大学院国際協力研究科）のウェブサイトに招待されました。<br/><br/>` +
          `1. ウェブサイトを開く：<a href="${SITE_URL}/login?lang=ja">${SITE_URL}/login</a><br/>` +
          `2. ログイン用メールアドレス：${user()}<br/>` +
          `3. 仮パスワード：<b>${code()}</b><br/>` +
          `4. 表示される画面でご自身のパスワードを設定してください。<br/><br/>` +
          `仮パスワードの有効期限は7日間です。期限が切れた場合は、ゼミの管理者に再送を依頼してください。`,
      },
    },
  },
  groups: ['professor', 'admin', 'student'],
  userAttributes: {
    preferredUsername: { mutable: true, required: false },
  },
});
