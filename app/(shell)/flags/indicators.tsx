import {
  FLAG_ENVIRONMENT_LABELS,
  exposure,
  type FeatureFlag,
  type FlagEnvironment,
} from "@/lib/data/flag-types";
import { StatusBadge } from "@/platform/ui/status-badge";

export function FlagStateTag({ flag }: { flag: FeatureFlag }) {
  return (
    <StatusBadge tone={flag.enabled ? "success" : "neutral"}>
      {flag.enabled ? "On" : "Off"}
    </StatusBadge>
  );
}

/** Production is the one that can page someone, so it is the only emphasised one. */
export function EnvironmentTag({ environment }: { environment: FlagEnvironment }) {
  return (
    <StatusBadge tone={environment === "production" ? "warning" : "neutral"} dot={false}>
      {FLAG_ENVIRONMENT_LABELS[environment]}
    </StatusBadge>
  );
}

export function ExposureText({ flag }: { flag: FeatureFlag }) {
  return <span className={flag.enabled ? "text-ink" : "text-ink-muted"}>{exposure(flag)}</span>;
}
