/**
 * The book's markdown (bold, italics, paragraphs) → the minimal HTML the
 * sheets render. Book text in book-text.json is pandoc's markdown of the
 * v1.2 docx, so only these three shapes occur in it.
 */
export function md(source) {
  return String(source ?? "")
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p>${p
      .replace(/\*\*([^*]+?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*([^*]+?)\*/g, "<em>$1</em>")
      .replace(/\n/g, "<br>")}</p>`)
    .join("\n");
}
