import { describe, expect, it } from 'vitest';
import dayjs from 'dayjs';

import {
  buildDailyReportFormData,
  buildDailyReportMetadata,
  type DailyReportSubmitValues,
} from './submit-mapper';
import type { CapturedPhoto } from './PhotoCaptureField';

function makePhoto(overrides: Partial<CapturedPhoto> = {}): CapturedPhoto {
  return {
    id: 'photo-1',
    filename: 'site-progress.jpg',
    sizeBytes: 1024,
    mimeType: 'image/jpeg',
    previewUrl: 'blob:fake',
    gpsLat: 13.7563,
    gpsLng: 100.5018,
    timestamp: '2026-03-19T10:15:00',
    file: new File([new Uint8Array(1024)], 'site-progress.jpg', { type: 'image/jpeg' }),
    ...overrides,
  };
}

function makeValues(
  overrides: Partial<DailyReportSubmitValues> = {},
): DailyReportSubmitValues {
  return {
    projectId: 'proj-002',
    date: dayjs('2026-03-19'),
    weather: 'แดดจัด (Sunny)',
    temperature: 31,
    linkedWbs: [],
    personnel: [{ type: 'วิศวกรระบบ', count: 2 }],
    activities: [
      {
        task: 'ติดตาม integration test',
        quantity: 1,
        unit: 'งาน',
        cumulativeProgress: 30,
      },
    ],
    photos: [makePhoto()],
    attachments: [],
    signatures: {
      reporter: { name: 'น.ส.สมศรี วรรณดี', signed: true, timestamp: '2026-03-19T10:00:00.000Z' },
      inspector: { name: 'นายสมชาย กิตติพงษ์', signed: false, timestamp: null },
    },
    issues: 'อัปโหลดไฟล์รายงาน 123',
    ...overrides,
  };
}

describe('buildDailyReportMetadata', () => {
  it('formats date as YYYY-MM-DD', () => {
    const meta = buildDailyReportMetadata(makeValues());
    expect(meta.date).toBe('2026-03-19');
  });

  it('clamps cumulativeProgress to 0..1 from 0..100 input', () => {
    const meta = buildDailyReportMetadata(
      makeValues({
        activities: [
          { task: 'a', quantity: 1, unit: 'u', cumulativeProgress: 150 },
          { task: 'b', quantity: 1, unit: 'u', cumulativeProgress: 30 },
          { task: 'c', quantity: 1, unit: 'u', cumulativeProgress: -5 },
        ],
      }),
    );
    expect((meta.activities as Array<{ cumulativeProgress: number }>)[0].cumulativeProgress).toBe(1);
    expect((meta.activities as Array<{ cumulativeProgress: number }>)[1].cumulativeProgress).toBe(0.3);
    expect((meta.activities as Array<{ cumulativeProgress: number }>)[2].cumulativeProgress).toBe(0);
  });

  it('derives totalPersonnel as the sum of personnel.count', () => {
    const meta = buildDailyReportMetadata(
      makeValues({
        personnel: [
          { type: 'A', count: 2 },
          { type: 'B', count: 3 },
        ],
      }),
    );
    expect(meta.totalPersonnel).toBe(5);
  });

  it('filters out personnel with blank type or zero count', () => {
    const meta = buildDailyReportMetadata(
      makeValues({
        personnel: [
          { type: '', count: 5 },
          { type: 'Engineer', count: 0 },
          { type: 'Engineer', count: 2 },
        ],
      }),
    );
    expect(meta.personnel).toEqual([{ type: 'Engineer', count: 2 }]);
    expect(meta.totalPersonnel).toBe(2);
  });

  it('maps photoMetadata in the same order as photos[] (server pairs by index)', () => {
    const meta = buildDailyReportMetadata(
      makeValues({
        photos: [
          makePhoto({ id: 'p1', gpsLat: 13.0, gpsLng: 100.0, timestamp: 't1' }),
          makePhoto({ id: 'p2', gpsLat: 14.0, gpsLng: 101.0, timestamp: 't2' }),
        ],
      }),
    );
    expect(meta.photoMetadata).toEqual([
      { gpsLat: 13.0, gpsLng: 100.0, timestamp: 't1' },
      { gpsLat: 14.0, gpsLng: 101.0, timestamp: 't2' },
    ]);
  });

  it('defaults issues to "ไม่พบปัญหา" when blank or undefined', () => {
    expect((buildDailyReportMetadata(makeValues({ issues: '' })) as { issues: string }).issues).toBe('ไม่พบปัญหา');
    expect((buildDailyReportMetadata(makeValues({ issues: undefined })) as { issues: string }).issues).toBe('ไม่พบปัญหา');
  });

  it('passes signed=true through with the captured timestamp', () => {
    const meta = buildDailyReportMetadata(makeValues());
    const sigs = meta.signatures as {
      reporter: { signed: boolean; timestamp: string | null };
      inspector: { signed: boolean; timestamp: string | null };
    };
    expect(sigs.reporter.signed).toBe(true);
    expect(sigs.reporter.timestamp).toBe('2026-03-19T10:00:00.000Z');
    expect(sigs.inspector.signed).toBe(false);
    expect(sigs.inspector.timestamp).toBeNull();
  });

  it('falls back to current time when signed=true but timestamp is missing', () => {
    const meta = buildDailyReportMetadata(
      makeValues({
        signatures: {
          reporter: { name: 'A', signed: true, timestamp: null },
          inspector: { name: 'B', signed: false, timestamp: null },
        },
      }),
    );
    const sigs = meta.signatures as { reporter: { timestamp: string | null } };
    expect(sigs.reporter.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
});

describe('buildDailyReportFormData', () => {
  it('appends one `photoFiles` entry per photo in order', () => {
    const fd = buildDailyReportFormData(
      makeValues({
        photos: [
          makePhoto({ id: 'p1', filename: 'a.jpg' }),
          makePhoto({ id: 'p2', filename: 'b.jpg' }),
        ],
      }),
    );
    const photos = fd.getAll('photoFiles');
    expect(photos).toHaveLength(2);
    expect((photos[0] as File).name).toBe('a.jpg');
    expect((photos[1] as File).name).toBe('b.jpg');
  });

  it('emits a metadata JSON field that parses back to a known shape', () => {
    const fd = buildDailyReportFormData(makeValues());
    const raw = fd.get('metadata');
    expect(typeof raw).toBe('string');
    const parsed = JSON.parse(raw as string) as { projectId: string; date: string };
    expect(parsed.projectId).toBe('proj-002');
    expect(parsed.date).toBe('2026-03-19');
  });

  it('appends attachments under `attachmentFiles`', () => {
    const fd = buildDailyReportFormData(
      makeValues({
        attachments: [
          { file: new File([new Uint8Array(8)], 'doc.pdf', { type: 'application/pdf' }), name: 'doc.pdf' },
        ],
      }),
    );
    const attachments = fd.getAll('attachmentFiles');
    expect(attachments).toHaveLength(1);
    expect((attachments[0] as File).name).toBe('doc.pdf');
  });
});
