export function mapGetDef<K, V>(map: Map<K, V>, key: K, def: (k: K) => V): V {
  const res = map.get(key);
  if (res === undefined) {
    const val = def(key);
    map.set(key, val);
    return val;
  } else {
    return res;
  }
}
