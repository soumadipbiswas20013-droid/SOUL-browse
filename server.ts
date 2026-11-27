import express, { type Request, type Response } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import dns from 'dns/promises';
import net from 'net';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';
import {
  buildSearchResultsHtml,
  decodeHtmlEntities,
  extractReaderContent,
  extractSearchQueryFromUrl,
  parseBingHtmlResults,
  resolveUrl,
  sanitizeAndRewriteHtml,
  stripTags,
} from './src/browser/webHelpers.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '2mb' }));

// SSRF protection: reject private/loopback/link-local IPv4 & IPv6 addresses
function isPrivateIp(ip: string): boolean {
  if (net.isIPv4(ip)) {
    const parts = ip.split('.').map(Number);
    if (parts[0] === 10) return true;
    if (parts[0] === 127) return true;
    if (parts[0] === 0) return true;
    if (parts[0] === 169 && parts[1] === 254) return true;
    if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
    if (parts[0] === 192 && parts[1] === 168) return true;
    if (parts[0] >= 224) return true;
    return false;
  }
  if (net.isIPv6(ip)) {
    const lower = ip.toLowerCase();
    if (lower === '::1' || lower === '::') return true;
    if (lower.startsWith('fe80:') || lower.startsWith('fc') || lower.startsWith('fd')) return true;
    if (lower.startsWith('::ffff:')) {
      return isPrivateIp(lower.slice(7));
    }
  }
  return false;
}

async function assertSafeExternalUrl(rawUrl: string): Promise<URL> {
  const parsed = new URL(rawUrl);
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error('UNSUPPORTED_PROTOCOL');
  }
  const hostname = parsed.hostname.toLowerCase();
  if (hostname === 'localhost' || hostname.endsWith('.local') || hostname.endsWith('.internal')) {
    throw new Error('BLOCKED_HOST');
  }
  if (net.isIP(hostname) && isPrivateIp(hostname)) {
    throw new Error('BLOCKED_HOST');
  }
  try {
    const records = await dns.lookup(hostname, { all: true });
    for (const rec of records) {
      if (isPrivateIp(rec.address)) {
        throw new Error('BLOCKED_HOST');
      }
    }
  } catch (err) {
    if ((err as Error).message === 'BLOCKED_HOST') throw err;
    throw new Error('ERR_NAME_NOT_RESOLVED');
  }
  return parsed;
}

app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ ok: true, engine: 'SOUL Web Proxy', timestamp: Date.now() });
});

