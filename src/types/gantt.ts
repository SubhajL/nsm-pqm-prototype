export type GanttLinkType = 'FS' | 'SS' | 'FF' | 'SF';

export interface GanttTask {
  id: number;
  text: string;
  start_date: string;
  end_date: string;
  duration: number;
  progress: number;
  parent: number;
  type: string;
  owner: string;
  /** Original planned start date (baseline snapshot) */
  baseline_start_date?: string;
  /** Original planned end date (baseline snapshot) */
  baseline_end_date?: string;
}

export interface GanttLink {
  id: number;
  source: number;
  target: number;
  type: GanttLinkType;
  lagDays: number;
}

export interface GanttData {
  data: GanttTask[];
  links: GanttLink[];
}

export interface GanttTaskInput {
  text: string;
  start_date: string;
  end_date: string;
  progress: number;
  parent: number;
  type: string;
  owner: string;
  predecessorIds?: number[];
  predecessors?: Array<{
    taskId: number;
    linkType: GanttLinkType;
    lagDays: number;
  }>;
}
