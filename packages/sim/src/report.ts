import type { GameRun } from './runner.js';

export function markdownReport(runs: GameRun[]): string {
  const state = runs.filter((run) => run.winner === 'state').length;
  const insurgent = runs.filter((run) => run.winner === 'insurgent').length;
  const capped = runs.filter((run) => run.capped).length;
  const decisive = state + insurgent;
  const average = (values: number[]) => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
  const percent = (value: number, total = runs.length) => total ? (100 * value / total).toFixed(1) : '0.0';
  const seeds = runs.length ? `${runs[0].seed}–${runs.at(-1)!.seed}` : '—';
  return [
    '# ZERO DAY simulation report',
    '',
    `- Sessions: ${runs.length}`,
    `- Seed range: ${seeds}`,
    `- Decisive sessions: ${decisive} (${percent(decisive)}%)`,
    '',
    '| Outcome | Sessions | Proportion of all sessions |',
    '| --- | ---: | ---: |',
    `| Corporation win / Hackers loss | ${state} | ${percent(state)}% |`,
    `| Hackers win / Corporation loss | ${insurgent} | ${percent(insurgent)}% |`,
    '| Draw | 0 | 0.0% |',
    `| Unfinished at diagnostic cap | ${capped} | ${percent(capped)}% |`,
    '',
    `- Corporation win rate among decisive sessions: ${percent(state, decisive)}%`,
    `- Hackers win rate among decisive sessions: ${percent(insurgent, decisive)}%`,
    `- Average actions: ${average(runs.map((run) => run.actions)).toFixed(1)}`,
    `- Average turns: ${average(runs.map((run) => run.turns)).toFixed(1)}`,
    '',
    'Draws are not possible under the current rules. The diagnostic cap is only a simulation safeguard, not an in-game draw or turn limit.',
    'These results describe the included heuristic bots, not a prediction of human win rates or game balance.',
    '',
  ].join('\n');
}
