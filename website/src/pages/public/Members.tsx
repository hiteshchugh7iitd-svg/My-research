import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { PROGRAM_LABELS, PROGRAM_ORDER } from '../../lib/format';
import { useLang } from '../../lib/i18n';
import { useMembers, type MemberView } from '../../lib/members';
import { Loading, PageHeader, Portrait } from '../../components/ui';

export function MemberCard({ m }: { m: MemberView }) {
  const { lang, tx, L } = useLang();
  return (
    <article className="card linky person">
      <Link to={`/members/${m.slug}`} className="photo" tabIndex={-1} aria-hidden>
        <Portrait k={m.profile?.photoKey} name={m.name} />
      </Link>
      <div className="body">
        <Link to={`/members/${m.slug}`} className="name">{lang === 'ja' && m.nameJa ? m.nameJa : m.name}</Link>
        {m.nameJa && lang === 'en' && <div className="name-ja">{m.nameJa}</div>}
        <div className="meta">
          {[m.program && tx(PROGRAM_LABELS[m.program]), m.entryYear && (lang === 'ja' ? `${m.entryYear}年入学` : `Entered ${m.entryYear}`), m.profile && L(m.profile, 'country')].filter(Boolean).join(' · ')}
        </div>
        {(m.profile?.researchTopic || m.profile?.researchTopicJa) && (
          <div className="topic">{L(m.profile, 'researchTopic')}</div>
        )}
      </div>
    </article>
  );
}

export default function Members() {
  const { lang, tx } = useLang();
  const { members, loading } = useMembers();
  const current = members.filter((m) => m.visible !== false && m.status !== 'ALUMNI');
  const cohorts = useMemo(() => [...new Set(current.map((m) => m.entryYear).filter(Boolean) as number[])].sort((a, b) => b - a), [current]);
  const [cohort, setCohort] = useState<number | 'ALL'>('ALL');
  const shown = current.filter((m) => cohort === 'ALL' || m.entryYear === cohort);
  const groups = PROGRAM_ORDER.map((p) => ({
    program: p,
    list: shown.filter((m) => (m.program ?? 'MASTERS') === p).sort((a, b) => (a.sortOrder ?? 100) - (b.sortOrder ?? 100) || a.name.localeCompare(b.name)),
  })).filter((g) => g.list.length);

  return (
    <>
      <PageHeader
        eyebrow={tx('Seminar members')}
        title={tx('Students')}
        intro={tx('Doctoral, master’s and research students working on disaster education, school safety and resilience. Each member keeps their own profile up to date.')}
      />
      <section className="section">
        <div className="container">
          {cohorts.length > 1 && (
            <div className="chips" style={{ marginBottom: 24 }}>
              <button className={'chip' + (cohort === 'ALL' ? ' active' : '')} onClick={() => setCohort('ALL')}>{tx('All years')}</button>
              {cohorts.map((c) => (
                <button key={c} className={'chip' + (cohort === c ? ' active' : '')} onClick={() => setCohort(c)}>
                  {lang === 'ja' ? `${c}年入学` : `Entered ${c}`}
                </button>
              ))}
            </div>
          )}
          {loading ? (
            <Loading />
          ) : groups.length ? (
            groups.map((g) => (
              <div key={g.program} style={{ marginBottom: 40 }}>
                <h2 className="rule-title">{tx(PROGRAM_LABELS[g.program])} · {g.list.length}</h2>
                <div className="grid c4">
                  {g.list.map((m) => (
                    <MemberCard key={m.id} m={m} />
                  ))}
                </div>
              </div>
            ))
          ) : (
            <div className="empty">{tx('Member profiles for the current academic year are being added.')}</div>
          )}
        </div>
      </section>
    </>
  );
}
