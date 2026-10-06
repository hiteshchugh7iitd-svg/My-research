import { defineStorage } from '@aws-amplify/backend';

/**
 * Files (photos, PDFs, CVs, slides).
 *
 *   site/*                     – files uploaded by staff for public pages (news, gallery, hero, projects …)
 *   members/{entity_id}/*      – each member's own photo, CV and documents
 *   submissions/{entity_id}/*  – attachments sent with a news / publication submission
 *
 * Everything that appears on the website is readable by visitors; only the owner
 * or staff can write or delete.
 */
export const storage = defineStorage({
  name: 'sakuraiSeminarFiles',
  access: (allow) => ({
    'site/*': [
      allow.guest.to(['read']),
      allow.authenticated.to(['read']),
      allow.groups(['professor', 'admin']).to(['read', 'write', 'delete']),
    ],
    'members/{entity_id}/*': [
      allow.guest.to(['read']),
      allow.authenticated.to(['read']),
      allow.entity('identity').to(['read', 'write', 'delete']),
      allow.groups(['professor', 'admin']).to(['read', 'write', 'delete']),
    ],
    'submissions/{entity_id}/*': [
      allow.guest.to(['read']),
      allow.authenticated.to(['read']),
      allow.entity('identity').to(['read', 'write', 'delete']),
      allow.groups(['professor', 'admin']).to(['read', 'write', 'delete']),
    ],
  }),
});
