export interface Config {
  port: number;
  databaseUrl: string | null;
  repo: 'memory' | 'pg';
  corsOrigins: string[];
  tokenTtlHours: number;
  trustProxy: boolean;
  emailApiUrl: string | null;
  emailApiKey: string | null;
  emailFrom: string;
  clientUrl: string;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const databaseUrl = env.DATABASE_URL?.trim() || null;
  return {
    port: env.PORT === undefined ? 8080 : Number(env.PORT),
    databaseUrl,
    repo: env.REPO === 'memory' ? 'memory' : env.REPO === 'pg' || databaseUrl ? 'pg' : 'memory',
    corsOrigins: (env.CORS_ORIGIN?.split(',').map((value) => value.trim()).filter(Boolean)) ?? [
      'http://127.0.0.1:5173', 'http://127.0.0.1:4173',
    ],
    tokenTtlHours: env.TOKEN_TTL_HOURS === undefined ? 720 : Number(env.TOKEN_TTL_HOURS),
    trustProxy: env.TRUST_PROXY === 'true' || env.TRUST_PROXY === '1',
    emailApiUrl: env.EMAIL_API_URL?.trim() || null,
    emailApiKey: env.EMAIL_API_KEY?.trim() || null,
    emailFrom: env.EMAIL_FROM?.trim() || 'no-reply@zero-day.local',
    clientUrl: (env.CLIENT_URL?.trim() || 'http://127.0.0.1:5173').replace(/\/$/, ''),
  };
}

export function validateConfig(config: Config): void {
  const problems: string[] = [];
  if (!Number.isInteger(config.port) || config.port < 1 || config.port > 65535) problems.push('PORT must be in 1..65535');
  if (config.repo === 'pg' && !config.databaseUrl) problems.push('REPO=pg requires DATABASE_URL');
  if (config.databaseUrl && !/^postgres(ql)?:\/\//.test(config.databaseUrl)) problems.push('DATABASE_URL must be a PostgreSQL URL');
  if (!(config.tokenTtlHours > 0)) problems.push('TOKEN_TTL_HOURS must be positive');
  if (problems.length) throw new Error(problems.join('; '));
}
