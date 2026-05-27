import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { parseRequestBody } from './validation';

const sampleSchema = z
  .object({
    name: z.string().min(1, 'name is required'),
    age: z.number().int().nonnegative(),
  })
  .strict();

describe('parseRequestBody', () => {
  it('returns success + parsed data when body matches the schema', () => {
    const result = parseRequestBody(sampleSchema, { name: 'Alice', age: 42 });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({ name: 'Alice', age: 42 });
    }
  });

  it('returns success when extra-but-valid input matches a non-strict schema', () => {
    const loose = z.object({ name: z.string() });
    const result = parseRequestBody(loose, { name: 'A', extra: 'ignored' });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe('A');
    }
  });

  it('returns a 400 Response with the VALIDATION_FAILED envelope when input is invalid', async () => {
    const result = parseRequestBody(sampleSchema, { name: '', age: -1 });

    expect(result.success).toBe(false);
    if (result.success) return;

    expect(result.response.status).toBe(400);
    const body = (await result.response.json()) as {
      status: string;
      error: {
        code: string;
        message: string;
        fieldErrors: Record<string, string[]>;
        formErrors: string[];
      };
    };

    expect(body.status).toBe('error');
    expect(body.error.code).toBe('VALIDATION_FAILED');
    expect(body.error.message).toBe('Request body failed validation');
    expect(body.error.fieldErrors.name).toContain('name is required');
    expect(body.error.fieldErrors.age?.length ?? 0).toBeGreaterThan(0);
  });

  it('rejects null / undefined body with a 400 envelope (no throw)', async () => {
    const result = parseRequestBody(sampleSchema, null);
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.response.status).toBe(400);

    const undef = parseRequestBody(sampleSchema, undefined);
    expect(undef.success).toBe(false);
    if (undef.success) return;
    expect(undef.response.status).toBe(400);
  });

  it('rejects unknown top-level keys when the schema is strict', async () => {
    const result = parseRequestBody(sampleSchema, {
      name: 'Alice',
      age: 1,
      injected: 'sneaky',
    });

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.response.status).toBe(400);
  });
});
