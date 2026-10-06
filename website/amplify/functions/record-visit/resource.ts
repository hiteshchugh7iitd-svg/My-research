import { defineFunction } from '@aws-amplify/backend';

export const recordVisit = defineFunction({
  name: 'record-visit',
  entry: './handler.ts',
  timeoutSeconds: 5,
  memoryMB: 128,
  resourceGroupName: 'data',
});
