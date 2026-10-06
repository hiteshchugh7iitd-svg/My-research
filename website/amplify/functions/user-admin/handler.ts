import type { AppSyncIdentityCognito } from 'aws-lambda';
import {
  AdminAddUserToGroupCommand,
  AdminCreateUserCommand,
  AdminDeleteUserCommand,
  AdminDisableUserCommand,
  AdminEnableUserCommand,
  AdminGetUserCommand,
  AdminListGroupsForUserCommand,
  AdminRemoveUserFromGroupCommand,
  CognitoIdentityProviderClient,
  ListUsersCommand,
  type AttributeType,
  type UserType,
} from '@aws-sdk/client-cognito-identity-provider';
import type { Schema } from '../../data/resource';

const ROLES = ['professor', 'admin', 'student'] as const;
type Role = (typeof ROLES)[number];
const STAFF_ROLES: Role[] = ['professor', 'admin'];

const cognito = new CognitoIdentityProviderClient();
const userPoolId = process.env.AMPLIFY_AUTH_USERPOOL_ID as string;

const attr = (attrs: AttributeType[] | undefined, name: string) => attrs?.find((a) => a.Name === name)?.Value;

async function groupsOf(username: string): Promise<string[]> {
  const out = await cognito.send(new AdminListGroupsForUserCommand({ UserPoolId: userPoolId, Username: username }));
  return (out.Groups ?? []).map((g) => g.GroupName ?? '').filter(Boolean);
}

function summarize(u: UserType, groups: string[]) {
  return {
    username: u.Username,
    sub: attr(u.Attributes, 'sub'),
    email: attr(u.Attributes, 'email'),
    name: attr(u.Attributes, 'name') ?? '',
    status: u.UserStatus,
    enabled: u.Enabled,
    createdAt: u.UserCreateDate?.toISOString(),
    groups,
  };
}

function fail(message: string): never {
  throw new Error(message);
}

export const handler: Schema['manageUser']['functionHandler'] = async (event) => {
  const identity = event.identity as AppSyncIdentityCognito;
  const callerGroups: string[] = identity?.groups ?? [];
  const callerIsProfessor = callerGroups.includes('professor');
  const callerSub = identity?.sub;
  const { action, email, name, role, username } = event.arguments;

  // Admins may manage student accounts; only the professor may manage staff accounts.
  const assertMayManage = (targetGroups: string[], newRole?: string | null) => {
    const touchesStaff = targetGroups.some((g) => STAFF_ROLES.includes(g as Role)) || STAFF_ROLES.includes(newRole as Role);
    if (touchesStaff && !callerIsProfessor) fail('Only Prof. Sakurai (professor role) can manage admin accounts.');
  };

  switch (action) {
    case 'list': {
      const users: UserType[] = [];
      let token: string | undefined;
      do {
        const page = await cognito.send(new ListUsersCommand({ UserPoolId: userPoolId, PaginationToken: token }));
        users.push(...(page.Users ?? []));
        token = page.PaginationToken;
      } while (token);
      const withGroups = await Promise.all(users.map(async (u) => summarize(u, await groupsOf(u.Username!))));
      return withGroups;
    }

    case 'invite':
    case 'resend': {
      if (!email) fail('Email is required.');
      const newRole = (role ?? 'student') as Role;
      if (!ROLES.includes(newRole)) fail(`Unknown role "${role}".`);
      assertMayManage([], newRole);
      const created = await cognito.send(
        new AdminCreateUserCommand({
          UserPoolId: userPoolId,
          Username: email.trim().toLowerCase(),
          DesiredDeliveryMediums: ['EMAIL'],
          MessageAction: action === 'resend' ? 'RESEND' : undefined,
          UserAttributes:
            action === 'resend'
              ? undefined
              : [
                  { Name: 'email', Value: email.trim().toLowerCase() },
                  { Name: 'email_verified', Value: 'true' },
                  ...(name ? [{ Name: 'name', Value: name }] : []),
                ],
        }),
      );
      const user = created.User!;
      if (action === 'invite') {
        await cognito.send(new AdminAddUserToGroupCommand({ UserPoolId: userPoolId, Username: user.Username!, GroupName: newRole }));
      }
      return summarize(user, action === 'invite' ? [newRole] : await groupsOf(user.Username!));
    }

    case 'setRole': {
      if (!username) fail('username is required.');
      const newRole = role as Role;
      if (!ROLES.includes(newRole)) fail(`Unknown role "${role}".`);
      const current = await groupsOf(username);
      assertMayManage(current, newRole);
      const target = await cognito.send(new AdminGetUserCommand({ UserPoolId: userPoolId, Username: username }));
      if (attr(target.UserAttributes, 'sub') === callerSub && !STAFF_ROLES.includes(newRole)) {
        fail('You cannot remove your own staff role.');
      }
      for (const g of current.filter((g) => ROLES.includes(g as Role) && g !== newRole)) {
        await cognito.send(new AdminRemoveUserFromGroupCommand({ UserPoolId: userPoolId, Username: username, GroupName: g }));
      }
      if (!current.includes(newRole)) {
        await cognito.send(new AdminAddUserToGroupCommand({ UserPoolId: userPoolId, Username: username, GroupName: newRole }));
      }
      return { username, groups: [newRole] };
    }

    case 'disable':
    case 'enable':
    case 'delete': {
      if (!username) fail('username is required.');
      const target = await cognito.send(new AdminGetUserCommand({ UserPoolId: userPoolId, Username: username }));
      if (attr(target.UserAttributes, 'sub') === callerSub) fail('You cannot disable or delete your own account.');
      assertMayManage(await groupsOf(username));
      const input = { UserPoolId: userPoolId, Username: username };
      if (action === 'disable') await cognito.send(new AdminDisableUserCommand(input));
      if (action === 'enable') await cognito.send(new AdminEnableUserCommand(input));
      if (action === 'delete') await cognito.send(new AdminDeleteUserCommand(input));
      return { username, done: action };
    }

    default:
      fail(`Unknown action "${action}".`);
  }
};
