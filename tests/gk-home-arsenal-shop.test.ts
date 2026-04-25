// ============================================================
// GK — HOME ARSENAL SHOP — tests/gk-home-arsenal-shop.test.ts
// Source: src/pages/home.arsenal-shop.ts
// Feature: F-10 Power-Up Shop (Session 268)
// ============================================================

import { describe, it, expect, vi, beforeEach } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

const mockGetModifierCatalog = vi.hoisted(() => vi.fn());
const mockRenderShop         = vi.hoisted(() => vi.fn());

vi.mock("../src/modifiers-catalog.ts", () => ({
  getModifierCatalog: mockGetModifierCatalog,
}));

vi.mock("../src/pages/home.arsenal-shop-render.ts", () => ({
  renderShop: mockRenderShop,
}));

vi.mock("../src/pages/home.arsenal-shop-types.ts", () => ({}));

import { loadShopScreen, cleanupShopScreen } from "../src/pages/home.arsenal-shop.ts";

function makeContainer(): HTMLDivElement {
  return document.createElement("div");
}

function makeEffect(id = "e1") {
  return { id, name: "E", description: "d", category: "point", timing: "in_debate", tier_gate: "common", mod_cost: 100, product_type: "modifier" };
}

function setTokenBalanceEl(value: number): void {
  let el = document.querySelector("[data-token-balance]");
  if (!el) {
    el = document.createElement("span");
    el.setAttribute("data-token-balance", "");
    document.body.appendChild(el);
  }
  el.textContent = String(value);
}

beforeEach(() => {
  mockGetModifierCatalog.mockReset();
  mockRenderShop.mockReset();
  cleanupShopScreen();
  document.querySelectorAll("[data-token-balance]").forEach(el => el.remove());
});

describe("TC1 — loadShopScreen shows loading indicator before catalog resolves", () => {
  it("sets container innerHTML before async catalog resolves", async () => {
    let res: (v: unknown[]) => void;
    mockGetModifierCatalog.mockReturnValue(new Promise(r => { res = r; }));
    const container = makeContainer();
    const p = loadShopScreen(container);
    expect(container.innerHTML).toContain("Loading");
    res!([]);
    await p;
  });
});

describe("TC2 — loadShopScreen fetches catalog via getModifierCatalog", () => {
  it("calls getModifierCatalog exactly once", async () => {
    mockGetModifierCatalog.mockResolvedValue([]);
    await loadShopScreen(makeContainer());
    expect(mockGetModifierCatalog).toHaveBeenCalledTimes(1);
  });
});

describe("TC3 — loadShopScreen calls renderShop on catalog success", () => {
  it("calls renderShop once after catalog resolves", async () => {
    mockGetModifierCatalog.mockResolvedValue([makeEffect()]);
    await loadShopScreen(makeContainer());
    expect(mockRenderShop).toHaveBeenCalledTimes(1);
  });
});

describe("TC4 — loadShopScreen shows error state when catalog fetch throws", () => {
  it("sets container to error HTML when getModifierCatalog rejects", async () => {
    mockGetModifierCatalog.mockRejectedValue(new Error("network fail"));
    const container = makeContainer();
    await loadShopScreen(container);
    expect(container.innerHTML).toContain("Failed");
  });
});

describe("TC5 — loadShopScreen does not call renderShop on catalog failure", () => {
  it("skips renderShop when catalog fetch throws", async () => {
    mockGetModifierCatalog.mockRejectedValue(new Error("fail"));
    await loadShopScreen(makeContainer());
    expect(mockRenderShop).not.toHaveBeenCalled();
  });
});

describe("TC6 — loadShopScreen stores fetched catalog in state", () => {
  it("state.catalog passed to renderShop matches getModifierCatalog return value", async () => {
    const catalog = [makeEffect("e1"), makeEffect("e2")];
    mockGetModifierCatalog.mockResolvedValue(catalog);
    await loadShopScreen(makeContainer());
    const stateArg = mockRenderShop.mock.calls[0][1];
    expect(stateArg.catalog).toEqual(catalog);
  });
});

describe("TC7 — loadShopScreen reads token balance from [data-token-balance] DOM element", () => {
  it("state.tokenBalance equals the numeric text of [data-token-balance]", async () => {
    setTokenBalanceEl(750);
    mockGetModifierCatalog.mockResolvedValue([]);
    await loadShopScreen(makeContainer());
    const stateArg = mockRenderShop.mock.calls[0][1];
    expect(stateArg.tokenBalance).toBe(750);
  });
});

