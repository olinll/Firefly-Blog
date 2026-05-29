import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { visit } from "unist-util-visit";

/**
 * Rehype plugin: pre-fetch metadata for <url> elements before rehype-components runs.
 * Stores fetched data in node.properties._meta so UrlCardComponent can read it synchronously.
 */
export function rehypeUrlMeta() {
  return asyncTransformer;
}

async function asyncTransformer(tree) {
  const urlNodes = [];

  visit(tree, "element", (node) => {
    if (node.tagName === "url" && node.properties?.href) {
      urlNodes.push(node);
    }
  });

  if (urlNodes.length === 0) return;

  await Promise.all(urlNodes.map((node) => fetchMeta(node)));
}

async function fetchMeta(node) {
  const href = node.properties.href;
  const isExternal = /^https?:\/\//i.test(href);

  let meta = {};

  if (isExternal) {
    meta = await fetchExternalMeta(href);
  } else {
    meta = fetchInternalMeta(href);
  }

  node.properties._meta = meta;
}

function fetchInternalMeta(href) {
  const match = href.match(/^\/posts\/([^/]+)/);
  if (!match) return {};

  const slug = match[1];
  const projectRoot = process.cwd();
  const mdPath = join(projectRoot, "src", "content", "posts", slug, "index.md");

  if (!existsSync(mdPath)) return {};

  try {
    const content = readFileSync(mdPath, "utf-8");
    const fmMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    if (!fmMatch) return {};

    const fm = fmMatch[1];
    const title = fm.match(/^title:\s*["']?(.+?)["']?\s*$/m)?.[1];
    const description = fm.match(/^description:\s*["']?(.+?)["']?\s*$/m)?.[1];
    return { title, description };
  } catch {
    return {};
  }
}

async function fetchExternalMeta(url) {
  try {
    const resp = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; LinkCard/1.0)" },
      signal: AbortSignal.timeout(8000),
    });
    const html = await resp.text();

    const ogTitle = html.match(
      /<meta\s+property=["']og:title["']\s+content=["']([^"']+)["']/i,
    )?.[1];
    const titleTag = html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1];
    const ogDesc = html.match(
      /<meta\s+property=["']og:description["']\s+content=["']([^"']+)["']/i,
    )?.[1];
    const metaDesc = html.match(
      /<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i,
    )?.[1];
    const ogImage = html.match(
      /<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i,
    )?.[1];

    return {
      title: titleTag || ogTitle || undefined,
      description: ogDesc || metaDesc || undefined,
      ogImage: ogImage || undefined,
    };
  } catch {
    return {};
  }
}
