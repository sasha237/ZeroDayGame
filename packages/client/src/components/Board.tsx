import { getAdjacent, getSpace, RINGS, type Side, type SpaceId } from '@aw/engine';
import type { GameAction, GameView } from '@aw/engine';
import { useI18n } from '../i18n';

interface BoardProps {
  view: GameView;
  legalActions: GameAction[];
  selectedPiece: string | null;
  interactive: boolean;
  onSpace: (space: SpaceId) => void;
}

interface Point { x: number; y: number }

function point(radius: number, angle: number): Point {
  const radians = angle * Math.PI / 180;
  return { x: Math.sin(radians) * radius, y: -Math.cos(radians) * radius };
}

function sectorAngle(ringIndex: number, sector: number): number {
  const offset = ringIndex % 2 === 0 ? 0 : -15;
  return (sector - 1) * 30 + offset + 15;
}

function sectorPath(ringIndex: number, sector: number): string {
  const inner = 45 + ringIndex * 50;
  const outer = inner + 50;
  const offset = ringIndex % 2 === 0 ? 0 : -15;
  const start = (sector - 1) * 30 + offset;
  const end = start + 30;
  const a = point(outer, start);
  const b = point(outer, end);
  const c = point(inner, end);
  const d = point(inner, start);
  return `M ${a.x} ${a.y} A ${outer} ${outer} 0 0 1 ${b.x} ${b.y} L ${c.x} ${c.y} A ${inner} ${inner} 0 0 0 ${d.x} ${d.y} Z`;
}

function center(ringIndex: number, sector: number): Point {
  return point(70 + ringIndex * 50, sectorAngle(ringIndex, sector));
}

function markerCenter(ringIndex: number, sector: number, side: Side): Point {
  const innerBorder = 45 + ringIndex * 50;
  const outerBorder = innerBorder + 50;
  const cellCenter = (innerBorder + outerBorder) / 2;
  const radius = side === 'state'
    ? (cellCenter + innerBorder) / 2
    : (cellCenter + outerBorder) / 2;
  return point(radius, sectorAngle(ringIndex, sector));
}

function activate(event: React.KeyboardEvent, callback: () => void) {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    callback();
  }
}

export function Board({ view, legalActions, selectedPiece, interactive, onSpace }: BoardProps) {
  const { t } = useI18n();
  const allPieces = [...view.statePieces, ...view.insurgents];
  const selected = allPieces.find((piece) => piece.id === selectedPiece);
  const destinations = new Set(
    legalActions.filter((action): action is Extract<GameAction, { type: 'move' }> =>
      action.type === 'move' && action.pieceId === selectedPiece,
    ).map((action) => action.to),
  );
  const setupSpaces = new Set(
    legalActions.filter((action) => action.type === 'place').map((action) => action.to),
  );

  const spaceGroup = (
    id: SpaceId,
    path: string,
    label: string,
    cellCenter: Point,
    stateCenter: Point,
    insurgentCenter: Point,
  ) => {
    const pieces = allPieces.filter((piece) => piece.position === id);
    const stateCount = pieces.filter((piece) => piece.side === 'state').length;
    const insurgentCount = pieces.filter((piece) => piece.side === 'insurgent').length;
    const selectedHere = selected?.position === id;
    const legal = destinations.has(id) || setupSpaces.has(id);
    const revealed = view.history.some((event) => event.revealed?.includes(id));
    const className = [
      'board-space',
      legal ? 'legal' : '',
      selectedHere ? 'selected' : '',
      revealed ? 'interrogated' : '',
      interactive ? 'interactive' : '',
    ].join(' ');
    return (
      <g
        key={id}
        className={className}
        role="button"
        tabIndex={interactive ? 0 : -1}
        aria-label={`${label}${pieces.length ? `, ${t('spaceOccupants', { state: stateCount, insurgent: insurgentCount })}` : `, ${t('empty')}`}`}
        onClick={() => interactive && onSpace(id)}
        onKeyDown={(event) => interactive && activate(event, () => onSpace(id))}
      >
        <title>{label}; {t('adjacent')}: {getAdjacent(id).join(', ')}</title>
        <path d={path} className="space-shape" />
        <text className="space-label" x={cellCenter.x} y={cellCenter.y + 4}>{label}</text>
        {stateCount > 0 && (
          <g className="stack state-stack" transform={`translate(${stateCenter.x} ${stateCenter.y})`}>
            <circle r="11" />
            <text y="4">S{stateCount}</text>
          </g>
        )}
        {insurgentCount > 0 && (
          <g className="stack insurgent-stack" transform={`translate(${insurgentCenter.x} ${insurgentCenter.y})`}>
            <path d="M 0 -12 L 12 9 L -12 9 Z" />
            <text y="6">{insurgentCount}</text>
          </g>
        )}
      </g>
    );
  };

  return (
    <svg className="board" viewBox="-280 -280 560 560" role="group" aria-label={t('boardAria')}>
      <defs>
        <radialGradient id="capital-glow">
          <stop offset="0%" stopColor="#164e63" />
          <stop offset="100%" stopColor="#07121c" />
        </radialGradient>
      </defs>
      <circle className="board-halo" r="253" />
      {RINGS.map((ring, ringIndex) =>
        Array.from({ length: 12 }, (_, index) => {
          const sector = index + 1;
          const id = `${ring}${sector}` as SpaceId;
          return spaceGroup(
            id,
            sectorPath(ringIndex, sector),
            id,
            center(ringIndex, sector),
            markerCenter(ringIndex, sector, 'state'),
            markerCenter(ringIndex, sector, 'insurgent'),
          );
        }),
      )}
      {spaceGroup('Capital', 'M 0 -45 A 45 45 0 1 1 -0.01 -45 Z', t('capital'), { x: 0, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 0 })}
      <text className="board-caption" x="0" y="275">{t('boardCaption')}</text>
    </svg>
  );
}

export function describeSpace(id: SpaceId): string {
  const space = getSpace(id);
  return `${id} (${space.adjacent.length} adjacent spaces)`;
}
