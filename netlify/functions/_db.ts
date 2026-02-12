import { neon } from '@neondatabase/serverless';

function mustGetEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing environment variable: ${name}`);
  return v;
}

export const sql = neon(mustGetEnv('DATABASE_URL'));
