export type GateStatus = 'passed' | 'conditional' | 'pending';

export interface GateChecklistItem {
  item: string;
  status: 'passed' | 'warning';
}

export interface QualityGate {
  id: string;
  projectId: string;
  number: number;
  name: string;
  nameEn: string;
  status: GateStatus;
  date: string | null;
  checklist?: GateChecklistItem[];
}

export type ITPStatus = 'passed' | 'conditional' | 'pending' | 'awaiting';

export interface ITPItem {
  id: string;
  projectId: string;
  sequence: number;
  item: string;
  standard: string;
  inspectionType: 'H' | 'W' | 'RS';
  inspector: string;
  status: ITPStatus;
}

export type ChecklistResult = 'pass' | 'fail';

export interface InspectionChecklistItem {
  id: string;
  item: string;
  criteria: string;
  result: ChecklistResult;
  note: string;
}

export type WorkflowStatus = 'draft' | 'confirmed' | 'signed';

export interface InspectionRecord {
  id: string;
  projectId: string;
  itpId: string;
  title: string;
  date: string;
  time: string;
  inspectors: string[];
  wbsLink: string;
  standards: string[];
  checklist: InspectionChecklistItem[];
  overallResult: string;
  failReason: string;
  autoNCR: boolean;
  workflowStatus: WorkflowStatus;
}

export interface InspectionsData {
  itpItems: ITPItem[];
  inspectionRecords: InspectionRecord[];
}
