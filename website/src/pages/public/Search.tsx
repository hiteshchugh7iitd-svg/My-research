import { Link, useSearchParams } from 'react-router-dom';
import type { Album, Post, Publication } from '../../lib/amplify';
import { normalize } from '../../lib/format';
import { useMembers } from '../../lib/members';
import { useModel } from '../../lib/store';
import { PageHeader } from '../../components/ui';

export default function Search() {
  const [params] = useSearchParams();
  const q = params.get('q') ?? '';
  const nq = normalize(q);
  const { items: posts } = useModel<Post>('Post');
  const { items: pubs } = useModel<Publication>('Publication');
  const { items: albums } = useModel<Album>('Album');
  const { members } = useMembers();
  const hit = (...parts: (string | null | undefined)[]) => !!nq && normalize(parts.join(' ')).includes(nq);

  const results = [
    ...members.filter((m) => m.visible !== false && hit(m.name, m.nameJa, m.profile?.researchTopic, m.profile?.bio, m.profile?.country)).map((m) => ({ to: `/members/${m.slug}`, type: 'Member', title: m.name, sub: m.profile?.researchTopic })),
    ...posts.filter((p) => p.published && hit(p.title, p.titleJa, p.excerpt, p.body)).map((p) => ({ to: `/news/${p.slug}`, type: 'News', title: p.title, sub: p.publishDate })),
    ...albums.filter((a) => a.published !== false && hit(a.title, a.description, a.category)).map((a) => ({ to: `/gallery/${a.slug}`, type: 'Album', title: a.title, sub: a.category })),
    ...pubs.filter((p) => hit(p.title, p.venue, p.authors)).map((p) => ({ to: `/publications?year=${p.year}`, type: 'Publication', title: p.title, sub: `${p.year} · ${p.venue ?? ''}` })),
  ];

  return (
    <>
      <PageHeader eyebrow="Search" title={`Results for “${q}”`} />
      <section className="section">
        <div className="container">
          <p className="muted">{results.length} results</p>
          <ul className="pub-list">
            {results.slice(0, 200).map((r, i) => (
              <li key={i} className="pub">
                <div><span className="tag grey">{r.type}</span></div>
                <div>
                  <Link className="t" to={r.to}>{r.title}</Link>
                  {r.sub && <div className="n">{r.sub}</div>}
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </>
  );
}
