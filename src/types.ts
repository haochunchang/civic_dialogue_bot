export interface SourceEvidence {
  fact: string;
  sourceTitle: string;
  sourceUrl: string;
}

export interface FactCheckResult {
  summary: string;
  supporting: SourceEvidence[];
  opposing: SourceEvidence[];
  rawMarkdown?: string;
}
