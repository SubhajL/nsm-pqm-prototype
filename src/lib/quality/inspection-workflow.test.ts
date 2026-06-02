import { describe, expect, it } from 'vitest';
import { transitionInspection } from './inspection-workflow';

const passItem = { result: 'pass' as const };
const failItem = { result: 'fail' as const };

describe('transitionInspection', () => {
  describe('legal forward transitions', () => {
    it('allows draft → confirmed with all-pass checklist', () => {
      const r = transitionInspection({
        from: 'draft',
        to: 'confirmed',
        checklist: [passItem, passItem],
      });
      expect(r).toEqual({ ok: true, nextStatus: 'confirmed' });
    });

    it('allows confirmed → signed with all-pass checklist', () => {
      const r = transitionInspection({
        from: 'confirmed',
        to: 'signed',
        checklist: [passItem],
      });
      expect(r).toEqual({ ok: true, nextStatus: 'signed' });
    });

    it('allows draft → confirmed with empty checklist (no fails)', () => {
      const r = transitionInspection({
        from: 'draft',
        to: 'confirmed',
        checklist: [],
      });
      expect(r).toEqual({ ok: true, nextStatus: 'confirmed' });
    });
  });

  describe('invalid transitions (validity-first)', () => {
    it('rejects draft → signed (skipping confirmed) even with all-pass checklist', () => {
      const r = transitionInspection({
        from: 'draft',
        to: 'signed',
        checklist: [passItem],
      });
      expect(r.ok).toBe(false);
      if (r.ok) return;
      expect(r.code).toBe('INVALID_TRANSITION');
      expect(r.message).toMatch(/ไม่สามารถเปลี่ยนสถานะจาก "draft" เป็น "signed"/);
    });

    it('rejects draft → signed (skipping confirmed) even with failing checklist — validity wins over fails', () => {
      // This is the cross-route invariant: validity is checked BEFORE fails.
      // Pinned by [id] route test (draft → signed must be 409 INVALID_TRANSITION,
      // not 400 BAD_REQUEST for fails).
      const r = transitionInspection({
        from: 'draft',
        to: 'signed',
        checklist: [failItem],
      });
      expect(r.ok).toBe(false);
      if (r.ok) return;
      expect(r.code).toBe('INVALID_TRANSITION');
    });

    it('rejects confirmed → draft (backward) as invalid', () => {
      const r = transitionInspection({
        from: 'confirmed',
        to: 'draft',
        checklist: [passItem],
      });
      expect(r.ok).toBe(false);
      if (r.ok) return;
      expect(r.code).toBe('INVALID_TRANSITION');
    });

    it('rejects signed → anywhere (terminal) as invalid', () => {
      const r = transitionInspection({
        from: 'signed',
        to: 'confirmed',
        checklist: [passItem],
      });
      expect(r.ok).toBe(false);
      if (r.ok) return;
      expect(r.code).toBe('INVALID_TRANSITION');
    });

    it('rejects self-transition (draft → draft) as invalid — callers should skip no-op before calling', () => {
      const r = transitionInspection({
        from: 'draft',
        to: 'draft',
        checklist: [passItem],
      });
      expect(r.ok).toBe(false);
      if (r.ok) return;
      expect(r.code).toBe('INVALID_TRANSITION');
    });
  });

  describe('checklist-has-fails (forward-transition only)', () => {
    it('blocks draft → confirmed when any checklist item is fail', () => {
      const r = transitionInspection({
        from: 'draft',
        to: 'confirmed',
        checklist: [passItem, failItem, passItem],
      });
      expect(r.ok).toBe(false);
      if (r.ok) return;
      expect(r.code).toBe('CHECKLIST_HAS_FAILS');
      expect(r.message).toMatch(/ไม่สามารถยืนยันหรือลงนามได้/);
      expect(r.message).toMatch(/ไม่ผ่าน/);
    });

    it('blocks confirmed → signed when any checklist item is fail', () => {
      const r = transitionInspection({
        from: 'confirmed',
        to: 'signed',
        checklist: [failItem],
      });
      expect(r.ok).toBe(false);
      if (r.ok) return;
      expect(r.code).toBe('CHECKLIST_HAS_FAILS');
    });
  });
});
