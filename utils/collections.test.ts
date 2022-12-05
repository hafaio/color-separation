import { mapGetDef } from "./collections";

test("mapDefGet()", () => {
  const map = new Map<number, string[]>();
  expect(mapGetDef(map, 3, (k) => [k.toString()])).toEqual(["3"]);
  expect(map.get(3)).toEqual(["3"]);
  expect(mapGetDef(map, 3, () => [])).toEqual(["3"]);
});
