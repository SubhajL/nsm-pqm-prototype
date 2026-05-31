/**
 * PR-30b — Integration manifest cross-check.
 *
 * Asserts:
 *  1. Every fixture file on disk under each integration's `fixtures/`
 *     directory is declared in `INTEGRATION_FIXTURES`.
 *  2. Every declared fixture parses cleanly against the named Zod
 *     schema exported from the system's `contract.ts`.
 *  3. Every declared `system` is one of `INTEGRATION_SYSTEMS`.
 *
 * Authors adding a new fixture or schema must extend the manifest;
 * forgetting either side fails this test.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';
import type { ZodType } from 'zod';

import {
  INTEGRATION_SYSTEMS,
  type IntegrationSystem,
} from './integration-types';
import { INTEGRATION_FIXTURES } from './manifest';

import * as egpContract from './e-gp/contract';
import * as gfmisContract from './gfmis/contract';
import * as pbmsContract from './pbms/contract';
import * as pfmsSp2Contract from './pfms-sp2/contract';

const SCHEMA_MODULES: Record<IntegrationSystem, Record<string, unknown>> = {
  'e-gp': egpContract,
  gfmis: gfmisContract,
  pbms: pbmsContract,
  'pfms-sp2': pfmsSp2Contract,
};

const INTEGRATION_ROOT = __dirname;

function fixtureDirFor(system: IntegrationSystem): string {
  return join(INTEGRATION_ROOT, system, 'fixtures');
}

function listFixturesOnDisk(system: IntegrationSystem): string[] {
  try {
    return readdirSync(fixtureDirFor(system)).filter((f) =>
      f.endsWith('.json'),
    );
  } catch {
    return [];
  }
}

describe('integration manifest', () => {
  it('declares only known integration systems', () => {
    const systems = new Set<string>(INTEGRATION_SYSTEMS);
    for (const entry of INTEGRATION_FIXTURES) {
      expect(systems.has(entry.system)).toBe(true);
    }
  });

  it('lists every fixture on disk for every system', () => {
    for (const system of INTEGRATION_SYSTEMS) {
      const declared = new Set(
        INTEGRATION_FIXTURES.filter((e) => e.system === system).map(
          (e) => e.fixturePath,
        ),
      );
      const onDisk = listFixturesOnDisk(system);
      for (const file of onDisk) {
        expect(declared.has(file)).toBe(true);
      }
      // And the inverse: every declared fixture must exist on disk.
      declared.forEach((file) => {
        expect(onDisk.includes(file)).toBe(true);
      });
    }
  });

  it.each(INTEGRATION_FIXTURES)(
    '$system/$fixturePath parses against $schemaExport',
    (entry) => {
      const mod = SCHEMA_MODULES[entry.system];
      const schema = mod[entry.schemaExport] as ZodType | undefined;
      expect(schema, `missing schema export ${entry.schemaExport}`).toBeDefined();
      const raw = readFileSync(
        join(INTEGRATION_ROOT, entry.system, 'fixtures', entry.fixturePath),
        'utf-8',
      );
      const json = JSON.parse(raw);
      expect(() => schema!.parse(json)).not.toThrow();
    },
  );
});
