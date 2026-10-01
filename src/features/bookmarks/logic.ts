import dns from 'dns';
import { promisify } from 'util';
import * as cheerio from 'cheerio';

const lookupAsync = promisify(dns.lookup);

function isPrivateIP(ip: string): boolean {
  return /^(10\.|127\.|169\.254\.|192\.168\.|172\.(1[6-9]|2[0-9]|3[0-1])\.)/.test(ip) || ip === '::1';
}

export interface BookmarkMetadata {
  url: string;
  title: string | null;
  description: string | null;
  image_url: string | null;
  favicon_url: string | null;
}

export async function fetchMetadata(urlStr: string): Promise<BookmarkMetadata> {
  let urlObj: URL;
  try {
    urlObj = new URL(urlStr);
  } catch {
    throw new Error('Invalid URL');
  }

  if (urlObj.protocol !== 'http:' && urlObj.protocol !== 'https:') {
    throw new Error('Invalid protocol. Only HTTP/HTTPS are allowed.');
  }

  // Normalize URL by removing tracking params
  ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'].forEach(param => {
    urlObj.searchParams.delete(param);
  });
  const cleanUrl = urlObj.toString();

  // SSRF DNS verification
  try {
    const { address } = await lookupAsync(urlObj.hostname);
    if (isPrivateIP(address)) {
      throw new Error('Private IP access denied (SSRF prevention)');
    }
  } catch (err: any) {
    if (err.message.includes('SSRF')) throw err;
    throw new Error(`DNS resolution failed for ${urlObj.hostname}`);
  }

  // Fetch with timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);

  let html = '';
  try {
    const res = await fetch(cleanUrl, {
      signal: controller.signal,
      redirect: 'follow', 
      headers: {
        'User-Agent': 'PersonalOS-Bookmark-Bot/1.0',
        'Accept': 'text/html'
      }
    });

    clearTimeout(timeoutId);

    if (!res.ok) throw new Error(`HTTP error ${res.status}`);

    const contentLength = res.headers.get('content-length');
    if (contentLength && parseInt(contentLength, 10) > 2 * 1024 * 1024) {
      throw new Error('Response too large');
    }

    // In a real app we'd stream this to limit size, here we'll just check after reading
    // or use slice if possible. Using text() is a bit dangerous if it's huge but standard fetch doesn't have a quick byte limit easily without stream reading.
    html = await res.text();
    if (html.length > 2 * 1024 * 1024) {
      throw new Error('Response too large');
    }
  } catch (err: any) {
    clearTimeout(timeoutId);
    throw new Error(err.message || 'Failed to fetch URL');
  }

  const $ = cheerio.load(html);
  
  const title = $('meta[property="og:title"]').attr('content') || $('title').text() || urlObj.hostname;
  const description = $('meta[property="og:description"]').attr('content') || $('meta[name="description"]').attr('content') || null;
  let image_url = $('meta[property="og:image"]').attr('content') || $('meta[name="twitter:image"]').attr('content') || null;
  let favicon_url = $('link[rel="icon"]').attr('href') || $('link[rel="shortcut icon"]').attr('href') || '/favicon.ico';

  // Fix relative URLs
  if (image_url && !image_url.startsWith('http')) {
    image_url = new URL(image_url, cleanUrl).toString();
  }
  if (favicon_url && !favicon_url.startsWith('http')) {
    favicon_url = new URL(favicon_url, cleanUrl).toString();
  }

  return {
    url: cleanUrl,
    title,
    description,
    image_url,
    favicon_url
  };
}
