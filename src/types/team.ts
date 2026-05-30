import type { ProjectAssignmentRole } from '@/lib/repositories/team-membership.repository';
import type { User } from '@/types/admin';

export interface ProjectTeamMember extends User {
  assignmentRole: ProjectAssignmentRole;
}
