import { describe, expect, it } from "vitest";
import { findContentHoles, findHoles, findMarkdownHoles } from "./placeholders";

describe("findHoles", () => {
  it("finds bracketed text, including holes inside a sentence", () => {
    expect(findHoles("Ahorra [X] minutos a [quién]")).toEqual(["[X]", "[quién]"]);
  });

  it("ignores filled text", () => {
    expect(findHoles("Sevilla tiene 260 estaciones de Sevici.")).toEqual([]);
  });
});

describe("findMarkdownHoles", () => {
  it("reports holes with their line, also when they wrap", () => {
    const markdown = "# [Nombre]\n\nTexto [que sigue\nen otra línea] y fin.";
    expect(findMarkdownHoles(markdown)).toEqual([
      { line: 1, text: "[Nombre]" },
      { line: 3, text: "[que sigue en otra línea]" },
    ]);
  });

  it("ignores links, checkboxes, footnotes, inline code, comments and code blocks", () => {
    const markdown = [
      "Ver [la fuente](https://example.com) y [^1].",
      "- [ ] pendiente",
      "- [x] hecho",
      "Ejecuta `npm run seed -- [nombre]`.",
      "<!-- [instrucción para quien rellena] -->",
      "```bash",
      "echo [no es un hueco]",
      "```",
      "[id]: https://example.com",
    ].join("\n");
    expect(findMarkdownHoles(markdown)).toEqual([]);
  });

  it("tells a hole followed by a colon from a link definition", () => {
    expect(findMarkdownHoles("- [Nombre de la fuente]: [enlace]")).toEqual([
      { line: 1, text: "[Nombre de la fuente]" },
      { line: 1, text: "[enlace]" },
    ]);
  });

  it("finds holes in Mermaid labels but not the diagram syntax", () => {
    const markdown = [
      "```mermaid",
      "flowchart LR",
      '  UI["Interfaz"] --> RETO["[Lógica del reto]<br/>lib/services"]',
      '  RETO --> DB[("Base de datos")]',
      "```",
    ].join("\n");
    expect(findMarkdownHoles(markdown)).toEqual([{ line: 3, text: "[Lógica del reto]" }]);
  });
});

describe("findContentHoles", () => {
  it("walks nested objects and arrays and reports the path", () => {
    const content = {
      tagline: "Llegar a tiempo",
      stat: { value: "[Cifra]", source: null },
      steps: [{ title: "Abre la app" }, { title: "[Paso]" }],
    };
    expect(findContentHoles(content)).toEqual([
      { path: "stat.value", text: "[Cifra]" },
      { path: "steps[1].title", text: "[Paso]" },
    ]);
  });
});
