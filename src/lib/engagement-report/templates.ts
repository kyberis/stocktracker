export type SurveyTemplateId = "winback" | "missing_tool" | "nps";

export type SurveyQuestionType = "nps" | "rating" | "text" | "single_choice";

export interface SurveyQuestionDraft {
  id: string;
  type: SurveyQuestionType;
  prompt: string;
  options?: string[];
}

export interface SurveyTemplateDef {
  id: SurveyTemplateId;
  label: string;
  labelEs: string;
  description: string;
  /** Preferred target segments for auto-proposal */
  preferredSegments: Array<"engaged" | "warm" | "dormant" | "churned" | "never_active" | "power" | "low_rating">;
  maxTargets: number;
  /** Skeleton the model must adapt (not send verbatim unless appropriate) */
  questionSkeletonEn: string[];
  questionSkeletonEs: string[];
}

export const SURVEY_TEMPLATES: Record<SurveyTemplateId, SurveyTemplateDef> = {
  winback: {
    id: "winback",
    label: "Why did you stop coming back?",
    labelEs: "¿Por qué dejaste de volver?",
    description: "Re-engagement survey for dormant or churned users.",
    preferredSegments: ["dormant", "churned"],
    maxTargets: 40,
    questionSkeletonEn: [
      "What mainly kept you from opening trefolio lately?",
      "What would make you come back this month?",
      "Any feature that felt incomplete or confusing?",
    ],
    questionSkeletonEs: [
      "¿Qué te impidió abrir trefolio últimamente?",
      "¿Qué te haría volver este mes?",
      "¿Alguna función te pareció incompleta o confusa?",
    ],
  },
  missing_tool: {
    id: "missing_tool",
    label: "Which tool do you miss?",
    labelEs: "¿Qué herramienta echas de menos?",
    description: "Product gap survey for engaged users with narrow tool usage.",
    preferredSegments: ["engaged", "power", "warm"],
    maxTargets: 30,
    questionSkeletonEn: [
      "Which trefolio tool do you use most?",
      "What tool or workflow do you wish existed?",
      "What almost made you leave for another app?",
    ],
    questionSkeletonEs: [
      "¿Qué herramienta de trefolio usas más?",
      "¿Qué herramienta o flujo echas de menos?",
      "¿Qué casi te hizo irte a otra app?",
    ],
  },
  nps: {
    id: "nps",
    label: "NPS 0–10",
    labelEs: "NPS 0–10",
    description: "Likelihood to recommend plus one open reason.",
    preferredSegments: ["engaged", "warm", "low_rating"],
    maxTargets: 50,
    questionSkeletonEn: [
      "How likely are you to recommend trefolio to a friend? (0–10)",
      "What is the main reason for your score?",
    ],
    questionSkeletonEs: [
      "¿Qué probabilidad hay de que recomiendes trefolio a un amigo? (0–10)",
      "¿Cuál es el motivo principal de tu puntuación?",
    ],
  },
};

export const SURVEY_TEMPLATE_IDS = Object.keys(SURVEY_TEMPLATES) as SurveyTemplateId[];

export function isSurveyTemplateId(v: string): v is SurveyTemplateId {
  return v in SURVEY_TEMPLATES;
}
