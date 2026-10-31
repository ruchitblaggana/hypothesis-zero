// Core data types for Hypothesis Zero

export type VariableType = 'numeric' | 'categorical';

export interface ColumnDef {
  name: string;
  type: VariableType;
  unit?: string;
  description?: string;
}

export interface DatasetRecord {
  id: string;
  name: string;
  description: string;
  source: string;
  rows: Record<string, string | number | null>[];
  columns: ColumnDef[];
  dictionary: Record<string, string>;
  generationMethod: string;
  limitations: string[];
  suggestedInvestigations: string[];
  researchQuestion: string;
  reproducibility: { seed: number; params: string };
  createdAt: number;
  builtIn?: boolean;
  version: number;
}

export type AnalysisMethod =
  | 'descriptive'
  | 'correlation'
  | 'regression'
  | 'groupComparison'
  | 'contingency'
  | 'bootstrap';

export interface AnalysisConfig {
  method: AnalysisMethod;
  primaryVar?: string;
  secondaryVar?: string;
  groupVar?: string;
  categoryVar?: string;
  statVar?: string;
  bootstrapStat?: 'mean' | 'median' | 'correlation' | 'slope';
  bootstrapResamples?: number;
  bootstrapSeed?: number;
  // For correlation sub-method
  correlationType?: 'pearson' | 'spearman';
  // For contingency
  rowVar?: string;
  colVar?: string;
}

export interface HypothesisRecord {
  null?: string;
  alternative?: string;
  expectedDirection?: 'positive' | 'negative' | 'none' | 'unknown';
  population?: string;
  plannedMethod?: string;
  assumptions?: string[];
  analysisType?: 'confirmatory' | 'exploratory';
}

export type EvidenceStatus =
  | 'supported'
  | 'notSupported'
  | 'inconclusive'
  | 'requiresFurther'
  | 'notAssessed';

export interface InvestigationRecord {
  id: string;
  number: number;
  title: string;
  researchQuestion: string;
  background: string;
  reason: string;
  relevantVariables: string[];
  expectedRelationship?: string;
  hypothesis: HypothesisRecord;
  datasetId?: string;
  analyses: AnalysisResultRecord[];
  notebook: NotebookSection[];
  challengeNotes: string;
  conclusion: ConclusionRecord;
  status: 'draft' | 'inProgress' | 'completed' | 'archived';
  lastActivity: number;
  createdAt: number;
  updatedAt: number;
}

export interface ConclusionRecord {
  evidenceSuggests: string;
  doesNotEstablish: string;
  hypothesisSupported: EvidenceStatus;
  limitations: string[];
  alternativeExplanations: string[];
  nextSteps: string;
}

export interface NotebookSection {
  id: string;
  heading: string;
  body: string;
  updatedAt: number;
}

export interface AnalysisResultRecord {
  id: string;
  config: AnalysisConfig;
  resultSummary: string;
  stats: Record<string, number | string | null>;
  warnings: string[];
  timestamp: number;
  datasetVersion?: number;
}

export interface ClaimRecord {
  id: string;
  claim: string;
  datasetId?: string;
  variables: string[];
  method?: AnalysisMethod;
  config?: AnalysisConfig;
  evidenceStatus: EvidenceStatus;
  reasoning: string;
  limitations: string[];
  counterevidence: string;
  interpretation: string;
  createdAt: number;
  updatedAt: number;
}

export interface CounterexampleRecord {
  id: string;
  investigationId?: string;
  datasetId: string;
  description: string;
  modifications: ModificationRecord[];
  originalSummary: string;
  modifiedSummary: string;
  stabilityNotes: string;
  createdAt: number;
}

export interface ModificationRecord {
  type: 'exclude' | 'addHypothetical' | 'transform' | 'threshold' | 'subgroup';
  description: string;
  details: Record<string, unknown>;
}
