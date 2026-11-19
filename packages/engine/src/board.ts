export const RINGS = ['B', 'C', 'D', 'E'] as const;
export type Ring = (typeof RINGS)[number];
export type SpaceId = 'Capital' | `${Ring}${number}`;

export interface BoardSpace {
  id: SpaceId;
  ring: Ring | 'Capital';
  sector: number | null;
  adjacent: SpaceId[];
}

export function spaceId(ring: Ring, sector: number): SpaceId {
  if (!Number.isInteger(sector) || sector < 1 || sector > 12) {
    throw new Error(`Invalid sector ${sector}`);
  }
  return `${ring}${sector}`;
}

export function parseSpace(id: SpaceId): { ring: Ring | 'Capital'; sector: number | null } {
  if (id === 'Capital') return { ring: 'Capital', sector: null };
  const ring = id.charAt(0) as Ring;
  const sector = Number(id.slice(1));
  if (!RINGS.includes(ring) || !Number.isInteger(sector) || sector < 1 || sector > 12) {
    throw new Error(`Invalid space ${id}`);
  }
  return { ring, sector };
}

export function isSpaceId(value: string): value is SpaceId {
  if (value === 'Capital') return true;
  try {
    parseSpace(value as SpaceId);
    return true;
  } catch {
    return false;
  }
}

function wrapped(sector: number): number {
  return ((sector - 1 + 12) % 12) + 1;
}

function buildSpace(ring: Ring, sector: number): BoardSpace {
  const ringIndex = RINGS.indexOf(ring);
  const adjacent = new Set<SpaceId>([
    spaceId(ring, wrapped(sector - 1)),
    spaceId(ring, wrapped(sector + 1)),
  ]);

  const staggeredSector = wrapped(sector + (ringIndex % 2 === 0 ? 1 : -1));

  if (ringIndex < RINGS.length - 1) {
    const outer = RINGS[ringIndex + 1];
    adjacent.add(spaceId(outer, sector));
    adjacent.add(spaceId(outer, staggeredSector));
  }

  if (ringIndex > 0) {
    const inner = RINGS[ringIndex - 1];
    adjacent.add(spaceId(inner, sector));
    adjacent.add(spaceId(inner, staggeredSector));
  } else {
    adjacent.add('Capital');
  }

  return { id: spaceId(ring, sector), ring, sector, adjacent: [...adjacent].sort() };
}

export const BOARD_SPACES: readonly BoardSpace[] = [
  {
    id: 'Capital',
    ring: 'Capital',
    sector: null,
    adjacent: Array.from({ length: 12 }, (_, index) => spaceId('B', index + 1)),
  },
  ...RINGS.flatMap((ring) =>
    Array.from({ length: 12 }, (_, index) => buildSpace(ring, index + 1)),
  ),
];

export const SPACE_IDS: readonly SpaceId[] = BOARD_SPACES.map((space) => space.id);
const SPACE_MAP = new Map<SpaceId, BoardSpace>(BOARD_SPACES.map((space) => [space.id, space]));

export function getSpace(id: SpaceId): BoardSpace {
  const space = SPACE_MAP.get(id);
  if (!space) throw new Error(`Unknown space ${id}`);
  return space;
}

export function areAdjacent(from: SpaceId, to: SpaceId): boolean {
  return getSpace(from).adjacent.includes(to);
}

export function getAdjacent(id: SpaceId): readonly SpaceId[] {
  return getSpace(id).adjacent;
}
