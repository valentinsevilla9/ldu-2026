import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { IDEA, type IdeaContent } from "./content";
import { IdeaView } from "./idea-view";

// The map has its own tests (modules/sevilla); here it only has to receive the right layers.
vi.mock("./context-map", () => ({
  ContextMap: ({ initial }: { initial: string[] }) => (
    <div data-testid="map">{initial.join(",")}</div>
  ),
}));

const filled: IdeaContent = {
  tagline: "Llega a tu cita médica sin perder el autobús",
  problem: {
    scene: "Carmen, 72 años, espera 40 minutos en una parada sin saber si el autobús ya pasó.",
    stat: {
      value: "1.045",
      description: "paradas de autobús urbano en Sevilla",
      source: { name: "Ayuntamiento de Sevilla, 2026", url: "https://example.com/fuente" },
    },
  },
  audience: {
    who: "Personas mayores que usan el autobús a diario.",
    need: "Saber cuándo llega, sin aplicaciones complicadas.",
    stat: null,
  },
  useCase: {
    story: "Carmen abre la web en su parada y oye cuánto falta para el 27.",
    place: "Parada de la Macarena",
    moment: "Un martes a las 9:00",
  },
  urbanContext: { description: "La Macarena es el distrito más poblado.", layers: ["distritos"] },
  solution: "Avisos de paso en tiempo real, en lenguaje claro y en voz alta.",
  steps: [
    { title: "Elige tu parada", description: "Sin registrarte." },
    { title: "Recibe el aviso", description: "Cinco minutos antes." },
    { title: "Llega a tiempo", description: "Sin esperar de pie." },
  ],
  decisions: [{ decision: "Next.js", why: "Un despliegue.", discarded: "Front y back separados." }],
  prototype: { works: ["Buscador de paradas"], simulated: ["Tiempos de llegada"] },
  impact: [{ title: "Escala", description: "Otra ciudad es otro archivo de paradas." }],
  links: { app: "/en-vivo", repository: "https://example.com/repo" },
};

describe("IdeaView", () => {
  it("presents the challenge, problem, audience and solution before the case and architecture", () => {
    render(<IdeaView name="Parada Clara" content={filled} />);

    expect(screen.getByRole("heading", { level: 1, name: "Parada Clara" })).toBeInTheDocument();
    expect(screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent)).toEqual([
      "El reto #48",
      "El problema",
      "Público destinatario",
      "Solución tecnológica",
      "Un caso concreto en Triana",
      "Arquitectura de la aplicación",
      "El agente IA: qué hay implementado",
      "Cómo funciona y decisiones técnicas",
      "Prototipo",
      "Sostenibilidad y escalabilidad",
      "Fuentes y antecedentes",
    ]);
    expect(screen.getByRole("link", { name: /Ayuntamiento de Sevilla, 2026/ })).toHaveAttribute(
      "href",
      "https://example.com/fuente",
    );
    expect(screen.getByText("Parada de la Macarena")).toBeInTheDocument();
    expect(screen.getByTestId("map")).toHaveTextContent("distritos");
    expect(
      within(screen.getByRole("list", { name: "Cómo funciona" })).getAllByRole("listitem"),
    ).toHaveLength(3);
    expect(screen.getByRole("heading", { name: "Simulado" }).nextElementSibling).toHaveTextContent(
      "Tiempos de llegada",
    );
    expect(screen.getAllByRole("link", { name: /Probar la aplicación/ })[0]).toHaveAttribute(
      "href",
      "/en-vivo",
    );
    expect(screen.getAllByRole("link", { name: /Ver el código/ })[0]).toHaveAccessibleName(
      "Ver el código (se abre en una pestaña nueva)",
    );
    expect(screen.queryByRole("note")).not.toBeInTheDocument();
  });

  it("presents a figure without a source as a hypothesis", () => {
    const content = {
      ...filled,
      problem: { ...filled.problem, stat: { ...filled.problem.stat, source: null } },
    };
    render(<IdeaView name="Parada Clara" content={content} />);

    expect(screen.getByText("Hipótesis a validar")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Fuente/ })).not.toBeInTheDocument();
  });

  it("leaves out the map when the context has no layers", () => {
    render(
      <IdeaView
        name="Parada Clara"
        content={{ ...filled, urbanContext: { ...filled.urbanContext, layers: [] } }}
      />,
    );
    expect(screen.queryByTestId("map")).not.toBeInTheDocument();
  });

  it("warns about unfilled holes when asked (development)", () => {
    render(<IdeaView name="Plantilla" content={{ ...IDEA, tagline: "[Lema]" }} showHoles />);

    expect(screen.getByRole("note")).toHaveTextContent(/Faltan \d+ huecos por rellenar/);
  });
});
