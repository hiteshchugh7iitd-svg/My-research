import { userClient, type ModelName } from './amplify';
import { broadcast } from './sync';
import { invalidate } from './store';

let actorName = '';
export const setActor = (name: string) => {
  actorName = name;
};

/**
 * Call after every successful change made in the admin console or portal:
 * records it in the activity log and refreshes the data in every open tab.
 */
export function changed(model: ModelName, action: string, entityId: string, label: string) {
  invalidate(model);
  broadcast({ type: 'data-changed', model });
  void userClient.models.AuditLog.create({ actor: actorName, action, entity: model, entityId, label: label.slice(0, 200), at: new Date().toISOString() }).catch(
    () => undefined,
  );
}
