/// <reference types="mdast" />
import { h } from "hastscript";

/**
 * Creates a URL Card component.
 * Metadata is pre-fetched by rehype-url-meta.mjs and stored in properties._meta.
 *
 * @param {Object} properties
 * @param {string} properties.href
 * @param {string} [properties.title]
 * @param {string} [properties.description]
 * @param {Object} [properties._meta]
 * @param {import('mdast').RootContent[]} children
 * @returns {import('mdast').Parent}
 */
export function UrlCardComponent(properties, children) {
  if (Array.isArray(children) && children.length !== 0)
    return h("div", { class: "hidden" }, [
      'Invalid directive. ("url" directive must be leaf type \'::url{href="..."}\')',
    ]);

  const href = properties.href;
  if (!href)
    return h("div", { class: "hidden" }, 'Invalid URL. ("href" attribute is required)');

  const isExternal = /^https?:\/\//i.test(href);
  const cardUuid = `UC${Math.random().toString(36).slice(-6)}`;
  const hostname = isExternal ? new URL(href).hostname.replace(/^www\./, "") : "";

  // Read pre-fetched metadata (from rehype-url-meta.mjs)
  const meta = properties._meta || {};

  // Priority: user-specified > pre-fetched > fallback
  const title = properties.title || meta.title || (isExternal ? hostname : href);
  const description = properties.description || meta.description || (isExternal ? href : href);

  // Favicon: prefer og:image for external, Google favicon service as fallback
  const faviconUrl = meta.ogImage
    || (isExternal ? `https://www.google.com/s2/favicons?domain=${hostname}&sz=64` : "");

  // Build card
  const nFavicon = h(`img#${cardUuid}-favicon`, {
    class: "cu-favicon",
    src: faviconUrl,
    alt: "",
    width: "20",
    height: "20",
    loading: "lazy",
    onerror: "this.style.display='none'",
  });

  const nTitle = h(`span#${cardUuid}-title`, { class: "cu-title" }, title);
  const nDescription = h(
    `span#${cardUuid}-desc`,
    { class: "cu-description" },
    description,
  );
  const nIcon = h("div", { class: "cu-icon" }, [
    h(
      "svg",
      {
        width: "18",
        height: "18",
        viewBox: "0 0 24 24",
        fill: "none",
        stroke: "currentColor",
        "stroke-width": "2",
        "stroke-linecap": "round",
        "stroke-linejoin": "round",
      },
      [
        h("path", {
          d: isExternal
            ? "M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3"
            : "M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71",
        }),
      ],
    ),
  ]);

  const attrs = {
    class: "card-url no-styling",
    href,
  };
  if (isExternal) attrs.target = "_blank";

  return h(`a#${cardUuid}-card`, attrs, [
    nFavicon,
    h("div", { class: "cu-main" }, [nTitle, nDescription]),
    nIcon,
  ]);
}
