import { Env, EnvValue } from '../types';

export async function getEnvValue(
  env: Env,
  key: keyof Env
): Promise<string | undefined> {
  const value = env[key] as EnvValue;
  if (typeof value === 'string') return value;
  if (value && typeof value.get === 'function') return value.get();
  return undefined;
}
