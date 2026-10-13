import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SevillaMap } from "./sevilla-map";

// Leaflet needs a real browser; the fake map lists which layers it received.
vi.mock("next/dynamic", () => ({
  default: () =>
    function FakeMap({ layers, credits = [] }: { layers: { id: string }[]; credits?: string[] }) {
      return (
        <div data-testid="map" data-credits={credits.join("|")}>
          {layers.map((layer) => layer.id).join(",")}
        </div>
      );
    },
}));

const collection = (layer: string, names: string[]) => ({
  type: "FeatureCollection",
  metadata: {
    layer,
    title: layer,
    source: "Ayto",
    url: "https://x",
    // OpenStreetMap layers were downloaded later than the Ayuntamiento ones.
    downloadedAt: layer === "reciclaje" ? "2026-10-11" : "2026-10-05",
  },
  features: names.map((nombre) => ({
    type: "Feature",
    geometry: { type: "Point", coordinates: [-5.98, 37.39] },
    properties: { nombre, detalle: `Detalle de ${nombre}` },
  })),
});

function serveLayers(failing: string[] = []) {
  const fetchMock = vi.fn(async (url: string) => {
    const layer = url.split("/").pop()!.replace(".geojson", "");
    if (failing.includes(layer)) return { ok: false, status: 500, json: async () => ({}) };
    return { ok: true, status: 200, json: async () => collection(layer, [`Lugar de ${layer}`]) };
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

afterEach(() => vi.unstubAllGlobals());

describe("SevillaMap", () => {
  it("loads the initial layers and adds another when its box is ticked", async () => {
    const fetchMock = serveLayers();
    render(<SevillaMap initial={["sevici"]} />);

    expect(await screen.findByTestId("map")).toHaveTextContent("sevici");
    await userEvent.click(screen.getByRole("checkbox", { name: /Bibliotecas municipales/ }));

    await waitFor(() => expect(screen.getByTestId("map")).toHaveTextContent("sevici,bibliotecas"));
    expect(fetchMock).toHaveBeenCalledWith("/data/sevilla/bibliotecas.geojson", expect.anything());
    expect(screen.getByRole("checkbox", { name: /Estaciones de Sevici \(1\)/ })).toBeChecked();
  });

  it("offers the same places as a table and credits the source", async () => {
    serveLayers();
    render(<SevillaMap initial={["bibliotecas"]} showControls={false} />);

    await userEvent.click(await screen.findByText("Ver los datos del mapa en una tabla"));
    expect(screen.getByRole("cell", { name: "Lugar de bibliotecas" })).toBeInTheDocument();
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
    expect(screen.getByText(/descargados el 5 de octubre de 2026/)).toBeInTheDocument();
  });

  it("credits each origin once, with its link, and gives the range of download dates", async () => {
    serveLayers();
    render(<SevillaMap initial={["bibliotecas", "centros-civicos", "reciclaje"]} />);

    await waitFor(() =>
      expect(
        screen.getByText(/descargados entre el 5 de octubre de 2026 y el 11 de octubre de 2026/),
      ).toBeVisible(),
    );
    const footer = screen.getByText(/^Datos:/);
    expect(
      within(footer).getByRole("link", { name: /colaboradores de OpenStreetMap/ }),
    ).toHaveAttribute("href", "https://www.openstreetmap.org/copyright");
    expect(within(footer).getAllByRole("link", { name: /Ayuntamiento de Sevilla/ })).toHaveLength(
      1,
    );
  });

  it("passes the map only the credits the base map does not already give", async () => {
    serveLayers();
    render(<SevillaMap initial={["reciclaje", "bibliotecas"]} />);

    await waitFor(() =>
      expect(screen.getByTestId("map")).toHaveAttribute("data-credits", "Ayuntamiento de Sevilla"),
    );
  });

  it("explains a layer that failed and lets the user retry", async () => {
    serveLayers(["tussam-paradas"]);
    render(<SevillaMap initial={["tussam-paradas"]} />);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "No se han podido cargar: Paradas de autobús (TUSSAM).",
    );
    expect(screen.getByRole("button", { name: /Reintentar/ })).toBeInTheDocument();
  });
});
