import { Link } from 'react-router-dom';
import { PROGRAM_LABELS } from '../../lib/format';
import { useMembers } from '../../lib/members';
import { Loading, PageHeader, Portrait } from '../../components/ui';

export default function Alumni() {
  const { members, loading } = useMembers();
  const alumni = members.filter((m) => m.visible !== false && m.status === 'ALUMNI');
  const years = [...new Set(alumni.map((m) => m.graduationYear ?? 0))].sort((a, b) => b - a);
  return (
    <>
      <PageHeader eyebrow="Alumni" title="Alumni" intro="Graduates of the seminar now working in ministries, international organisations, NGOs, universities and schools around the world." />
      <section className="section">
        <div className="container">
          {loading ? (
            <Loading />
          ) : alumni.length ? (
            years.map((y) => (
              <div key={y} style={{ marginBottom: 34 }}>
                <h2 className="year-head">{y ? `Class of ${y}` : 'Earlier'}</h2>
                <div className="table-wrap" style={{ marginTop: 12 }}>
                  <table className="data">
                    <thead>
                      <tr>
                        <th style={{ width: 56 }} />
                        <th>Name</th>
                        <th>Programme</th>
                        <th>Thesis</th>
                        <th>Now</th>
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
                              <Link to={`/members/${m.slug}`}><b>{m.name}</b></Link>
                              {m.profile?.country && <div className="small muted">{m.profile.country}</div>}
                            </td>
                            <td className="small">{m.program ? PROGRAM_LABELS[m.program] : ''}</td>
                            <td className="small">{m.profile?.thesisTitle}</td>
                            <td className="small">{m.profile?.currentPosition}</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))
          ) : (
            <div className="empty">Alumni are listed here when a student’s status is changed to “Alumni” in the admin console.</div>
          )}
        </div>
      </section>
    </>
  );
}
