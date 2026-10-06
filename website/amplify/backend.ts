import { defineBackend } from '@aws-amplify/backend';
import { PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { auth } from './auth/resource';
import { data } from './data/resource';
import { storage } from './storage/resource';
import { userAdmin } from './functions/user-admin/resource';
import { recordVisit } from './functions/record-visit/resource';

const backend = defineBackend({
  auth,
  data,
  storage,
  userAdmin,
  recordVisit,
});

// The visit counter writes straight to the VisitStat table.
const visitTable = backend.data.resources.tables['VisitStat'];
visitTable.grantReadWriteData(backend.recordVisit.resources.lambda);
backend.recordVisit.addEnvironment('VISIT_TABLE', visitTable.tableName);

// Account management (invite, change role, disable, delete). The permission is
// attached to the function's own role so the data stack depends on auth, never
// the other way round.
const userPool = backend.auth.resources.userPool;
backend.userAdmin.resources.lambda.addToRolePolicy(
  new PolicyStatement({
    actions: [
      'cognito-idp:AdminCreateUser',
      'cognito-idp:AdminDeleteUser',
      'cognito-idp:AdminDisableUser',
      'cognito-idp:AdminEnableUser',
      'cognito-idp:AdminGetUser',
      'cognito-idp:AdminAddUserToGroup',
      'cognito-idp:AdminRemoveUserFromGroup',
      'cognito-idp:AdminListGroupsForUser',
      'cognito-idp:ListUsers',
      'cognito-idp:ListUsersInGroup',
    ],
    resources: [userPool.userPoolArn],
  }),
);
backend.userAdmin.addEnvironment('AMPLIFY_AUTH_USERPOOL_ID', userPool.userPoolId);
