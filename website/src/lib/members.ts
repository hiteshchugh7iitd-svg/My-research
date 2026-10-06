import { useMemo } from 'react';
import { parseJson, type Member, type MemberProfile } from './amplify';
import type { Link } from './defaults';
import { useModel } from './store';

export type MemberView = Member & {
  profile?: MemberProfile;
  links: Link[];
  documents: { title: string; key: string }[];
};

/**
 * Joins the staff-controlled roster (Member) with the text each member writes
 * (MemberProfile). A profile only counts when its owner matches the member's
 * linked login, so nobody can write someone else's page.
 */
export function mergeMembers(members: Member[], profiles: MemberProfile[]): MemberView[] {
  const byId = new Map(profiles.map((p) => [p.id, p]));
  return members.map((m) => {
    const p = byId.get(m.id);
    const profile = p && (!p.ownerId || p.ownerId === m.ownerId) ? p : undefined;
    return {
      ...m,
      profile,
      links: parseJson<Link[]>(profile?.links, []),
      documents: parseJson<{ title: string; key: string }[]>(profile?.documents, []),
    };
  });
}

export function useMembers(): { members: MemberView[]; loading: boolean } {
  const { items: members, loading } = useModel<Member>('Member');
  const { items: profiles, loading: l2 } = useModel<MemberProfile>('MemberProfile');
  const merged = useMemo(() => mergeMembers(members, profiles), [members, profiles]);
  return { members: merged, loading: loading || l2 };
}
