import { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { parseJson, type Album } from '../../lib/amplify';
import { formatDate } from '../../lib/format';
import { useLang } from '../../lib/i18n';
import { useModel } from '../../lib/store';
import { Img, Loading, PageHeader, PhotoGrid } from '../../components/ui';

type Photo = { key: string; caption?: string };
const ayLabel = (y: number | null | undefined, ja: boolean) => (y ? (ja ? `${y}年度` : `AY ${y}`) : ja ? 'その他' : 'Other');

export function Gallery() {
  const { lang, tx, L } = useLang();
  const { items, loading } = useModel<Album>('Album');
  const albums = items.filter((a) => a.published !== false);
  const years = useMemo(() => [...new Set(albums.map((a) => a.academicYear ?? 0))].sort((a, b) => b - a), [albums]);
  return (
    <>
      <PageHeader eyebrow={tx('Gallery')} title={tx('Gallery')} intro={tx('Seminar life, fieldwork, internships and conferences, organised by academic year (April–March).')} />
      <section className="section">
        <div className="container">
          {loading ? (
            <Loading />
          ) : albums.length ? (
            years.map((y) => (
              <div key={y} style={{ marginBottom: 40 }}>
                <h2 className="year-head">{ayLabel(y, lang === 'ja')}</h2>
                <div className="grid c3" style={{ marginTop: 16 }}>
                  {albums
                    .filter((a) => (a.academicYear ?? 0) === y)
                    .sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''))
                    .map((a) => {
                      const photos = parseJson<Photo[]>(a.photos, []);
                      return (
                        <Link key={a.id} to={`/gallery/${a.slug}`} className="card linky" style={{ color: 'inherit' }}>
                          <div className="thumb">
                            <Img k={a.coverKey ?? photos[0]?.key} alt="" />
                          </div>
                          <div className="body">
                            <div className="row" style={{ gap: 6 }}>
                              {a.category && <span className="tag">{tx(a.category)}</span>}
                              <span className="meta">{photos.length} {lang === 'ja' ? '枚' : 'photos'}</span>
                            </div>
                            <h3>{L(a, 'title')}</h3>
                          </div>
                        </Link>
                      );
                    })}
                </div>
              </div>
            ))
          ) : (
            <div className="empty">{tx('Albums appear here once photos are uploaded in the admin console.')}</div>
          )}
        </div>
      </section>
    </>
  );
}

export function AlbumPage() {
  const { slug } = useParams();
  const { lang, tx, L } = useLang();
  const { items, loading } = useModel<Album>('Album');
  const album = items.find((a) => a.slug === slug && a.published !== false);
  if (loading) return <Loading />;
  if (!album)
    return (
      <section className="section container">
        <h1>{tx('Album not found')}</h1>
        <Link to="/gallery">{tx('Back to gallery')}</Link>
      </section>
    );
  const photos = parseJson<Photo[]>(album.photos, []);
  return (
    <>
      <PageHeader crumbs={[{ to: '/gallery', label: tx('Gallery') }]} eyebrow={[ayLabel(album.academicYear, lang === 'ja'), album.category && tx(album.category)].filter(Boolean).join(' · ')} title={L(album, 'title')} intro={L(album, 'description') || undefined} />
      <section className="section">
        <div className="container">
          {album.date && <p className="muted small">{formatDate(album.date)}</p>}
          {photos.length ? <PhotoGrid photos={photos} /> : <div className="empty">{tx('No photos yet.')}</div>}
        </div>
      </section>
    </>
  );
}
