import { useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import type { Post } from '../../lib/amplify';
import { CATEGORY_LABELS, formatDate } from '../../lib/format';
import { pick, useLang } from '../../lib/i18n';
import { useMembers } from '../../lib/members';
import { useModel } from '../../lib/store';
import { Img, Loading, Markdown, PageHeader, PhotoGrid } from '../../components/ui';
import { PostCard } from './Home';

const PAGE = 12;

export function News() {
  const { items, loading } = useModel<Post>('Post');
  const [params, setParams] = useSearchParams();
  const category = params.get('category') ?? 'ALL';
  const [page, setPage] = useState(1);
  const published = useMemo(
    () => items.filter((p) => p.published).sort((a, b) => Number(!!b.pinned) - Number(!!a.pinned) || (b.publishDate ?? '').localeCompare(a.publishDate ?? '')),
    [items],
  );
  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    published.forEach((p) => p.category && (c[p.category] = (c[p.category] ?? 0) + 1));
    return c;
  }, [published]);
  const list = published.filter((p) => category === 'ALL' || p.category === category);
  const pages = Math.max(1, Math.ceil(list.length / PAGE));
  const recent = published.slice(0, 6);
  const archive = useMemo(() => {
    const m = new Map<string, number>();
    published.forEach((p) => {
      const k = (p.publishDate ?? '').slice(0, 7);
      if (k) m.set(k, (m.get(k) ?? 0) + 1);
    });
    return [...m.entries()].slice(0, 18);
  }, [published]);

  const choose = (c: string) => {
    setPage(1);
    const p = new URLSearchParams(params);
    if (c === 'ALL') p.delete('category');
    else p.set('category', c);
    setParams(p, { replace: true });
  };

  return (
    <>
      <PageHeader eyebrow="News & Events" title={category === 'ALL' ? 'News & events' : CATEGORY_LABELS[category]} intro="Seminar news, events, fieldwork, internships and conference reports — many written by students themselves." />
      <section className="section">
        <div className="container layout-side">
          <div>
            {loading ? (
              <Loading />
            ) : list.length ? (
              <>
                <div className="grid c3">
                  {list.slice((page - 1) * PAGE, page * PAGE).map((p) => (
                    <PostCard key={p.id} post={p} />
                  ))}
                </div>
                {pages > 1 && (
                  <div className="row" style={{ justifyContent: 'center', marginTop: 28 }}>
                    {Array.from({ length: pages }, (_, i) => (
                      <button key={i} className={'chip' + (page === i + 1 ? ' active' : '')} onClick={() => setPage(i + 1)}>
                        {i + 1}
                      </button>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="empty">No posts in this category yet.</div>
            )}
          </div>
          <aside className="sidebar">
            <div className="widget">
              <h4>Categories</h4>
              <ul>
                <li><a onClick={() => choose('ALL')} style={{ cursor: 'pointer', fontWeight: category === 'ALL' ? 700 : 400 }}>All ({published.length})</a></li>
                {Object.entries(CATEGORY_LABELS)
                  .filter(([k]) => counts[k])
                  .map(([k, label]) => (
                    <li key={k}>
                      <a onClick={() => choose(k)} style={{ cursor: 'pointer', fontWeight: category === k ? 700 : 400 }}>
                        {label} ({counts[k]})
                      </a>
                    </li>
                  ))}
              </ul>
            </div>
            <div className="widget">
              <h4>Recent posts</h4>
              <ul>{recent.map((p) => <li key={p.id}><Link to={`/news/${p.slug}`}>{p.title}</Link></li>)}</ul>
            </div>
            {archive.length > 0 && (
              <div className="widget">
                <h4>Archives</h4>
                <ul>
                  {archive.map(([k, n]) => (
                    <li key={k}>{formatDate(k + '-01', { year: 'numeric', month: 'long' })} <span className="muted">({n})</span></li>
                  ))}
                </ul>
              </div>
            )}
          </aside>
        </div>
      </section>
    </>
  );
}

export function NewsDetail() {
  const { slug } = useParams();
  const { lang } = useLang();
  const { items, loading } = useModel<Post>('Post');
  const { members } = useMembers();
  const post = items.find((p) => p.slug === slug && p.published);
  if (loading) return <Loading />;
  if (!post)
    return (
      <section className="section container">
        <h1>Post not found</h1>
        <Link to="/news">Back to news</Link>
      </section>
    );
  const people = members.filter((m) => post.memberIds?.includes(m.id));
  const photos = (post.imageKeys ?? []).filter((k): k is string => !!k).map((key) => ({ key }));
  const more = items.filter((p) => p.published && p.id !== post.id && p.category === post.category).slice(0, 4);
  return (
    <>
      <PageHeader crumbs={[{ to: '/news', label: 'News & Events' }]} eyebrow={post.category ? CATEGORY_LABELS[post.category] : undefined} title={pick(lang, post.title, post.titleJa)} />
      <section className="section">
        <div className="container layout-side">
          <article>
            <p className="muted small">
              {formatDate(post.publishDate)}
              {post.eventDate && post.eventDate !== post.publishDate && <> · Event date {formatDate(post.eventDate)}</>}
              {post.location && <> · {post.location}</>}
              {post.authorName && <> · by {post.authorName}</>}
            </p>
            {post.coverKey && (
              <div className="article-cover">
                <Img k={post.coverKey} alt="" />
              </div>
            )}
            <Markdown src={post.body || post.excerpt} />
            {photos.length > 0 && (
              <>
                <h3 style={{ marginTop: 28 }}>Photos</h3>
                <PhotoGrid photos={photos} />
              </>
            )}
          </article>
          <aside className="sidebar">
            {people.length > 0 && (
              <div className="widget">
                <h4>Seminar members</h4>
                <ul>{people.map((m) => <li key={m.id}><Link to={`/members/${m.slug}`}>{m.name}</Link></li>)}</ul>
              </div>
            )}
            {more.length > 0 && (
              <div className="widget">
                <h4>More {post.category ? CATEGORY_LABELS[post.category].toLowerCase() : 'news'}</h4>
                <ul>{more.map((p) => <li key={p.id}><Link to={`/news/${p.slug}`}>{p.title}</Link></li>)}</ul>
              </div>
            )}
          </aside>
        </div>
      </section>
    </>
  );
}
