/**
 * PR-26 — Asset registration entry (RID asset-system-compatible).
 *
 * One row per physical asset handed over from construction to O&M. The
 * shape mirrors RID's asset coding system at a level sufficient to feed
 * downstream GFMIS / fixed-asset modules:
 *
 *   - `assetCode` is the RID-internal asset id (free text, e.g. `WS-LCS-001`
 *     for "Weir System / Lower Chao-praya Sector / 001").
 *   - `assetType` is the coarse classification used by the asset
 *     register's roll-up reports.
 *   - `costCenter` links to the PR-17 org tree's GFMIS code; nullable for
 *     assets that have not been allocated to a cost center yet.
 */

export const ASSET_TYPES = [
  'civil',
  'mechanical',
  'electrical',
  'hydraulic',
  'instrumentation',
] as const;
export type AssetType = (typeof ASSET_TYPES)[number];

export interface AssetRegistration {
  id: string;
  handoverPacketId: string;
  /** RID asset coding, e.g. `WS-LCS-001`. Free text. */
  assetCode: string;
  assetType: AssetType;
  /** ISO 8601 date when the asset was installed on site. */
  installedAt: string;
  installedLocation: string;
  /** Acquisition value in THB at handover. */
  initialValue: number;
  /** GFMIS cost-center code; nullable until allocated. */
  costCenter: string | null;
  notes: string;
}

export const ASSET_TYPE_LABELS: Record<AssetType, { th: string; en: string }> = {
  civil: { th: 'งานโยธา', en: 'Civil' },
  mechanical: { th: 'งานเครื่องกล', en: 'Mechanical' },
  electrical: { th: 'งานไฟฟ้า', en: 'Electrical' },
  hydraulic: { th: 'งานชลศาสตร์', en: 'Hydraulic' },
  instrumentation: { th: 'งานเครื่องวัด', en: 'Instrumentation' },
};
