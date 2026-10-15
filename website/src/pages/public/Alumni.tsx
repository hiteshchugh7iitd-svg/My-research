import { Link } from 'react-router-dom';
import { PROGRAM_LABELS } from '../../lib/format';
import { useLang } from '../../lib/i18n';
import { useMembers } from '../../lib/members';
import { Loading, PageHeader, Portrait } from '../../components/ui';

export default function Alumni() {
  const { lang, tx, L } = useLang();
  const { members, loading } = useMembers();
  const alumni = members.filter((m) => m.visible !== false && m.status === 'ALUMNI');
  const years = [...new Set(alumni.map((m) => m.graduationYear ?? 0))].sort((a, b) => b - a);
  return (
    <>
      <PageHeader eyebrow={tx('Alumni')} title={tx('Alumni')} intro={tx('Graduates of the seminar now working in ministries, international organisations, NGOs, universities and schools around the world.')} />
      <section className="section">
        <div className="container">
          {loading ? (
            <Loading />
          ) : alumni.length ? (
            years.map((y) => (
              <div key={y} style={{ marginBottom: 34 }}>
                <h2 className="year-head">{y ? (lang === 'ja' ? `${y}年度修了` : `Class of ${y}`) : tx('Earlier')}</h2>
                <div className="table-wrap" style={{ marginTop: 12 }}>
                  <table className="data">
                    <thead>
                      <tr>
                        <th style={{ width: 56 }} />
                        <th>{tx('Name')}</th>
                        <th>{tx('Programme')}</th>
                        <th>{tx('Thesis')}</th>
                        <th>{tx('Now')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {alumni
                        .filter((m) => (m.graduationYear ?? 0) === y)
                        .map((m) => (
                          <tr key={m.id}>
                            <td>
                              <div className="avatar round">
                                <Portrait k={m.profile?.photoKey} name={m.name} />
                              </div>
                            </td>
                            <td>
                              <Link to={`/members/${m.slug}`}><b>{lang === 'ja' && m.nameJa ? m.nameJa : m.name}</b></Link>
                              {m.profile?.country && <div className="small muted">{L(m.profile, 'country')}</div>}
                            </td>
                            <td className="small">{m.program ? tx(PROGRAM_LABELS[m.program]) : ''}</td>
                            <td className="small">{m.profile && L(m.profile, 'thesisTitle')}</td>
                            <td className="small">{m.profile && L(m.profile, 'currentPosition')}</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))
          ) : (
            <div className="empty">{tx('Alumni are listed here when a student’s status is changed to “Alumni” in the admin console.')}</div>
          )}
        </div>
      </section>
    </>
  );
}
