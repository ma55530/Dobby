export type SmartSearchOptions = {
  stopwords?: ReadonlySet<string>;
};

const DEFAULT_STOPWORDS = new Set([
  "the",
  "a",
  "an",
  "and",
  "or",
  "of",
  "to",
  "in",
  "on",
  "at",
  "for",
  "with",
  "from",
]);

export function normalizeText(input: string): string {
  return input
    .normalize("NFD")
    // remove diacritics
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    // keep letters/numbers/spaces
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function tokenizeQuery(query: string, options?: SmartSearchOptions): string[] {
  const stopwords = options?.stopwords ?? DEFAULT_STOPWORDS;
  const normalized = normalizeText(query);
  if (!normalized) return [];

  return normalized
    .split(" ")
    .map((t) => t.trim())
    .filter((t) => t.length > 0)
    .filter((t) => !stopwords.has(t));
}

export function levenshteinDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (!a) return b.length;
  if (!b) return a.length;

  const aLen = a.length;
  const bLen = b.length;

  // Use two rows to keep memory small.
  let prev = new Array(bLen + 1);
  let curr = new Array(bLen + 1);

  for (let j = 0; j <= bLen; j++) prev[j] = j;

  for (let i = 1; i <= aLen; i++) {
    curr[0] = i;
    const aChar = a.charCodeAt(i - 1);

    for (let j = 1; j <= bLen; j++) {
      const cost = aChar === b.charCodeAt(j - 1) ? 0 : 1;
      curr[j] = Math.min(
        prev[j] + 1, // deletion
        curr[j - 1] + 1, // insertion
        prev[j - 1] + cost // substitution
      );
    }

    const tmp = prev;
    prev = curr;
    curr = tmp;
  }

  return prev[bLen];
}

export function similarityRatio(a: string, b: string): number {
  const na = normalizeText(a);
  const nb = normalizeText(b);
  if (!na || !nb) return 0;
  if (na === nb) return 1;

  const dist = levenshteinDistance(na, nb);
  const denom = Math.max(na.length, nb.length);
  return denom === 0 ? 0 : 1 - dist / denom;
}

function scoreField(query: string, field: string, options?: SmartSearchOptions): number {
  const q = normalizeText(query);
  const f = normalizeText(field);
  if (!q || !f) return -Infinity;

  let score = 0;

  // Strong exact/starts-with signals.
  if (f === q) score += 1000;
  if (f.startsWith(q)) score += 250;
  if (q.startsWith(f)) score += 50;

  // Token-based matching: all tokens present beats partial.
  const tokens = tokenizeQuery(query, options);
  if (tokens.length > 0) {
    let present = 0;
    for (const t of tokens) {
      if (f.includes(t)) present++;
    }

    if (present === tokens.length) score += 250;
    score += present * 40;

    // Minor extra boost for tokens matching word boundaries.
    for (const t of tokens) {
      if (new RegExp(`(^|\\s)${escapeRegExp(t)}(\\s|$)`, "i").test(f)) {
        score += 20;
      }
    }
  }

  // Fuzzy similarity: handles typos like housmaid -> housemaid.
  // Weight it, but keep exact/token signals dominant.
  const sim = similarityRatio(q, f);
  score += sim * 500;

  return score;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function rankByQuery<T>(
  items: T[],
  query: string,
  getFields: (item: T) => Array<string | undefined | null>,
  options?: SmartSearchOptions
): T[] {
  const q = normalizeText(query);
  if (!q) return items;

  const scored = items
    .map((item) => {
      const fields = getFields(item)
        .map((v) => (typeof v === "string" ? v : ""))
        .filter(Boolean);

      const best = fields.reduce((max, field) => {
        const s = scoreField(query, field, options);
        return s > max ? s : max;
      }, -Infinity);

      return { item, score: best };
    })
    // Drop items that have literally no scoreable fields
    .filter((x) => Number.isFinite(x.score));

  scored.sort((a, b) => b.score - a.score);
  return scored.map((x) => x.item);
}

export function buildTmdbQueryVariants(query: string, options?: SmartSearchOptions): string[] {
  const normalized = normalizeText(query);
  const tokens = tokenizeQuery(query, options);

  const variants = new Set<string>();
  if (normalized) variants.add(normalized);

  if (tokens.length > 0) {
    variants.add(tokens.join(" "));

    for (const t of tokens) {
      if (t.length >= 3) variants.add(t);

      // Heuristic splits for concatenations/misspellings.
      if (t.length >= 8) {
        variants.add(t.slice(0, 4));
        variants.add(t.slice(-4));
        variants.add(`${t.slice(0, 4)} ${t.slice(-4)}`);
      } else if (t.length >= 6) {
        variants.add(t.slice(0, 3));
        variants.add(t.slice(-3));
        variants.add(`${t.slice(0, 3)} ${t.slice(-3)}`);
      }
    }
  }

  // Keep reasonable, unique, in priority order.
  const ordered = Array.from(variants)
    .map((v) => v.trim())
    .filter(Boolean)
    .filter((v) => v.length >= 3);

  // Put the full normalized query first.
  if (normalized) {
    const rest = ordered.filter((v) => v !== normalized);
    return [normalized, ...rest].slice(0, 6);
  }

  return ordered.slice(0, 6);
}
