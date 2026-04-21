export type PlanTier = "STARTER" | "PRO" | "ENTERPRISE";

export interface PlanLimits {
  maxPlayers:    number;   // Infinity = sin límite
  maxCategories: number;
  maxCoaches:    number;
  gamification:  boolean;  // XP, misiones, recompensas
  evidence:      boolean;  // panel de evidencias
  exportExcel:   boolean;  // exportar Excel/CSV
  uniforms:      boolean;  // pedidos de uniformes
}

export const PLAN_LIMITS: Record<PlanTier, PlanLimits> = {
  STARTER: {
    maxPlayers:    30,
    maxCategories: 3,
    maxCoaches:    2,
    gamification:  false,
    evidence:      false,
    exportExcel:   false,
    uniforms:      false,
  },
  PRO: {
    maxPlayers:    Infinity,
    maxCategories: Infinity,
    maxCoaches:    Infinity,
    gamification:  true,
    evidence:      true,
    exportExcel:   true,
    uniforms:      true,
  },
  ENTERPRISE: {
    maxPlayers:    Infinity,
    maxCategories: Infinity,
    maxCoaches:    Infinity,
    gamification:  true,
    evidence:      true,
    exportExcel:   true,
    uniforms:      true,
  },
};

export const PLAN_NAMES: Record<PlanTier, string> = {
  STARTER:    "Starter",
  PRO:        "Pro",
  ENTERPRISE: "Enterprise",
};

export const PLAN_UPGRADE: Record<PlanTier, PlanTier | null> = {
  STARTER:    "PRO",
  PRO:        "ENTERPRISE",
  ENTERPRISE: null,
};

export function getLimits(plan: string): PlanLimits {
  return PLAN_LIMITS[(plan as PlanTier)] ?? PLAN_LIMITS.STARTER;
}

export function canUseFeature(plan: string, feature: keyof PlanLimits): boolean {
  const limits = getLimits(plan);
  const val = limits[feature];
  return typeof val === "boolean" ? val : (val as number) > 0;
}
