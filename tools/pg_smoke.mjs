const base = 'http://127.0.0.1:8090';
const suffix = Date.now();
const checks = [];
function assert(condition, label) {
  if (!condition) throw new Error(`Failed: ${label}`);
  checks.push(label);
}
async function request(path, { token, method = 'GET', body } = {}) {
  const response = await fetch(base + path, {
    method,
    headers: { ...(token ? { authorization: `Bearer ${token}` } : {}), ...(body ? { 'content-type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await response.text();
  let data;
  try { data = JSON.parse(text); } catch { data = text; }
  return { status: response.status, data };
}
async function register(name) {
  const result = await request('/auth/register', { method: 'POST', body: { email: `${name}-${suffix}@example.com`, password: 'correct-horse' } });
  assert(result.status === 201, `register ${name}`);
  return result.data;
}
const health = await request('/healthz');
assert(health.status === 200, 'Postgres health check');
const state = await register('pg-state');
const insurgent = await register('pg-insurgent');
const created = await request('/games', { token: state.token, method: 'POST', body: { side: 'state' } });
assert(created.status === 201 && created.data.id, 'create persistent game');
const joined = await request('/games/join', { token: insurgent.token, method: 'POST', body: { code: created.data.inviteCode } });
assert(joined.status === 200, 'join persistent game');
for (const [index, to] of ['E1', 'E3', 'E5', 'E7', 'E9'].entries()) {
  const placed = await request(`/games/${created.data.id}/action`, { token: insurgent.token, method: 'POST', body: { action: { type: 'place', pieceId: `I${index + 1}`, to } } });
  assert(placed.status === 200, `persist placement ${index + 1}`);
}
const finished = await request(`/games/${created.data.id}/action`, { token: insurgent.token, method: 'POST', body: { action: { type: 'finishSetup' } } });
assert(finished.status === 200, 'persist setup completion');
const stateView = await request(`/games/${created.data.id}`, { token: state.token });
assert(stateView.status === 200 && stateView.data.view.insurgents.length === 0, 'State projection hides Insurgents');
const link = await request(`/games/${created.data.id}/observer-link`, { token: state.token, method: 'POST' });
assert(link.status === 200, 'create facilitator token');
const observer = await request(`/observe/${link.data.token}`);
assert(observer.status === 200 && observer.data.view.insurgents.length === 5, 'facilitator full projection');
const replay = await request(`/observe/${link.data.token}/replay?seq=1`);
assert(replay.status === 200 && replay.data.view.insurgents.length === 1, 'persistent replay');
const csv = await request(`/observe/${link.data.token}/export.csv`);
assert(csv.status === 200 && csv.data.includes('E1'), 'persistent CSV export');
console.log(`Postgres smoke passed: ${checks.length} checks`);
