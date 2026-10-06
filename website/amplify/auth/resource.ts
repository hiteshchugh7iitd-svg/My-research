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
export const auth = defineAuth({
  loginWith: {
    email: {
      userInvitation: {
        emailSubject: 'Your account for the Aiko Sakurai Seminar website',
        emailBody: (user, code) =>
          `You have been invited to the Aiko Sakurai Seminar website (Kobe University GSICS).<br/><br/>` +
          `Sign-in email: ${user()}<br/>Temporary password: ${code()}<br/><br/>` +
          `Open the website, choose "Sign in", and set your own password. The temporary password expires in 7 days.`,
      },
    },
  },
  groups: ['professor', 'admin', 'student'],
  userAttributes: {
    preferredUsername: { mutable: true, required: false },
  },
});
