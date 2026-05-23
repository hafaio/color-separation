import { expect, test } from "bun:test";
import { LruMap } from "./lru";

test("LruMap stores and retrieves", () => {
  const lru = new LruMap<string, number>(2);
  lru.set("a", 1);
  expect(lru.get("a")).toBe(1);
  expect(lru.get("missing")).toBeUndefined();
});

test("LruMap evicts least-recently-used past capacity", () => {
  const lru = new LruMap<string, number>(2);
  lru.set("a", 1);
  lru.set("b", 2);
  lru.set("c", 3); // evicts "a"
  expect(lru.get("a")).toBeUndefined();
  expect(lru.get("b")).toBe(2);
  expect(lru.get("c")).toBe(3);
});

test("LruMap get() refreshes recency", () => {
  const lru = new LruMap<string, number>(2);
  lru.set("a", 1);
  lru.set("b", 2);
  lru.get("a"); // "a" now most-recently-used, so "b" is next to go
  lru.set("c", 3); // evicts "b"
  expect(lru.get("a")).toBe(1);
  expect(lru.get("b")).toBeUndefined();
  expect(lru.get("c")).toBe(3);
});

test("LruMap set() refreshes recency and overwrites", () => {
  const lru = new LruMap<string, number>(2);
  lru.set("a", 1);
  lru.set("b", 2);
  lru.set("a", 10); // overwrite + refresh "a"
  lru.set("c", 3); // evicts "b"
  expect(lru.get("a")).toBe(10);
  expect(lru.get("b")).toBeUndefined();
  expect(lru.get("c")).toBe(3);
});

test("LruMap clear() empties", () => {
  const lru = new LruMap<string, number>(2);
  lru.set("a", 1);
  lru.clear();
  expect(lru.get("a")).toBeUndefined();
});
