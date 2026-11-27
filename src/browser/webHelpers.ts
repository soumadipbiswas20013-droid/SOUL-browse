export interface SearchResultEntry {
  title: string;
  url: string;
  displayUrl: string;
  snippet: string;
}

export function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/gi, "'")
    .replace(/&nbsp;/g, ' ');
}

export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function stripTags(html: string): string {
  return decodeHtmlEntities(html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim());
}

export function resolveUrl(base: string, maybeRel: string): string {
  try {
    return new URL(maybeRel, base).toString();
  } catch {
    return maybeRel;
  }
}

export function extractSearchQueryFromUrl(
  rawUrl: string
): { engineName: string; query: string; actionBase: string } | null {
  try {
    const u = new URL(rawUrl);
    const host = u.hostname.toLowerCase();
    const q = u.searchParams.get('q') || u.searchParams.get('p') || '';
    if (!q.trim()) return null;

    if ((host === 'bing.com' || host.endsWith('.bing.com')) && u.pathname.startsWith('/search')) {
      return { engineName: 'Bing', query: q.trim(), actionBase: 'https://www.bing.com/search' };
    }
    return null;
  } catch {
    return null;
  }
}

export function unwrapBingLink(rawHref: string): string {
  const decoded = decodeHtmlEntities(rawHref.trim());
  try {
    const parsed = new URL(decoded, 'https://www.bing.com');
    if (parsed.hostname.endsWith('bing.com') && parsed.pathname.startsWith('/ck/a')) {
      const uParam = parsed.searchParams.get('u');
      if (uParam && uParam.startsWith('a1')) {
        const b64 = uParam.slice(2).replace(/-/g, '+').replace(/_/g, '/');
        const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4);
        const target = Buffer.from(padded, 'base64').toString('utf8');
        if (/^https?:\/\//i.test(target)) {
          return target;
        }
      }
    }
    return parsed.toString();
  } catch {
    return decoded;
  }
}

