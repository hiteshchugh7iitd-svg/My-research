import { defineBackend } from '@aws-amplify/backend';
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
