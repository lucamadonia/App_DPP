export { streamCompletion, isAIAvailable } from './client';
export {
  buildDeepAnalysisMessages,
  buildOverallAssessmentMessages,
  buildActionPlanMessages,
  buildAdditionalRequirementsMessages,
  buildChatMessages,
} from './prompts';
export type {
  OpenRouterMessage,
  ProductContext,
  RequirementSummary,
  ChatMessage,
} from './types';
