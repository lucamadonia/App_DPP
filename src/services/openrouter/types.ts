export interface OpenRouterMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface OpenRouterRequest {
  model: string;
  messages: OpenRouterMessage[];
  max_tokens?: number;
  temperature?: number;
  stream?: boolean;
}

export interface OpenRouterChoice {
  index: number;
  message: {
    role: string;
    content: string;
  };
  finish_reason: string;
}

export interface OpenRouterResponse {
  id: string;
  choices: OpenRouterChoice[];
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface OpenRouterStreamDelta {
  id: string;
  choices: {
    index: number;
    delta: {
      role?: string;
      content?: string;
    };
    finish_reason: string | null;
  }[];
}

export interface ProductContext {
  productName: string;
  category: string;
  subcategory: string;
  countries: string[];
  hasElectronics: boolean;
  hasBattery: boolean;
  batteryType: 'integrated' | 'removable' | 'external';
  hasWireless: boolean;
  wirelessTypes: string[];
  voltage: 'low' | 'high' | 'none';
  hasPackaging: boolean;
  packagingMaterials: string[];
  containsChemicals: boolean;
  targetAudience: 'b2c' | 'b2b' | 'both';
  isConnected: boolean;
}

export interface RequirementSummary {
  id: string;
  name: string;
  priority: string;
  category: string;
  description: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}
