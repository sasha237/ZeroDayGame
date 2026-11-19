import { writeFile } from 'node:fs/promises';
import { markdownReport } from './report.js';
import { runBatch } from './runner.js';

function argument(name: string, fallback: string): string {
  const index = process.argv.indexOf(name);
  return index >= 0 && process.argv[index + 1] ? process.argv[index + 1] : fallback;
}

const count = Number(argument('-n', argument('--count', '100')));
const seed = Number(argument('--seed', '42'));
const maxActions = Number(argument('--max-actions', '2000'));
const output = argument('--out', 'sim-report.md');
if (!Number.isInteger(count) || count < 1 || !Number.isInteger(seed) || !Number.isInteger(maxActions) || maxActions < 1) {
  throw new Error('Usage: sim -n 100 --seed 42 --max-actions 2000 --out sim-report.md');
}
const runs = runBatch(count, seed, maxActions);
const report = markdownReport(runs);
await writeFile(output, report, 'utf8');
await writeFile(output.replace(/\.md$/, '') + '.json', JSON.stringify(runs, null, 2), 'utf8');
process.stdout.write(report);
