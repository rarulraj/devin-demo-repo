export type FlagEnvironment = "production" | "staging";

export type FlagChangeNote = {
  author: string;
  at: string;
  /** What changed, e.g. "Rollout 25% → 50%". */
  change: string;
  text: string;
};

export type FeatureFlag = {
  key: string;
  name: string;
  description: string;
  environment: FlagEnvironment;
  enabled: boolean;
  /** Share of eligible traffic, 0-100. Only meaningful while the flag is on. */
  rollout: number;
  owner: string;
  updatedAt: string;
  history: FlagChangeNote[];
};

export const FLAG_ENVIRONMENT_LABELS: Record<FlagEnvironment, string> = {
  production: "Production",
  staging: "Staging",
};

export const MIN_ROLLOUT = 0;
export const MAX_ROLLOUT = 100;

export function isProduction(flag: FeatureFlag): boolean {
  return flag.environment === "production";
}

/** A disabled flag serves nobody regardless of its stored rollout. */
export function exposure(flag: FeatureFlag): string {
  if (!flag.enabled) return "Off";
  return flag.rollout === MAX_ROLLOUT ? "All traffic" : `${flag.rollout}% of traffic`;
}

export function isPartialRollout(flag: FeatureFlag): boolean {
  return flag.enabled && flag.rollout > MIN_ROLLOUT && flag.rollout < MAX_ROLLOUT;
}
