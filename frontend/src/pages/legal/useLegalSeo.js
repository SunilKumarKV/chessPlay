import { useEffect } from "react";

const ORIGIN = "https://getchessplay.vercel.app";

function upsertMeta(selector, attributes) {
  let element = document.head.querySelector(selector);
  if (!element) {
    element = document.createElement("meta");
    document.head.appendChild(element);
  }
  Object.entries(attributes).forEach(([key, value]) => element.setAttribute(key, value));
}

export function useLegalSeo({ title, description, path }) {
  const fullTitle = `${title} | ChessPlay`;
  const url = `${ORIGIN}${path}`;

  useEffect(() => {
    document.title = fullTitle;
    upsertMeta('meta[name="description"]', { name: "description", content: description });
    upsertMeta('meta[property="og:title"]', { property: "og:title", content: fullTitle });
    upsertMeta('meta[property="og:description"]', { property: "og:description", content: description });
    upsertMeta('meta[property="og:type"]', { property: "og:type", content: "website" });
    upsertMeta('meta[property="og:url"]', { property: "og:url", content: url });
    upsertMeta('meta[property="og:image"]', { property: "og:image", content: `${ORIGIN}/chess-icon.svg` });
    upsertMeta('meta[name="twitter:card"]', { name: "twitter:card", content: "summary" });
  }, [description, fullTitle, url]);
}
