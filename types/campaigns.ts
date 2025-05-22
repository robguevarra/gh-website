export interface SegmentRules {
  version: number;
  include: {
    operator: 'AND' | 'OR';
    segmentIds: string[];
  };
  exclude: {
    segmentIds: string[];
  };
} 