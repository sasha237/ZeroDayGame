export type Route = { kind: 'home' } | { kind: 'observe'; token: string } | { kind: 'reset'; token: string } | { kind: 'game'; id: string };

export function parseHash(hash: string): Route {
  const parts = hash.replace(/^#\/?/, '').split('/');
  if (parts[0] === 'observe' && parts[1]) return { kind: 'observe', token: parts[1] };
  if (parts[0] === 'reset' && parts[1]) return { kind: 'reset', token: parts[1] };
  if (parts[0] === 'game' && parts[1]) return { kind: 'game', id: parts[1] };
  return { kind: 'home' };
}
