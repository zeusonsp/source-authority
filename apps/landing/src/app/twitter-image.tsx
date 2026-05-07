import {
  ogImageAlt,
  ogImageContentType,
  ogImageSize,
  renderOgImage,
} from "@/lib/og-image";

// Edge runtime — mesma razão do opengraph-image. Cada metadata file
// declara o próprio runtime; re-export entre eles confunde o build.
export const runtime = "edge";

export const alt = ogImageAlt;
export const size = ogImageSize;
export const contentType = ogImageContentType;

export default function TwitterImage() {
  return renderOgImage();
}
