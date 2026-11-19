export type Random = () => number;

export function mulberry32(seed: number): Random {
  let value = seed >>> 0;
  return () => {
    value = (value + 0x6d2b79f5) >>> 0;
    let result = Math.imul(value ^ (value >>> 15), 1 | value);
    result ^= result + Math.imul(result ^ (result >>> 7), 61 | result);
    return ((result ^ (result >>> 14)) >>> 0) / 4294967296;
  };
}

export function choose<T>(items: readonly T[], random: Random): T {
  if (!items.length) throw new Error('Cannot choose from an empty list');
  return items[Math.floor(random() * items.length)];
}
