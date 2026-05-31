/**
 * PR-26 — As-built drawing register entry.
 *
 * One row per drawing the contractor hands over alongside a HandoverPacket.
 * `documentFileId` points at the actual PDF / DWG via the existing
 * DocumentFile registry; it is nullable for entries that have a drawing
 * number reserved before the file is uploaded.
 *
 * The 4-tuple (drawingNumber + revision + title + uploadedAt) is the
 * register row; queries are by handoverPacketId.
 */

export interface AsBuiltDrawing {
  id: string;
  handoverPacketId: string;
  /** RID drawing-number convention, e.g. `AB-CONST-001`. Free text. */
  drawingNumber: string;
  title: string;
  /** Optional pointer to a DocumentFile.id holding the as-built PDF/DWG. */
  documentFileId: string | null;
  /** Revision label, e.g. `Rev A`, `Rev B`. Free text. */
  revision: string;
  /** ISO 8601 timestamp when this drawing was filed into the register. */
  uploadedAt: string;
  notes: string;
}
