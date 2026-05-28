export interface Conversation {
  id?: number;
  title: string;
  tags: string[];
  stage: 'inspiration' | 'refining' | 'executing' | 'completed';
  maturityScore?: MaturityScore;
  createdAt: Date;
  updatedAt: Date;
}

export interface MaturityScore {
  completeness: number; // 0-10
  feasibility: number;
  novelty: number;
  logic: number;
}

export interface Message {
  id?: number;
  conversationId: number;
  role: 'user' | 'assistant';
  content: string;
  analysis?: AnalysisResult;
  mindMapData?: string;
  createdAt: Date;
}

export interface AnalysisResult {
  terms: TermMatch[];
  biases: BiasWarning[];
  summary: string;
  blindSpots: string[];
  maturityScore: MaturityScore;
  todos: TodoItem[];
  suggestedTags?: string[];
  relatedConversations?: number[];
  historicalAnalogy?: string;
  counterPerspective?: string;
  contradictions?: Contradiction[];
}

export interface TermMatch {
  term: string;
  category: string;
  explanation: string;
}

export interface BiasWarning {
  bias: string;
  description: string;
  suggestion: string;
}

export interface TodoItem {
  content: string;
  done: boolean;
}

export interface Contradiction {
  conversationId: number;
  conversationTitle: string;
  description: string;
}

export interface Note {
  id?: number;
  conversationId: number;
  content: string;
  createdAt: Date;
}

export interface AppSettings {
  apiKey: string;
  model: 'claude-sonnet-4-6' | 'claude-opus-4-7' | 'claude-haiku-4-5';
  maxTokens: number;
}
