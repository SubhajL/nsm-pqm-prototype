import { describe, expect, it } from 'vitest';

import {
  createProjectRequestSchema,
  updateProjectStatusRequestSchema,
} from './project.schema';

const validProject = {
  name: 'โครงการตัวอย่าง',
  type: 'construction',
  budget: 12_500_000,
  startDate: '2026-07-15',
  endDate: '2026-12-31',
  duration: 169,
  managerId: 'user-pm-001',
  managerName: 'สมชาย ก.',
  departmentId: 'dept-eng',
  departmentName: 'ฝ่ายวิศวกรรม',
};

describe('createProjectRequestSchema', () => {
  it('accepts a minimal valid payload', () => {
    const result = createProjectRequestSchema.safeParse(validProject);
    expect(result.success).toBe(true);
  });

  it('accepts a payload with optional milestones', () => {
    const result = createProjectRequestSchema.safeParse({
      ...validProject,
      milestones: [
        { milestone: 1, amount: 2_000_000, percentage: 20, deliverable: 'งวด 1' },
      ],
    });
    expect(result.success).toBe(true);
  });

  it('rejects a payload missing required name', () => {
    const withoutName: Partial<typeof validProject> = { ...validProject };
    delete withoutName.name;
    const result = createProjectRequestSchema.safeParse(withoutName);
    expect(result.success).toBe(false);
  });

  it('rejects a payload with empty name', () => {
    const result = createProjectRequestSchema.safeParse({ ...validProject, name: '' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.name).toBeDefined();
    }
  });

  it('rejects an unknown project type', () => {
    const result = createProjectRequestSchema.safeParse({
      ...validProject,
      type: 'mystery',
    });
    expect(result.success).toBe(false);
  });

  it('rejects a negative budget', () => {
    const result = createProjectRequestSchema.safeParse({
      ...validProject,
      budget: -1,
    });
    expect(result.success).toBe(false);
  });

  it('rejects an unknown top-level field', () => {
    const result = createProjectRequestSchema.safeParse({
      ...validProject,
      // Attempt to set internally derived field — must be rejected by `.strict()`
      id: 'sneaky-id',
    });
    expect(result.success).toBe(false);
  });
});

describe('updateProjectStatusRequestSchema', () => {
  it.each(['draft', 'on_hold', 'cancelled'] as const)(
    'accepts manual status %s',
    (status) => {
      const result = updateProjectStatusRequestSchema.safeParse({ status });
      expect(result.success).toBe(true);
    },
  );

  it.each(['planning', 'in_progress', 'completed'] as const)(
    'rejects derived status %s (must come from Gantt sync)',
    (status) => {
      const result = updateProjectStatusRequestSchema.safeParse({ status });
      expect(result.success).toBe(false);
    },
  );

  it('rejects a body missing status', () => {
    const result = updateProjectStatusRequestSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});
