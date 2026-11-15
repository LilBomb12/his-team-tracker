import { InteractionOutcome, ReasonCategory } from "@/lib/types";

export interface ScoreInput {
  outcome: InteractionOutcome;
  reason_category: ReasonCategory | null;
  explicit_refusal: boolean;
  had_laptop: boolean;
  had_internet: boolean;
  explanation_provided: boolean;
  followup_scheduled: boolean;
  reason_detail?: string | null;
}

export function calculatePoints(input: ScoreInput): number {
  // Genuine clinical workload, technical, training, reasonable postponement = 0
  if (input.reason_category === "clinical_workload") return 0;
  if (input.reason_category === "technical") return 0;
  if (input.reason_category === "training") return 0;
  if (input.outcome === "registered") return 0;
  if (input.outcome === "busy") return 0; // genuine busy handled as clinical-ish
  if (input.outcome === "technical_problem") return 0;
  if (input.outcome === "needs_training") return 0;
  if (input.outcome === "postponed" && input.reason_category === "postponement") return 0;
  if (input.outcome === "not_available" && input.reason_detail?.toLowerCase().includes("emergency")) return 0;

  // explicit verified refusal
  if (input.explicit_refusal || input.outcome === "refused") return 3;

  // avoiding scheduled follow-up without explanation
  if (input.outcome === "avoided") return 2;

  // started not completed without documented reason
  if (input.outcome === "started_not_completed") return 1;

  // repeated postponement without valid reason
  if (input.outcome === "postponed") return 1;

  // repeated unavailability without clear reason
  if (input.outcome === "not_available") return 1;

  return 0;
}

export const ESCALATION_THRESHOLD = 3;
