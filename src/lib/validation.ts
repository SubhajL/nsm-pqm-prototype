import type { ZodType } from 'zod';

/**
 * Result of running a Zod schema against a request body.
 *
 * - `{ success: true, data }` — input was valid; caller can use `data` directly.
 * - `{ success: false, response }` — input was invalid; caller MUST return `response`
 *   immediately (it is a 400 JSON envelope with field-level errors).
 *
 * This shape lets the route stay branchless and avoids throwing for the common
 * "user sent garbage" case.
 */
export type ParseRequestResult<T> =
  | { success: true; data: T }
  | { success: false; response: Response };

/**
 * Validate an unknown request body against a Zod schema.
 *
 * On failure returns a ready-to-return Response with status 400 and the envelope:
 *
 * ```json
 * {
 *   "status": "error",
 *   "error": {
 *     "code": "VALIDATION_FAILED",
 *     "message": "Request body failed validation",
 *     "fieldErrors": { "<field>": ["<message>", ...], ... },
 *     "formErrors": ["<top-level message>", ...]
 *   }
 * }
 * ```
 *
 * `fieldErrors` / `formErrors` come from Zod's `flatten()` and provide
 * per-field error messages suitable for surfacing in a form UI.
 */
export function parseRequestBody<T>(
  schema: ZodType<T>,
  body: unknown,
): ParseRequestResult<T> {
  const result = schema.safeParse(body);

  if (result.success) {
    return { success: true, data: result.data };
  }

  const flattened = result.error.flatten();

  const response = Response.json(
    {
      status: 'error',
      error: {
        code: 'VALIDATION_FAILED',
        message: 'Request body failed validation',
        fieldErrors: flattened.fieldErrors,
        formErrors: flattened.formErrors,
      },
    },
    { status: 400 },
  );

  return { success: false, response };
}
