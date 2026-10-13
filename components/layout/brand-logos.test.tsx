import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { BrandLogos } from "./brand-logos";

describe("BrandLogos", () => {
  it("shows both logos with their name as alternative text, as one named group", () => {
    render(<BrandLogos />);

    const group = screen.getByRole("group", {
      name: "Cátedras Telefónica y Universidad de Sevilla",
    });
    expect(group).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Cátedras Telefónica" })).toHaveAttribute(
      "src",
      expect.stringContaining("catedras-telefonica.png"),
    );
    expect(screen.getByRole("img", { name: "Universidad de Sevilla" })).toHaveAttribute(
      "src",
      expect.stringContaining("universidad-de-sevilla.png"),
    );
  });

  it("sits on a white background in every theme, so the dark text of the logo never gets lost", () => {
    render(<BrandLogos className="hidden md:flex" />);

    const group = screen.getByRole("group");
    expect(group).toHaveClass("bg-white", "hidden", "md:flex");
  });

  it("has a bigger size for the front page", () => {
    render(<BrandLogos size="md" />);

    expect(screen.getByRole("img", { name: "Universidad de Sevilla" })).toHaveClass("h-11");
  });
});
