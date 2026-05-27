import { describe, expect, it } from 'vitest';

import seedProjects from '@/data/projects.json';
import { fullProjectSchema } from '@/types/project.schema';
import {
  PROJECT_SIZE_TIERS,
  type ProjectSizeTier,
} from '@/types/rid/vocabulary';

import {
  APPROVAL_AUTHORITY_BY_TIER,
  ROLES_SATISFYING_AUTHORITY,
  getRequiredApprovalAuthority,
  roleSatisfiesAuthority,
} from './approval-authority';

describe('getRequiredApprovalAuthority', () => {
  it('maps small tier to section_head', () => {
    expect(getRequiredApprovalAuthority('small')).toBe('section_head');
  });

  it('maps medium tier to bureau_director', () => {
    expect(getRequiredApprovalAuthority('medium')).toBe('bureau_director');
  });

  it('maps large tier to deputy_director_general', () => {
    expect(getRequiredApprovalAuthority('large')).toBe(
      'deputy_director_general',
    );
  });
});

describe('APPROVAL_AUTHORITY_BY_TIER', () => {
  it('has an entry for every ProjectSizeTier value (completeness guard)', () => {
    // Drive the completeness check off the canonical PROJECT_SIZE_TIERS
    // constant so a new tier added to the vocabulary cannot silently bypass
    // the authority table.
    for (const tier of PROJECT_SIZE_TIERS) {
      expect(APPROVAL_AUTHORITY_BY_TIER[tier]).toBeDefined();
    }
    expect(Object.keys(APPROVAL_AUTHORITY_BY_TIER).sort()).toEqual(
      [...PROJECT_SIZE_TIERS].sort(),
    );
  });

  it('only emits known ApprovalAuthority values', () => {
    const validAuthorities = new Set([
      'section_head',
      'bureau_director',
      'deputy_director_general',
    ]);
    for (const tier of PROJECT_SIZE_TIERS) {
      expect(validAuthorities.has(APPROVAL_AUTHORITY_BY_TIER[tier])).toBe(true);
    }
  });
});

describe('ROLES_SATISFYING_AUTHORITY', () => {
  it('always includes System Admin for deputy_director_general (MVP placeholder)', () => {
    expect(
      ROLES_SATISFYING_AUTHORITY['deputy_director_general'].includes(
        'System Admin',
      ),
    ).toBe(true);
  });

  it('includes System Admin for every authority level', () => {
    const authorities: Array<keyof typeof ROLES_SATISFYING_AUTHORITY> = [
      'section_head',
      'bureau_director',
      'deputy_director_general',
    ];
    for (const authority of authorities) {
      expect(ROLES_SATISFYING_AUTHORITY[authority]).toContain('System Admin');
    }
  });

  it('treats Project Manager as satisfying section_head and bureau_director but not deputy_director_general', () => {
    // MVP placeholder: conservative mapping pending RID confirmation. See
    // approval-authority.ts NOTE for rationale.
    expect(roleSatisfiesAuthority('Project Manager', 'section_head')).toBe(true);
    expect(roleSatisfiesAuthority('Project Manager', 'bureau_director')).toBe(
      true,
    );
    expect(
      roleSatisfiesAuthority('Project Manager', 'deputy_director_general'),
    ).toBe(false);
  });
});

describe('seed Project shape regression (PR-14)', () => {
  it('every seed Project carries a valid sizeTier', () => {
    expect(seedProjects.length).toBeGreaterThan(0);
    for (const project of seedProjects) {
      // Use the fullProjectSchema so this regression catches *any* drift in
      // required Project fields, not just sizeTier.
      const result = fullProjectSchema.safeParse(project);
      if (!result.success) {
        // Surface helpful diagnostics if a seed row drifts.
        throw new Error(
          `Seed project ${(project as { id?: string }).id ?? '?'} failed full ` +
            `schema parse: ${result.error.message}`,
        );
      }
      const tier: ProjectSizeTier = result.data.sizeTier;
      expect(PROJECT_SIZE_TIERS).toContain(tier);
    }
  });
});
