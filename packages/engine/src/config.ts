/**
 * Single validated config module. A missing required variable fails loudly at
 * startup rather than producing a confusing runtime error later.
 */
export interface LlmConfig {
  baseUrl: string;
  apiKey: string | undefined;
  model: string;
}

export interface AppConfig {
  llm: LlmConfig;
  mapSeed: number;
}

export class ConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConfigError";
  }
}

function readEnv(env: Record<string, string | undefined>, key: string): string | undefined {
  const value = env[key];
  return value === undefined || value.trim() === "" ? undefined : value.trim();
}

export function loadConfig(env: Record<string, string | undefined> = process.env): AppConfig {
  const baseUrl = readEnv(env, "LLM_BASE_URL");
  if (!baseUrl) {
    throw new ConfigError("LLM_BASE_URL is required. Point it at an OpenAI-compatible endpoint.");
  }
  try {
    new URL(baseUrl);
  } catch {
    throw new ConfigError(`LLM_BASE_URL is not a valid URL: "${baseUrl}"`);
  }

  const rawSeed = readEnv(env, "VITE_MAP_SEED") ?? "1";
  const mapSeed = Number(rawSeed);
  if (!Number.isInteger(mapSeed)) {
    throw new ConfigError(`VITE_MAP_SEED must be an integer, got "${rawSeed}"`);
  }

  return {
    llm: {
      baseUrl,
      apiKey: readEnv(env, "LLM_API_KEY"),
      model: readEnv(env, "LLM_MODEL") ?? "gpt-4o-mini",
    },
    mapSeed,
  };
}
