import type { ChangeRequest } from '@/types/document';

export interface ChangeRequestFormValues {
  title: string;
  reason: string;
  budgetImpact: number;
  scheduleImpact: number;
  linkedWbs: string;
  priority: ChangeRequest['priority'];
}