app.get('/api/browse', async (req: Request, res: Response) => {
  const rawUrl = typeof req.query.url === 'string' ? req.query.url.trim() : '';
  if (!rawUrl) {
    res.status(400).json({ errorCode: 'ERR_INVALID_URL', message: 'Missing URL parameter.' });
    return;
  }

  try {
    const parsedUrl = await assertSafeExternalUrl(rawUrl);
    const searchIntent = extractSearchQueryFromUrl(parsedUrl.toString());

    // Route Bing search queries directly through Bing and render clean results
    if (searchIntent) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 12000);
      const bingRes = await fetch(
        `https://www.bing.com/search?q=${encodeURIComponent(searchIntent.query)}&setlang=en`,
        {
          method: 'GET',
          signal: controller.signal,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) SOULBrowser/1.0 Chrome/134.0.0.0 Safari/537.36',
            Accept: 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
          },
        }
      );
      clearTimeout(timeout);

      const bingHtml = await bingRes.text();
      const results = parseBingHtmlResults(bingHtml);
      const renderedHtml = buildSearchResultsHtml(
        searchIntent.query,
        'Bing',
        'https://www.bing.com/search',
        results
      );

      res.json({
        ok: true,
        status: bingRes.status,
        url: parsedUrl.toString(),
        title: `${searchIntent.query} — Bing`,
        description: `Bing search results for ${searchIntent.query}`,
        favicon: 'https://www.bing.com/favicon.ico',
        isHttps: true,
        contentType: 'text/html; charset=utf-8',
        sanitizedHtml: renderedHtml,
        rawSource: bingHtml.slice(0, 120_000),
        reader: {
          heading: `Bing search results: ${searchIntent.query}`,
          paragraphs: results.map((r) => `${r.title} (${r.displayUrl}) — ${r.snippet}`),
          wordCount: results.map((r) => `${r.title} ${r.snippet}`).join(' ').split(/\s+/).filter(Boolean).length,
        },
        headers: {
          server: 'Bing',
          cacheControl: 'no-store',
        },
      });
      return;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);

    const upstream = await fetch(parsedUrl.toString(), {
      method: 'GET',
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) SOULBrowser/1.0 Chrome/134.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,text/plain;q=0.8,*/*;q=0.5',
      },
    });
    clearTimeout(timeout);

    const finalUrl = upstream.url || parsedUrl.toString();
    const contentType = upstream.headers.get('content-type') || 'text/html';
    const status = upstream.status;

    if (!contentType.includes('text/html') && !contentType.includes('text/plain') && !contentType.includes('application/xhtml+xml') && !contentType.includes('application/json')) {
      res.json({
        ok: upstream.ok,
        status,
        url: finalUrl,
        title: path.basename(new URL(finalUrl).pathname) || finalUrl,
        description: `Resource (${contentType})`,
        favicon: `${new URL(finalUrl).origin}/favicon.ico`,
        isHttps: finalUrl.startsWith('https://'),
        contentType,
        sanitizedHtml: `<div class="soul-raw-doc"><p>Content-Type: <code>${contentType}</code></p><p>This resource is not an HTML webpage. You can download it using the Download Manager.</p></div>`,
        rawSource: '',
        reader: {
          heading: finalUrl,
          paragraphs: [`Resource type: ${contentType}`],
          wordCount: 4,
        },
        headers: {
          server: upstream.headers.get('server') || 'Unknown',
          cacheControl: upstream.headers.get('cache-control') || 'None',
        },
      });
      return;
    }

    const rawText = await upstream.text();
    const boundedSource = rawText.slice(0, 350_000);

    const titleMatch = boundedSource.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    const descMatch = boundedSource.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["'][^>]*>/i);
    const iconMatch = boundedSource.match(/<link[^>]*rel=["'](?:shortcut )?icon["'][^>]*href=["']([^"']*)["'][^>]*>/i);

    const title = titleMatch ? stripTags(titleMatch[1]) : new URL(finalUrl).hostname;
    const description = descMatch ? decodeHtmlEntities(descMatch[1]) : '';
    const favicon = iconMatch ? resolveUrl(finalUrl, iconMatch[1]) : `${new URL(finalUrl).origin}/favicon.ico`;

    const isPlain = contentType.includes('text/plain') || contentType.includes('application/json');
    const sanitizedHtml = isPlain
      ? `<pre class="whitespace-pre-wrap font-mono text-sm leading-relaxed">${boundedSource.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>`
      : sanitizeAndRewriteHtml(boundedSource, finalUrl);
    const reader = extractReaderContent(boundedSource);

    res.json({
      ok: upstream.ok,
      status,
      url: finalUrl,
      title: title || finalUrl,
      description,
      favicon,
      isHttps: finalUrl.startsWith('https://'),
      contentType,
      sanitizedHtml,
      rawSource: boundedSource.slice(0, 120_000),
      reader,
      headers: {
        server: upstream.headers.get('server') || 'Protected',
        cacheControl: upstream.headers.get('cache-control') || 'default',
      },
    });
  } catch (err) {
    const msg = (err as Error).message || 'ERR_CONNECTION_FAILED';
    let errorCode = 'ERR_CONNECTION_FAILED';
    let userMessage = 'SOUL Browser could not establish a connection to this address.';

    if (msg === 'ERR_NAME_NOT_RESOLVED') {
      errorCode = 'ERR_NAME_NOT_RESOLVED';
      userMessage = 'The server IP address could not be found. Check your spelling or network connection.';
    } else if (msg === 'BLOCKED_HOST' || msg === 'UNSUPPORTED_PROTOCOL') {
      errorCode = 'ERR_ADDRESS_UNREACHABLE';
      userMessage = 'Access to local network or unsupported protocol addresses is restricted in web preview mode.';
    } else if ((err as Error).name === 'AbortError') {
      errorCode = 'ERR_TIMED_OUT';
      userMessage = 'The remote server took too long to respond.';
    } else if (msg.toLowerCase().includes('certificate') || msg.toLowerCase().includes('ssl') || msg.toLowerCase().includes('tls')) {
      errorCode = 'ERR_CERT_AUTHORITY_INVALID';
      userMessage = 'The site security certificate could not be verified. SOUL Browser blocks unverified connections by default.';
    }

    res.status(502).json({
      ok: false,
      errorCode,
      message: userMessage,
      url: rawUrl,
    });
  }
});

app.get('/api/suggestions', async (req: Request, res: Response) => {
  const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
  if (!q || q.length > 120) {
    res.json({ suggestions: [] });
    return;
  }
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3000);
    const resp = await fetch(
      `https://api.bing.com/qsonhs.aspx?q=${encodeURIComponent(q)}&mkt=en-US`,
      { signal: controller.signal }
    );
    clearTimeout(timer);
    if (!resp.ok) {
      res.json({ suggestions: [] });
      return;
    }
    const data = (await resp.json()) as {
      AS?: { Results?: Array<{ Suggests?: Array<{ Txt?: string }> }> };
    };
    const rawItems = (data?.AS?.Results || [])
      .flatMap((grp) => grp.Suggests || [])
      .map((s) => s.Txt?.trim() || '')
      .filter(Boolean);
    const items = Array.from(new Set(rawItems)).slice(0, 6);
    res.json({ suggestions: items });
  } catch {
    res.json({ suggestions: [] });
  }
});

app.get('/api/weather', async (req: Request, res: Response) => {
  const city = typeof req.query.city === 'string' && req.query.city.trim() ? req.query.city.trim() : 'Kolkata';
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4500);
    const geoRes = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`,
      { signal: controller.signal }
    );
    const geoData = (await geoRes.json()) as { results?: Array<{ name: string; country: string; latitude: number; longitude: number }> };
    const place = geoData.results?.[0];
    if (!place) {
      clearTimeout(timer);
      res.status(404).json({ error: 'Location not found' });
      return;
    }
    const wxRes = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${place.latitude}&longitude=${place.longitude}&current=temperature_2m,weather_code,wind_speed_10m`,
      { signal: controller.signal }
    );
    clearTimeout(timer);
    const wxData = (await wxRes.json()) as {
      current?: { temperature_2m: number; weather_code: number; wind_speed_10m: number };
    };
    const code = wxData.current?.weather_code ?? 0;
    const condition =
      code === 0 ? 'Clear sky' :
      code <= 3 ? 'Partly cloudy' :
      code <= 48 ? 'Foggy' :
      code <= 67 ? 'Rain' :
      code <= 77 ? 'Snow' : 'Showers';

    res.json({
      location: `${place.name}, ${place.country}`,
      tempC: Math.round(wxData.current?.temperature_2m ?? 26),
      windKmh: Math.round(wxData.current?.wind_speed_10m ?? 10),
      condition,
    });
  } catch {
    res.status(503).json({ error: 'Weather service unavailable' });
  }
});

app.get('/api/sample-file', (req: Request, res: Response) => {
  const kind = req.query.kind === 'guide' ? 'guide' : 'bookmarks';
  if (kind === 'guide') {
    res.setHeader('Content-Disposition', 'attachment; filename="SOUL-Browser-Shortcuts.txt"');
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.send(
      [
        'SOUL Browser — Keyboard Shortcuts Reference',
        'By SOUL (Soumadip Orbit Universal Labs)',
        '===========================================',
        'Ctrl + T           New Tab',
        'Ctrl + W           Close Active Tab',
        'Ctrl + Shift + T   Reopen Closed Tab',
        'Ctrl + L           Focus Address Bar',
        'Ctrl + R           Reload Page',
        'Ctrl + D           Bookmark Current Page',
        'Ctrl + H           Open History Manager',
        'Ctrl + J           Open Download Manager',
        'Ctrl + F           Find in Page',
        'Ctrl + Shift + N   New Private Window',
        'Ctrl + Plus / -    Zoom In / Zoom Out',
        'Ctrl + 0           Reset Zoom',
      ].join('\n')
    );
    return;
  }
  res.setHeader('Content-Disposition', 'attachment; filename="soul-browser-release-notes.json"');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.send(
    JSON.stringify(
      {
        product: 'SOUL Browser',
        organization: 'SOUL — Soumadip Orbit Universal Labs',
        developer: 'Soumadip Biswas',
        version: '1.0.0',
        targetPlatform: 'Windows 11 x64 (Electron + Chromium)',
      },
      null,
      2
    )
  );
});

app.get('/api/download-proxy', async (req: Request, res: Response) => {
  const rawUrl = typeof req.query.url === 'string' ? req.query.url.trim() : '';
  const rawFilename = typeof req.query.filename === 'string' ? req.query.filename.trim() : 'download.html';
  const safeFilename = path.basename(rawFilename).replace(/[^a-zA-Z0-9._\- ()]/g, '_') || 'download.html';

  if (!rawUrl) {
    res.status(400).send('Missing URL');
    return;
  }

  try {
    const parsedUrl = await assertSafeExternalUrl(rawUrl);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12000);
    const upstream = await fetch(parsedUrl.toString(), {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) SOULBrowser/1.0',
      },
    });
    clearTimeout(timer);

    const contentType = upstream.headers.get('content-type') || 'application/octet-stream';
    const buf = Buffer.from(await upstream.arrayBuffer());
    res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}"`);
    res.setHeader('Content-Type', contentType);
    res.send(buf);
  } catch {
    res.status(502).send('Unable to download remote resource.');
  }
});

app.get('/api/electron-files', (_req: Request, res: Response) => {
  const candidates = [
    'electron/package.json',
    'electron/main.js',
    'electron/preload.js',
    'electron/storage.js',
    'electron/ipc-handlers.js',
    'electron-builder.yml',
    'README.md',
  ];
  const files = candidates
    .filter((rel) => fs.existsSync(path.join(__dirname, rel)))
    .map((rel) => ({
      path: rel,
      content: fs.readFileSync(path.join(__dirname, rel), 'utf-8'),
    }));
  res.json({ files });
});

app.post('/api/ai/chat', async (req: Request, res: Response) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    res.status(503).json({
      error: 'SOUL AI is not connected because GEMINI_API_KEY is not configured in server secrets.',
    });
    return;
  }

  const { prompt, mode, pageContext, isPrivate } = req.body as {
    prompt?: string;
    mode?: string;
    pageContext?: { url?: string; title?: string; excerpt?: string } | null;
    isPrivate?: boolean;
  };

  if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
    res.status(400).json({ error: 'Prompt is required.' });
    return;
  }

  if (isPrivate && pageContext) {
    res.status(400).json({
      error: 'Automatic page context transmission is blocked in Private Browsing mode.',
    });
    return;
  }

  try {
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    const systemInstruction =
      'You are SOUL AI, an optional, privacy-conscious web reading and coding assistant built into SOUL Browser by Soumadip Orbit Universal Labs. Provide clear, concise, accurate explanations. Never fabricate facts about pages you were not given.';

    const contextBlock = pageContext
      ? `\n\n[User-consented current page context]\nTitle: ${pageContext.title || 'Unknown'}\nURL: ${pageContext.url || 'Unknown'}\nExcerpt:\n${(pageContext.excerpt || '').slice(0, 6000)}`
      : '';

    const taskPrefix =
      mode === 'summarize'
        ? 'Summarize the following web page clearly with key points:\n'
        : mode === 'explain'
        ? 'Explain the following text or concept clearly in plain language:\n'
        : mode === 'code'
        ? 'Explain the programming concepts or code clearly:\n'
        : '';

    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: `${taskPrefix}${prompt.trim()}${contextBlock}`,
      config: {
        systemInstruction,
      },
    });

    res.json({
      reply: response.text || 'No response generated.',
      model: 'gemini-4-hydrogen',
    });
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : 'AI request failed.';
    res.status(502).json({ error: errMsg });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.join(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`SOUL Browser server running on http://localhost:${PORT}`);
  });
}

startServer();
