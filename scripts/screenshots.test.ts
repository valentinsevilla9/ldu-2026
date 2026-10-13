import path from "node:path";
import { describe, expect, it } from "vitest";
import { browserCandidates, findBrowser, markdownSnippet } from "./screenshots";

describe("screenshots", () => {
  it("prefers CHROME_PATH, then Chrome and Edge in the usual Windows folders", () => {
    expect(browserCandidates({ CHROME_PATH: "/opt/chrome" }, "win32")).toEqual(["/opt/chrome"]);

    const candidates = browserCandidates(
      { PROGRAMFILES: "C:\\PF", LOCALAPPDATA: "C:\\L" },
      "win32",
    );
    expect(candidates[0]).toBe(
      path.join("C:\\PF", "Google", "Chrome", "Application", "chrome.exe"),
    );
    expect(candidates).toContain(
      path.join("C:\\PF", "Microsoft", "Edge", "Application", "msedge.exe"),
    );
  });

  it("picks the first browser that exists", () => {
    expect(findBrowser(["/a", "/b", "/c"], (file) => file !== "/a")).toBe("/b");
    expect(findBrowser(["/a"], () => false)).toBeNull();
  });

  it("writes a README block with alt text for every capture", () => {
    const snippet = markdownSnippet([{ name: "reglas", path: "/reglas", title: "Reglas" }]);
    expect(snippet).toContain("![Pantalla «Reglas» en escritorio](docs/screenshots/reglas.png)");
    expect(snippet).toContain('alt="Pantalla «Reglas» en el móvil"');
  });
});
