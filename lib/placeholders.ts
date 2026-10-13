// Huecos de las plantillas de entrega: texto entre corchetes, como «[Nombre del proyecto]».
// Los usan /idea (aviso en desarrollo) y `npm run docs:pending`, para que nada llegue al
// jurado sin rellenar.

// "[" + text + "]", except syntax that also uses brackets: checkboxes "[ ]", footnotes "[^1]",
// links "[text](url)" and Mermaid shapes such as ["label"] or [("label")]. A hole may span
// lines (wrapped prose).
const HOLE = /\[(?![\s"(/\\^])([^[\]]{1,400})\](?!\()/g;

export type Hole = { line: number; text: string };
export type ContentHole = { path: string; text: string };

const tidy = (hole: string) => hole.replace(/\s+/g, " ");
// Replace text with spaces, keeping line breaks so match positions still map to lines.
const blank = (text: string) => text.replace(/[^\n]/g, " ");

/** Holes in plain text, such as a field of app/idea/content.ts. */
export function findHoles(text: string): string[] {
  return [...text.matchAll(HOLE)].map((match) => tidy(match[0]));
}

/**
 * Holes in a Markdown document, with their line. Ignores comments, inline code and code
 * blocks, except Mermaid diagrams: their labels are part of what has to be renamed.
 */
export function findMarkdownHoles(markdown: string): Hole[] {
  const text = markdown
    .replace(/<!--[\s\S]*?-->/g, blank)
    .replace(/^(```|~~~)([^\n]*)\n[\s\S]*?^\1[ \t]*$/gm, (block, _fence, info: string) =>
      info.trim() === "mermaid" ? block : blank(block),
    )
    .replace(/`[^`\n]*`/g, blank)
    .replace(/^(\s*[-*+]\s+)\[[xX]\]/gm, (_line, marker: string) => `${marker}   `) // "- [x]"
    .replace(/^ {0,3}\[[^\]\n]+\]:[ \t]*\S+.*$/gm, blank); // link definition "[id]: url"

  return [...text.matchAll(HOLE)].map((match) => ({
    line: text.slice(0, match.index).split("\n").length,
    text: tidy(match[0]),
  }));
}

/** Holes in every string of a nested object, with the path to each one. */
export function findContentHoles(value: unknown, path = ""): ContentHole[] {
  if (typeof value === "string") return findHoles(value).map((text) => ({ path, text }));
  if (Array.isArray(value)) {
    return value.flatMap((item, index) => findContentHoles(item, `${path}[${index}]`));
  }
  if (value && typeof value === "object") {
    return Object.entries(value).flatMap(([key, item]) =>
      findContentHoles(item, path ? `${path}.${key}` : key),
    );
  }
  return [];
}
