import { Link, useParams } from 'react-router-dom';
import type { Post, Publication } from '../../lib/amplify';
import { PROGRAM_LABELS, STATUS_LABELS } from '../../lib/format';
import { useLang } from '../../lib/i18n';
import { useMembers } from '../../lib/members';
import { useModel } from '../../lib/store';
import { FileLink, Loading, PageHeader, Paragraphs, Portrait } from '../../components/ui';
import { PostCard } from './Home';

export default function MemberDetail() {
  const { slug } = useParams();
  const { lang, tx, L } = useLang();
  const { members, loading } = useMembers();
  const { items: posts } = useModel<Post>('Post');
  const { items: pubs } = useModel<Publication>('Publication');
  const m = members.find((x) => x.slug === slug && x.visible !== false);
  if (loading) return <Loading />;
  if (!m)
    return (
      <section className="section container">
        <h1>{tx('Member not found')}</h1>
        <Link to="/members">{tx('Back to students')}</Link>
      </section>
    );
  const p = m.profile;
  const related = posts.filter((x) => x.published && x.memberIds?.includes(m.id));
  const papers = pubs.filter((x) => x.memberIds?.includes(m.id)).sort((a, b) => b.year - a.year);
  const back = m.status === 'ALUMNI' ? { to: '/alumni', label: tx('Alumni') } : { to: '/members', label: tx('Students') };

  return (
    <>
      <PageHeader crumbs={[back]} title={lang === 'ja' && m.nameJa ? m.nameJa : m.name} intro={lang === 'en' ? m.nameJa ?? undefined : undefined} />
      <section className="section">
        <div className="container profile-head">
          <div>
            <div className="portrait">
              <Portrait k={p?.photoKey} name={m.name} />
            </div>
          </div>
          <div>
            <dl className="kv" style={{ marginBottom: 20 }}>
              {m.program && (<><dt>{tx('Programme')}</dt><dd>{tx(PROGRAM_LABELS[m.program])}</dd></>)}
              {m.status && (<><dt>{tx('Status')}</dt><dd>{tx(STATUS_LABELS[m.status])}{m.graduationYear ? ` (${m.graduationYear})` : ''}</dd></>)}
              {m.entryYear && (<><dt>{tx('Year of entry')}</dt><dd>{m.entryYear}</dd></>)}
              {p?.country && (<><dt>{tx('Country / region')}</dt><dd>{L(p, 'country')}</dd></>)}
              {(p?.researchTopic || p?.researchTopicJa) && (<><dt>{tx('Research topic')}</dt><dd><b>{L(p, 'researchTopic')}</b></dd></>)}
              {p?.thesisTitle && (<><dt>{tx('Thesis')}</dt><dd>{L(p, 'thesisTitle')}</dd></>)}
              {p?.currentPosition && (<><dt>{tx('Current position')}</dt><dd>{L(p, 'currentPosition')}</dd></>)}
              {p?.interests?.length ? (<><dt>{tx('Interests')}</dt><dd>{p.interests.join(' · ')}</dd></>) : null}
              {p?.contactEmail && (<><dt>{tx('Contact')}</dt><dd><a href={`mailto:${p.contactEmail}`}>{p.contactEmail}</a></dd></>)}
            </dl>
            <Paragraphs text={L(p, 'bio')} />
            {(m.links.length > 0 || p?.cvKey) && (
              <div className="chips" style={{ marginTop: 12 }}>
                {p?.cvKey && <span className="chip"><FileLink k={p.cvKey}>{tx('CV (PDF)')}</FileLink></span>}
                {m.links.map((l) => (
                  <a key={l.url} className="chip" href={l.url} target="_blank" rel="noreferrer">{l.label} ↗</a>
                ))}
              </div>
            )}
            {m.documents.length > 0 && (
              <>
                <h3 style={{ marginTop: 26 }}>{tx('Documents')}</h3>
                <ul>
                  {m.documents.map((d) => (
                    <li key={d.key}><FileLink k={d.key}>{d.title || 'Document'}</FileLink></li>
                  ))}
                </ul>
              </>
            )}
          </div>
        </div>
      </section>
      {papers.length > 0 && (
        <section className="section alt">
          <div className="container">
            <h2>{tx('Publications')}</h2>
            <ul className="pub-list">
              {papers.map((x) => (
                <li key={x.id} className="pub">
                  <div className="yr">{x.year}</div>
                  <div>
                    <div className="t">{x.title}</div>
                    <div className="v">{x.venue}</div>
                    {x.doi && <div className="links"><a href={`https://doi.org/${x.doi}`} target="_blank" rel="noreferrer">DOI {x.doi}</a></div>}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}
      {related.length > 0 && (
        <section className="section">
          <div className="container">
            <h2>{tx('Activities')}</h2>
            <div className="grid c4">{related.map((x) => <PostCard key={x.id} post={x} />)}</div>
          </div>
        </section>
      )}
    </>
  );
}
