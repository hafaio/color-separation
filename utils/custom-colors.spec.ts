import { afterEach, beforeEach, expect, test } from "bun:test";
import { hexToRgb } from "./color";
import { loadCustoms, saveCustoms } from "./custom-colors";

interface FakeStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
  clear(): void;
  readonly length: number;
  key(index: number): string | null;
}

function makeFakeStorage(): FakeStorage {
  const store = new Map<string, string>();
  return {
    getItem: (k) => store.get(k) ?? null,
    setItem: (k, v) => {
      store.set(k, v);
    },
    removeItem: (k) => {
      store.delete(k);
    },
    clear: () => {
      store.clear();
    },
    get length() {
      return store.size;
    },
    key: (i) => [...store.keys()][i] ?? null,
  };
}

beforeEach(() => {
  (globalThis as { localStorage?: FakeStorage }).localStorage =
    makeFakeStorage();
});

afterEach(() => {
  (globalThis as { localStorage?: FakeStorage }).localStorage = undefined;
});

test("loadCustoms returns empty when nothing is stored", () => {
  expect(loadCustoms()).toEqual([]);
});

test("loadCustoms round-trips through saveCustoms", () => {
  const colors = [
    { rgb: hexToRgb("#ff0080"), name: "hot pink" },
    { rgb: hexToRgb("#00ff80"), name: "mint" },
  ];
  saveCustoms(colors);
  expect(loadCustoms()).toEqual(colors);
});

test("saveCustoms with empty list clears stored colors", () => {
  saveCustoms([{ rgb: hexToRgb("#abcdef"), name: "first" }]);
  saveCustoms([]);
  expect(loadCustoms()).toEqual([]);
});

test("loadCustoms returns empty for non-JSON payload", () => {
  localStorage.setItem("customColors:v1", "not json {");
  expect(loadCustoms()).toEqual([]);
});

test("loadCustoms returns empty when version is wrong", () => {
  localStorage.setItem(
    "customColors:v1",
    JSON.stringify({ version: 2, colors: [] }),
  );
  expect(loadCustoms()).toEqual([]);
});

test("loadCustoms returns empty when envelope shape is wrong", () => {
  localStorage.setItem("customColors:v1", JSON.stringify({ version: 1 }));
  expect(loadCustoms()).toEqual([]);

  localStorage.setItem(
    "customColors:v1",
    JSON.stringify({ version: 1, colors: "nope" }),
  );
  expect(loadCustoms()).toEqual([]);
});

test("loadCustoms filters invalid color entries", () => {
  localStorage.setItem(
    "customColors:v1",
    JSON.stringify({
      version: 1,
      colors: [
        { rgb: 0x123456, name: "valid" },
        { rgb: "not a number", name: "string rgb" },
        { rgb: 0x789abc },
        null,
        { name: "missing rgb" },
      ],
    }),
  );
  expect(loadCustoms()).toEqual([{ rgb: 0x123456, name: "valid" }]);
});
