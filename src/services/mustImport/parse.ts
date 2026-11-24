import { MustItem, MustSeason, MustStatus, ParseResult } from './types';

type Json = Record<string, any>;

const STATUS: Record<string, MustStatus> = { want: 'want', watching: 'watching', watched: 'watched' };

function rating(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  const n = Number(v);
  // Must ratings are 1-10. Null stays "unrated", it is never turned into 0.
  return Number.isInteger(n) && n >= 1 && n <= 10 ? n : null;
}

function year(releaseDate: unknown): number | null {
  const m = /^(\d{4})/.exec(String(releaseDate ?? ''));
  return m ? Number(m[1]) : null;
}

function reviewBody(raw: unknown): { body: string; reviewedAt: string | null } | null {
  if (!raw) return null;
  if (typeof raw === 'string') return raw.trim() ? { body: raw.trim(), reviewedAt: null } : null;
  const r = raw as Json;
  const body = typeof r.body === 'string' ? r.body.trim() : '';
  return body ? { body, reviewedAt: typeof r.reviewed_at === 'string' ? r.reviewed_at : null } : null;
}

/** Accepts the files in any order: {product, review} (profile lists) and {detail, rows} (series detail). */
export function parseMustFiles(files: unknown[]): ParseResult {
  const warnings: string[] = [];
  let all: Json | null = null;
  let shows: Json | null = null;
  for (const f of files) {
    const o = f as Json;
    const isAll = !!o && Array.isArray(o.product);
    const isShows = !!o && !!o.detail && !!o.rows;
    if (isAll) all = o;
    if (isShows) shows = o; // a single combined file with both parts is also accepted
    if (!isAll && !isShows) warnings.push('A file was not recognised as a Must export and was ignored.');
  }
  if (!all) return { items: [], warnings: [...warnings, 'No Must profile list found (expected a file with a "product" list).'] };

  const reviews = new Map<number, ReturnType<typeof reviewBody>>();
  for (const r of (all.review ?? []) as Json[]) {
    const info = r?.user_product_info;
    if (info?.reviewed) reviews.set(Number(info.product_id), reviewBody(info.review));
  }

  const rows: Json = shows?.rows ?? {};
  const detail: Json = shows?.detail ?? {};

  const items: MustItem[] = [];
  const seen = new Set<string>();
  for (const rec of all.product as Json[]) {
    const info = rec?.user_product_info;
    const prod = rec?.product;
    if (!info || !prod) continue;
    const type = prod.type === 'show' ? 'tv' : prod.type === 'movie' ? 'movie' : null;
    const status = STATUS[String(info.status)];
    const mustId = String(prod.id);
    if (!type || !status || !prod.title) {
      warnings.push(`Skipped a record that is not a movie or show with a status (Must ID ${mustId}).`);
      continue;
    }
    if (seen.has(mustId)) continue;
    seen.add(mustId);
    let seasons: MustSeason[] | null = null;
    const d = detail[mustId];
    if (type === 'tv' && d?.show?.seasons) {
      seasons = (d.show.seasons as Json[]).map((s) => {
        const sRow = rows[String(s.season_id)]?.p?.user_product_info;
        const sReview = reviewBody(rows[String(s.season_id)]?.r?.user_product_info?.review);
        const eps = (s.episodes as number[]) ?? [];
        const watched: number[] = [];
        const dates: (string | null)[] = eps.map((eid) => {
          const d = rows[String(eid)]?.p?.product?.release_date;
          return typeof d === 'string' && /^\d{4}-\d{2}-\d{2}/.test(d) ? d.slice(0, 10) : null;
        });
        eps.forEach((eid, idx) => {
          if (rows[String(eid)]?.p?.user_product_info?.status === 'watched') watched.push(idx + 1);
        });
        return {
          number: Number(s.number),
          rating: rating(sRow?.rate),
          review: sReview?.body ?? null,
          watchedEpisodes: watched,
          episodeCount: eps.length,
          episodeDates: dates,
        };
      });
    }
    items.push({
      mustId,
      type,
      title: String(prod.title),
      year: year(prod.release_date),
      releaseDate: prod.release_date ? String(prod.release_date) : null,
      posterPath: prod.poster_file_path ? String(prod.poster_file_path) : null,
      status,
      rating: type === 'movie' ? rating(info.rate) : rating(info.rate),
      review: reviews.get(Number(prod.id)) ?? null,
      modifiedAt: info.modified_at ? String(info.modified_at) : null,
      seasons,
    });
  }
  return { items, warnings };
}
