import { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { parseJson, type Album } from '../../lib/amplify';
import { formatDate } from '../../lib/format';
import { useModel } from '../../lib/store';
import { Img, Loading, PageHeader, PhotoGrid } from '../../components/ui';

type Photo = { key: string; caption?: string };
const ayLabel = (y?: number | null) => (y ? `AY ${y}` : 'Other');

export function Gallery() {
  const { items, loading } = useModel<Album>('Album');
  const albums = items.filter((a) => a.published !== false);
  const years = useMemo(() => [...new Set(albums.map((a) => a.academicYear ?? 0))].sort((a, b) => b - a), [albums]);
  return (
    <>
      <PageHeader eyebrow="Gallery" title="Gallery" intro="Seminar life, fieldwork, internships and conferences, organised by academic year (April–March)." />
      <section className="section">
        <div className="container">
          {loading ? (
            <Loading />
          ) : albums.length ? (
            years.map((y) => (
              <div key={y} style={{ marginBottom: 40 }}>
                <h2 className="year-head">{ayLabel(y)}</h2>
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
                              {a.category && <span className="tag">{a.category}</span>}
                              <span className="meta">{photos.length} photos</span>
                            </div>
                            <h3>{a.title}</h3>
                          </div>
                        </Link>
                      );
                    })}
                </div>
              </div>
            ))
          ) : (
            <div className="empty">Albums appear here once photos are uploaded in the admin console.</div>
          )}
        </div>
      </section>
    </>
  );
}

export function AlbumPage() {
  const { slug } = useParams();
  const { items, loading } = useModel<Album>('Album');
  const album = items.find((a) => a.slug === slug && a.published !== false);
  if (loading) return <Loading />;
  if (!album)
    return (
      <section className="section container">
        <h1>Album not found</h1>
        <Link to="/gallery">Back to gallery</Link>
      </section>
    );
  const photos = parseJson<Photo[]>(album.photos, []);
  return (
    <>
      <PageHeader crumbs={[{ to: '/gallery', label: 'Gallery' }]} eyebrow={[ayLabel(album.academicYear), album.category].filter(Boolean).join(' · ')} title={album.title} intro={album.description ?? undefined} />
      <section className="section">
        <div className="container">
          {album.date && <p className="muted small">{formatDate(album.date)}</p>}
          {photos.length ? <PhotoGrid photos={photos} /> : <div className="empty">No photos yet.</div>}
        </div>
      </section>
    </>
  );
}