describe("TC8 — loadShopScreen passes container as first argument to renderShop", () => {
  it("first arg to renderShop is the same HTMLElement passed to loadShopScreen", async () => {
    mockGetModifierCatalog.mockResolvedValue([]);
    const container = makeContainer();
    await loadShopScreen(container);
    expect(mockRenderShop.mock.calls[0][0]).toBe(container);
  });
});

describe("TC9 — loadShopScreen clears prior sheet cleanup on re-entry", () => {
  it("calls previously registered sheet cleanup when loadShopScreen is invoked again", async () => {
    const sheetFn = vi.fn();
    mockGetModifierCatalog.mockResolvedValue([]);
    mockRenderShop.mockImplementationOnce((_c: unknown, _s: unknown, _r: unknown, onSheet: (fn: () => void) => void) => { onSheet(sheetFn); });
    await loadShopScreen(makeContainer());
    expect(sheetFn).not.toHaveBeenCalled();

    mockGetModifierCatalog.mockResolvedValue([]);
    mockRenderShop.mockImplementationOnce(vi.fn());
    await loadShopScreen(makeContainer());
    expect(sheetFn).toHaveBeenCalledTimes(1);
  });
});

describe("TC10 — cleanupShopScreen resets productType to powerup", () => {
  it("state.productType is powerup after cleanupShopScreen", async () => {
    mockGetModifierCatalog.mockResolvedValue([]);
    await loadShopScreen(makeContainer());
    cleanupShopScreen();
    mockRenderShop.mockReset();
    mockGetModifierCatalog.mockResolvedValue([]);
    await loadShopScreen(makeContainer());
    expect(mockRenderShop.mock.calls[0][1].productType).toBe("powerup");
  });
});

describe("TC11 — cleanupShopScreen resets all filter fields to defaults", () => {
  it("all filter state fields are at defaults after cleanupShopScreen", async () => {
    mockGetModifierCatalog.mockResolvedValue([]);
    await loadShopScreen(makeContainer());
    cleanupShopScreen();
    mockRenderShop.mockReset();
    mockGetModifierCatalog.mockResolvedValue([]);
    await loadShopScreen(makeContainer());
    const s = mockRenderShop.mock.calls[0][1];
    expect(s.categoryFilter).toBe("all");
    expect(s.rarityFilter).toBe("all");
    expect(s.timingFilter).toBe("all");
    expect(s.affordableOnly).toBe(false);
  });
});

describe("TC12 — cleanupShopScreen calls registered sheet cleanup function", () => {
  it("invokes the sheet cleanup exactly once when cleanupShopScreen is called", async () => {
    const sheetFn = vi.fn();
    mockGetModifierCatalog.mockResolvedValue([]);
    mockRenderShop.mockImplementation((_c: unknown, _s: unknown, _r: unknown, onSheet: (fn: () => void) => void) => { onSheet(sheetFn); });
    await loadShopScreen(makeContainer());
    cleanupShopScreen();
    expect(sheetFn).toHaveBeenCalledTimes(1);
  });
});

describe("TC13 — tokenBalance defaults to 0 when [data-token-balance] absent", () => {
  it("state.tokenBalance is 0 when no [data-token-balance] element exists", async () => {
    mockGetModifierCatalog.mockResolvedValue([]);
    await loadShopScreen(makeContainer());
    expect(mockRenderShop.mock.calls[0][1].tokenBalance).toBe(0);
  });
});

describe("ARCH — src/pages/home.arsenal-shop.ts only imports from allowed modules", () => {
  it("has no imports outside the allowed list", () => {
    const allowed = [
      "../modifiers-catalog.ts",
      "./home.arsenal-shop-render.ts",
      "./home.arsenal-shop-types.ts",
    ];
    const source = readFileSync(
      resolve(__dirname, "../src/pages/home.arsenal-shop.ts"),
      "utf-8"
    );
    const paths = source.split("\n")
      .filter((l: string) => l.trimStart().startsWith("import "))
      .map((l: string) => l.match(/from\s+["']([^"']+)["']/)?.[1])
      .filter(Boolean) as string[];
    for (const path of paths) {
      expect(allowed, "Unexpected import: " + path).toContain(path);
    }
  });
});
