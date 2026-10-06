import { type ClientSchema, a, defineData } from '@aws-amplify/backend';
import { userAdmin } from '../functions/user-admin/resource';
import { recordVisit } from '../functions/record-visit/resource';

/**
 * Content model for the seminar website.
 *
 * Permission pattern used throughout:
 *   - Visitors (not signed in) read public content through the Cognito identity
 *     pool (`guest`), so there is no API key to expire.
 *   - professor / admin groups can create, edit and delete everything.
 *   - Students can only edit their own MemberProfile and their own Submissions;
 *     a submission becomes a public post or publication only after an admin
 *     approves it.
 */
const STAFF = ['professor', 'admin'];

const schema = a.schema({
  MemberProgram: a.enum(['PHD', 'MASTERS', 'RESEARCH_STUDENT', 'EXCHANGE', 'UNDERGRADUATE', 'POSTDOC', 'VISITING_RESEARCHER']),
  MemberStatus: a.enum(['CURRENT', 'ALUMNI', 'ON_LEAVE']),
  PostCategory: a.enum(['NEWS', 'EVENT', 'STUDENT_ACTIVITY', 'INTERNSHIP', 'FIELDWORK', 'CONFERENCE', 'AWARD', 'SEMINAR', 'PUBLICATION_NEWS']),
  PublicationKind: a.enum(['PAPER', 'BOOK', 'REPORT', 'TALK']),
  SubmissionKind: a.enum(['POST', 'PUBLICATION']),
  SubmissionStatus: a.enum(['PENDING', 'APPROVED', 'RETURNED']),

  /** Roster entry for a student, alumnus or researcher. Controlled by staff. */
  Member: a
    .model({
      slug: a.string().required(),
      name: a.string().required(),
      nameJa: a.string(),
      program: a.ref('MemberProgram'),
      status: a.ref('MemberStatus'),
      entryYear: a.integer(),
      graduationYear: a.integer(),
      visible: a.boolean().default(true),
      sortOrder: a.integer().default(100),
      /** Cognito `sub` of the member's login, set when the account is invited. */
      ownerId: a.string(),
    })
    .secondaryIndexes((index) => [index('slug')])
    .authorization((allow) => [
      allow.guest().to(['read']),
      allow.authenticated('identityPool').to(['read']),
      allow.authenticated().to(['read']),
      allow.groups(STAFF),
    ]),

  /** Profile text and files the member edits themselves. `id` equals the Member id. */
  MemberProfile: a
    .model({
      ownerId: a.string(),
      researchTopic: a.string(),
      researchTopicJa: a.string(),
      bio: a.string(),
      bioJa: a.string(),
      country: a.string(),
      photoKey: a.string(),
      cvKey: a.string(),
      thesisTitle: a.string(),
      currentPosition: a.string(),
      contactEmail: a.email(),
      /** [{ label, url }] — ORCID, researchmap, LinkedIn, Google Scholar … */
      links: a.json(),
      /** [{ title, key, kind }] — documents the member wants to show on their page. */
      documents: a.json(),
      interests: a.string().array(),
    })
    .authorization((allow) => [
      allow.guest().to(['read']),
      allow.authenticated('identityPool').to(['read']),
      allow.authenticated().to(['read']),
      allow.ownerDefinedIn('ownerId').identityClaim('sub').to(['create', 'read', 'update']),
      allow.groups(STAFF),
    ]),

  Post: a
    .model({
      slug: a.string().required(),
      title: a.string().required(),
      titleJa: a.string(),
      category: a.ref('PostCategory'),
      excerpt: a.string(),
      body: a.string(),
      coverKey: a.string(),
      imageKeys: a.string().array(),
      eventDate: a.date(),
      publishDate: a.date().required(),
      location: a.string(),
      authorName: a.string(),
      memberIds: a.string().array(),
      published: a.boolean().default(true),
      pinned: a.boolean().default(false),
    })
    .secondaryIndexes((index) => [index('slug')])
    .authorization((allow) => [
      allow.guest().to(['read']),
      allow.authenticated('identityPool').to(['read']),
      allow.authenticated().to(['read']),
      allow.groups(STAFF),
    ]),

  Publication: a
    .model({
      kind: a.ref('PublicationKind'),
      year: a.integer().required(),
      date: a.string(),
      title: a.string().required(),
      venue: a.string(),
      authors: a.string(),
      doi: a.string(),
      url: a.url(),
      note: a.string(),
      invited: a.boolean(),
      peerReviewed: a.boolean(),
      pdfKey: a.string(),
      memberIds: a.string().array(),
      featured: a.boolean().default(false),
    })
    .authorization((allow) => [
      allow.guest().to(['read']),
      allow.authenticated('identityPool').to(['read']),
      allow.authenticated().to(['read']),
      allow.groups(STAFF),
    ]),

  /** Funded research projects (KAKENHI, SATREPS, …). */
  Project: a
    .model({
      titleEn: a.string().required(),
      titleJa: a.string(),
      funder: a.string(),
      role: a.string(),
      period: a.string(),
      host: a.string(),
      summary: a.string(),
      coverKey: a.string(),
      ongoing: a.boolean().default(true),
      sortOrder: a.integer().default(100),
    })
    .authorization((allow) => [
      allow.guest().to(['read']),
      allow.authenticated('identityPool').to(['read']),
      allow.authenticated().to(['read']),
      allow.groups(STAFF),
    ]),

  Award: a
    .model({
      title: a.string().required(),
      body: a.string(),
      date: a.string(),
      year: a.integer(),
      note: a.string(),
      recipients: a.string(),
    })
    .authorization((allow) => [
      allow.guest().to(['read']),
      allow.authenticated('identityPool').to(['read']),
      allow.authenticated().to(['read']),
      allow.groups(STAFF),
    ]),

  /** Gallery album, e.g. "Internship AY 2025" or "Field study, Ishinomaki". */
  Album: a
    .model({
      slug: a.string().required(),
      title: a.string().required(),
      academicYear: a.integer(),
      category: a.string(),
      date: a.date(),
      description: a.string(),
      coverKey: a.string(),
      /** [{ key, caption }] in display order. */
      photos: a.json(),
      published: a.boolean().default(true),
    })
    .secondaryIndexes((index) => [index('slug')])
    .authorization((allow) => [
      allow.guest().to(['read']),
      allow.authenticated('identityPool').to(['read']),
      allow.authenticated().to(['read']),
      allow.groups(STAFF),
    ]),

  /** Visiting scholars and guests of the seminar, grouped by country on the Visitors page. */
  Guest: a
    .model({
      name: a.string().required(),
      position: a.string(),
      affiliation: a.string(),
      country: a.string(),
      visitDate: a.date(),
      note: a.string(),
      photoKey: a.string(),
    })
    .authorization((allow) => [
      allow.guest().to(['read']),
      allow.authenticated('identityPool').to(['read']),
      allow.authenticated().to(['read']),
      allow.groups(STAFF),
    ]),

  /**
   * Editable blocks of site text and lists (hero slides, research themes, career,
   * courses, contact details …). `id` is the block name; `data` is its JSON value.
   */
  SiteContent: a
    .model({
      data: a.json(),
    })
    .authorization((allow) => [
      allow.guest().to(['read']),
      allow.authenticated('identityPool').to(['read']),
      allow.authenticated().to(['read']),
      allow.groups(STAFF),
    ]),

  /** Student submissions waiting for approval. Approved items are copied into Post / Publication. */
  Submission: a
    .model({
      kind: a.ref('SubmissionKind'),
      status: a.ref('SubmissionStatus'),
      title: a.string().required(),
      payload: a.json(),
      attachmentKeys: a.string().array(),
      submitterName: a.string(),
      memberId: a.string(),
      reviewNote: a.string(),
      resultId: a.string(),
      owner: a.string(),
    })
    .authorization((allow) => [allow.owner().to(['create', 'read', 'update', 'delete']), allow.groups(STAFF)]),

  /** Who changed what, shown on the admin dashboard. */
  AuditLog: a
    .model({
      actor: a.string(),
      action: a.string(),
      entity: a.string(),
      entityId: a.string(),
      label: a.string(),
      at: a.datetime(),
    })
    .authorization((allow) => [allow.authenticated().to(['create']), allow.groups(STAFF).to(['read', 'delete'])]),

  /** Visit counter. id = "total" or a day "YYYY-MM-DD". Written only through recordVisit. */
  VisitStat: a
    .model({
      count: a.integer(),
    })
    .authorization((allow) => [
      allow.guest().to(['read']),
      allow.authenticated('identityPool').to(['read']),
      allow.authenticated().to(['read']),
      allow.groups(STAFF).to(['read', 'delete']),
    ]),

  recordVisit: a
    .mutation()
    .returns(a.integer())
    .authorization((allow) => [allow.guest(), allow.authenticated('identityPool'), allow.authenticated()])
    .handler(a.handler.function(recordVisit)),

  /** Account administration (invite, change role, disable, delete), backed by a Lambda function. */
  manageUser: a
    .mutation()
    .arguments({
      action: a.string().required(),
      email: a.string(),
      name: a.string(),
      role: a.string(),
      username: a.string(),
    })
    .returns(a.json())
    .authorization((allow) => [allow.groups(STAFF)])
    .handler(a.handler.function(userAdmin)),
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: 'userPool',
  },
});
