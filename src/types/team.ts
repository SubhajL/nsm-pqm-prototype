import type { ProjectAssignmentRole } from '@/lib/project-membership-store';
import type { User } from '@/types/admin';

export interface ProjectTeamMember extends User {
  assignmentRole: ProjectAssignmentRole;
}
