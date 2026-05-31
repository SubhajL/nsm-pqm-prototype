/**
 * PR-30a — Knowledge area note Zod schema tests.
 */

import { describe, expect, it } from 'vitest';

import { createKnowledgeAreaNoteRequestSchema } from './knowledge-area-note.schema';

describe('createKnowledgeAreaNoteRequestSchema', () => {
  it('accepts a valid integration note', () => {
    expect(
      createKnowledgeAreaNoteRequestSchema.safeParse({
        area: 'integration',
        content: '# Integration plan\n- ...',
      }).success,
    ).toBe(true);
  });

  it.each(['integration', 'communication_plan', 'formal_procurement_plan'])(
    'accepts canonical DT6 area %s',
    (area) => {
      expect(
        createKnowledgeAreaNoteRequestSchema.safeParse({
          area,
          content: 'body',
        }).success,
      ).toBe(true);
    },
  );

  it('rejects unknown areas (e.g. PMBOK terminology)', () => {
    // PMBOK has e.g. "scope_management" which is intentionally NOT in DT6.
    expect(
      createKnowledgeAreaNoteRequestSchema.safeParse({
        area: 'scope_management',
        content: 'body',
      }).success,
    ).toBe(false);
  });

  it('rejects empty content', () => {
    expect(
      createKnowledgeAreaNoteRequestSchema.safeParse({
        area: 'integration',
        content: '',
      }).success,
    ).toBe(false);
  });

  it('rejects missing area', () => {
    expect(
      createKnowledgeAreaNoteRequestSchema.safeParse({
        content: 'body',
      }).success,
    ).toBe(false);
  });

  it('rejects extra keys (strict)', () => {
    expect(
      createKnowledgeAreaNoteRequestSchema.safeParse({
        area: 'integration',
        content: 'body',
        bogus: 1,
      }).success,
    ).toBe(false);
  });
});