export function parseBingHtmlResults(html: string): SearchResultEntry[] {
  const results: SearchResultEntry[] = [];
  const blocks = html.split(/<li[^>]*class="[^"]*\bb_algo\b[^"]*"[^>]*>/i).slice(1);

  for (const block of blocks) {
    const h2Match = block.match(/<h2[^>]*>[\s\S]*?<a[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?<\/h2>/i);
    if (!h2Match) continue;

    let targetUrl = unwrapBingLink(h2Match[1]);
    const citeMatch = block.match(/<cite[^>]*>([\s\S]*?)<\/cite>/i);
    const displayUrl = citeMatch ? stripTags(citeMatch[1]) : '';

    if ((!targetUrl || targetUrl.includes('bing.com/ck/a')) && displayUrl) {
      const cleanCite = displayUrl.split(/\s+/)[0];
      targetUrl = /^https?:\/\//i.test(cleanCite) ? cleanCite : `https://${cleanCite}`;
    }

    if (!/^https?:\/\//i.test(targetUrl)) continue;
    const title = stripTags(h2Match[2]);
    if (!title) continue;

    const snippetMatch = block.match(/<div[^>]*class="[^"]*b_caption[^"]*"[^>]*>[\s\S]*?<p[^>]*>([\s\S]*?)<\/p>/i);
    const snippet = snippetMatch ? stripTags(snippetMatch[1]) : '';

    let cleanDisplay = displayUrl;
    if (!cleanDisplay) {
      try {
        const u = new URL(targetUrl);
        cleanDisplay = `${u.hostname}${u.pathname === '/' ? '' : u.pathname}`;
      } catch {
        cleanDisplay = targetUrl;
      }
    }

    results.push({ title, url: targetUrl, displayUrl: cleanDisplay, snippet });
    if (results.length >= 15) break;
  }

  return results;
}

export function buildSearchResultsHtml(
  query: string,
  engineName: string,
  actionBase: string,
  results: SearchResultEntry[]
): string {
  const safeQuery = escapeHtml(query);
  const safeEngine = escapeHtml(engineName);
  const safeAction = escapeHtml(actionBase);

  const itemsHtml =
    results.length > 0
      ? results
          .map((item) => {
            const safeUrl = escapeHtml(item.url);
            const safeTitle = escapeHtml(item.title);
            const safeDisplay = escapeHtml(item.displayUrl);
            const safeSnippet = escapeHtml(item.snippet);
            return `
              <article style="margin-bottom: 1.5rem; padding-bottom: 1.25rem; border-bottom: 1px solid #e2e8f0;">
                <div style="font-size: 0.78rem; color: #475569; margin-bottom: 0.2rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${safeDisplay}</div>
                <h2 style="margin: 0 0 0.35rem 0; font-size: 1.1rem; line-height: 1.35; font-weight: 600;">
                  <a href="${safeUrl}" data-soul-href="${safeUrl}" style="color: #1d4ed8; text-decoration: none;">${safeTitle}</a>
                </h2>
                ${safeSnippet ? `<p style="margin: 0; font-size: 0.9rem; line-height: 1.55; color: #334155;">${safeSnippet}</p>` : ''}
              </article>
            `;
          })
          .join('\n')
      : `
        <div style="padding: 2rem; border: 1px solid #e2e8f0; border-radius: 0.75rem; background: #f8fafc; color: #475569;">
          <p style="margin: 0 0 0.5rem 0; font-weight: 600; color: #0f172a;">No direct web results were returned for &ldquo;${safeQuery}&rdquo;.</p>
          <p style="margin: 0; font-size: 0.875rem;">Try refining your search keywords or entering a direct website domain (such as wikipedia.org or developer.mozilla.org) in the address bar.</p>
        </div>
      `;

  return `
    <div class="soul-search-results">
      <div style="margin-bottom: 1.75rem; padding-bottom: 1.25rem; border-bottom: 1px solid #e2e8f0;">
        <div style="font-size: 0.75rem; color: #64748b; margin-bottom: 0.65rem;">
          Web search via <strong>${safeEngine}</strong> · ${results.length} results for &ldquo;${safeQuery}&rdquo;
        </div>
        <form action="${safeAction}" data-soul-action="${safeAction}" method="get" style="display: flex; gap: 0.5rem; max-width: 640px;">
          <input type="text" name="q" value="${safeQuery}" aria-label="Search query" style="flex: 1; padding: 0.55rem 0.85rem; border: 1px solid #cbd5e1; border-radius: 0.5rem; font-size: 0.95rem; color: #0f172a; background: #ffffff;" />
          <button type="submit" style="padding: 0.55rem 1.1rem; border: none; border-radius: 0.5rem; background: #2563eb; color: #ffffff; font-size: 0.875rem; font-weight: 600; cursor: pointer;">Search</button>
        </form>
      </div>
      <div>${itemsHtml}</div>
    </div>
  `;
}

export function extractReaderContent(html: string): { heading: string; paragraphs: string[]; wordCount: number } {
  const withoutNoise = html
    .replace(/<head[\s\S]*?<\/head>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<nav[\s\S]*?<\/nav>/gi, ' ')
    .replace(/<footer[\s\S]*?<\/footer>/gi, ' ')
    .replace(/<aside[\s\S]*?<\/aside>/gi, ' ');

  const h1Match = withoutNoise.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const heading = stripTags(h1Match?.[1] || titleMatch?.[1] || 'Untitled Page');

  const blocks: string[] = [];
  const blockRegex = /<(p|h2|h3|li|blockquote)[^>]*>([\s\S]*?)<\/\1>/gi;
  let match: RegExpExecArray | null;
  while ((match = blockRegex.exec(withoutNoise)) !== null) {
    const text = stripTags(match[2]);
    if (text.length > 28 && !blocks.includes(text)) {
      blocks.push(text);
    }
    if (blocks.length >= 60) break;
  }

  const wordCount = blocks.join(' ').split(/\s+/).filter(Boolean).length;
  return { heading, paragraphs: blocks, wordCount };
}

export function sanitizeAndRewriteHtml(html: string, baseUrl: string): string {
  let clean = html
    .replace(/<!DOCTYPE[^>]*>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<head[\s\S]*?<\/head>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, '')
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, '')
    .replace(/<object[\s\S]*?<\/object>/gi, '')
    .replace(/<embed[\s\S]*?>/gi, '')
    .replace(/<svg[^>]*display\s*:\s*none[^>]*>[\s\S]*?<\/svg>/gi, '')
    .replace(/\son[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/javascript\s*:/gi, 'blocked:');

  // Extract body content cleanly even when large documents are truncated before </body>
  const bodyMatch = clean.match(/<body[^>]*>([\s\S]*?)(?:<\/body>|$)/i);
  let bodyInner = bodyMatch ? bodyMatch[1] : clean.replace(/<\/?(?:html|body)[^>]*>/gi, '');

  // Rewrite href, src, and form action attributes so relative links, images, and search forms resolve cleanly
  bodyInner = bodyInner.replace(
    /\s(href|src|action)\s*=\s*("([^"]*)"|'([^']*)')/gi,
    (full, attr, _quoted, dq, sq) => {
      const raw = dq ?? sq ?? '';
      if (
        !raw ||
        raw.startsWith('#') ||
        raw.startsWith('data:') ||
        raw.startsWith('mailto:') ||
        raw.startsWith('blocked:')
      ) {
        return full;
      }
      const abs = resolveUrl(baseUrl, raw);
      const safeAbs = abs.replace(/"/g, '&quot;');
      const attrLower = attr.toLowerCase();
      if (attrLower === 'href') {
        return ` href="${safeAbs}" data-soul-href="${safeAbs}"`;
      }
      if (attrLower === 'action') {
        return ` action="${safeAbs}" data-soul-action="${safeAbs}"`;
      }
      return ` src="${safeAbs}"`;
    }
  );

  return bodyInner;
}
