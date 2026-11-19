import type { ViewEvent } from '@aw/engine';

function quote(value: unknown): string {
  return `"${String(value ?? '').replaceAll('"', '""')}"`;
}

export function eventsCsv(events: ViewEvent[]): string {
  const rows = [
    ['seq', 'turn', 'actor', 'action', 'from', 'to', 'at', 'killed', 'revealed'],
    ...events.map((event) => [
      event.seq,
      event.turn,
      event.actor,
      event.type,
      event.from ?? '',
      event.to ?? '',
      event.at ?? '',
      event.killed ?? '',
      event.revealed?.join(' ') ?? '',
    ]),
  ];
  return `${rows.map((row) => row.map(quote).join(',')).join('\r\n')}\r\n`;
}
