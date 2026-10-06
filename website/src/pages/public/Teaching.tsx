import { Link } from 'react-router-dom';
import { DEFAULTS } from '../../lib/defaults';
import { useContent } from '../../lib/store';
import { PageHeader } from '../../components/ui';

export default function Teaching() {
  const courses = useContent('courses', DEFAULTS.courses);
  const life = useContent('seminarLife', DEFAULTS.seminarLife);
  const join = useContent('joinPoints', DEFAULTS.joinPoints);
  const site = useContent('site', DEFAULTS.site);
  return (
    <>
      <PageHeader eyebrow="Teaching" title="Courses & joining the seminar" intro="Graduate teaching at Kobe University GSICS, with cross-appointments and guest teaching at Tohoku University, Toyo Eiwa University and partner institutions in Asia and Europe." />
      <section className="section">
        <div className="container">
          <h2>Courses and supervision</h2>
          <div className="grid c3">
            {courses.map((c) => (
              <div key={c.title} className="card pad">
                <span className="tag gold" style={{ alignSelf: 'flex-start' }}>{c.level}</span>
                <h3 style={{ marginTop: 10 }}>{c.title}</h3>
                <p className="small" style={{ margin: 0 }}>{c.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      <section className="section alt">
        <div className="container">
          <h2>What seminar life looks like</h2>
          <div className="grid c4">
            {life.map((s) => (
              <div key={s.title} style={{ borderTop: '3px solid var(--terracotta)', paddingTop: 12 }}>
                <h3>{s.title}</h3>
                <p className="small">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      <section className="section teal">
        <div className="container">
          <div className="eyebrow" style={{ color: 'var(--gold-light)' }}>Why join our seminar</div>
          <h2>{site.motto}</h2>
          <div className="grid c4" style={{ marginTop: 20 }}>
            {join.map((j) => (
              <div key={j.title}>
                <h3 style={{ fontSize: '1.05rem' }}>{j.title}</h3>
                <p className="small" style={{ color: '#d5e2df' }}>{j.body}</p>
              </div>
            ))}
          </div>
          <Link to="/contact" className="btn accent" style={{ marginTop: 12 }}>How to apply →</Link>
        </div>
      </section>
    </>
  );
}
