'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Button,
  Card,
  Col,
  Input,
  InputNumber,
  Row,
  Space,
  Typography,
  message,
} from 'antd';
import { CameraOutlined, DeleteOutlined, EnvironmentOutlined } from '@ant-design/icons';

import { formatGpsLabel, requestGpsAsync } from '@/components/common';
import { announce } from '@/components/a11y';
import { COLORS } from '@/theme/antd-theme';
import { SPACING } from '@/theme/scales';

const { Text } = Typography;

/**
 * PR-D1b — controlled multi-image capture field with per-photo GPS.
 * PR-D1c — wired into Daily Report Step 4 with back-compat data-testid
 * + 1-based indexed aria-labels + per-photo timestamp Input so the
 * existing batch4-daily-report-file-uploads E2E spec continues to pass.
 *
 * Output shape is intentionally rich so the Daily Report submit handler
 * can map directly into the `DailyReport.photos[]` array via the pure
 * `submit-mapper.ts` helper.
 */
export interface CapturedPhoto {
  /** Unique key for React reconciliation. */
  id: string;
  /** Original filename. */
  filename: string;
  /** Bytes — drives the "X MB" label and the validation check upstream. */
  sizeBytes: number;
  /** MIME type from the File. */
  mimeType: string;
  /** Object URL for thumbnail rendering. Revoked on remove. */
  previewUrl: string;
  /** GPS coordinates (auto-captured or manually entered). */
  gpsLat: number;
  gpsLng: number;
  /** ISO 8601 timestamp of when the photo was captured. */
  timestamp: string;
  /** Source File handle (for upload submission). */
  file: File;
}

export interface PhotoCaptureFieldProps {
  value?: CapturedPhoto[];
  onChange?: (next: CapturedPhoto[]) => void;
  /** Fallback default coordinates when GPS is denied or unavailable. */
  defaultGps?: { lat: number; lng: number };
  /** Optional bilingual aria-label override for the file input. */
  ariaLabel?: string;
}

const DEFAULT_GPS = { lat: 13.7563, lng: 100.5018 } as const;

export function PhotoCaptureField({
  value,
  onChange,
  defaultGps = DEFAULT_GPS,
  ariaLabel = 'อัปโหลดภาพถ่ายหน้างาน (Upload site photos)',
}: PhotoCaptureFieldProps) {
  const photos = useMemo(() => value ?? [], [value]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  // PR-D1b — Track every object URL we ever created so the unmount
  // sweep catches photos added AFTER the first render. Per-add pushes
  // happen in `handleFilesSelected`; per-remove revokes in `handleRemove`.
  const createdUrlsRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    const urls = createdUrlsRef.current;
    return () => {
      Array.from(urls).forEach((url) => {
        try {
          URL.revokeObjectURL(url);
        } catch {
          // ignore
        }
      });
      urls.clear();
    };
  }, []);

  // PR-D1c (Codex MEDIUM fix) — Revoke tracked URLs that are no longer
  // present in the current `value`. Without this, URLs from a parent-
  // driven reset (form.resetFields() / setFieldsValue({photos: []}) /
  // modal close-reopen) linger until full unmount.
  useEffect(() => {
    const tracked = createdUrlsRef.current;
    if (tracked.size === 0) return;
    const present = new Set(photos.map((p) => p.previewUrl));
    Array.from(tracked).forEach((url) => {
      if (!present.has(url)) {
        try {
          URL.revokeObjectURL(url);
        } catch {
          // ignore
        }
        tracked.delete(url);
      }
    });
  }, [photos]);

  const emit = (next: CapturedPhoto[]) => {
    onChange?.(next);
  };

  const handleFilesSelected = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setBusy(true);
    try {
      const gps = await requestGpsAsync();
      const stamp = new Date().toISOString();
      const lat = gps.ok ? gps.lat : defaultGps.lat;
      const lng = gps.ok ? gps.lng : defaultGps.lng;

      if (!gps.ok) {
        const reasonText =
          gps.reason === 'denied'
            ? 'ไม่ได้รับอนุญาตให้เข้าถึง GPS (GPS permission denied)'
            : 'อุปกรณ์ไม่รองรับ GPS หรือเกิดข้อผิดพลาด (GPS unavailable)';
        message.warning(`${reasonText} — ใช้พิกัดเริ่มต้น (using default coordinates)`);
        announce(reasonText, 'polite');
      }

      const nextPhotos: CapturedPhoto[] = Array.from(files).map((file, index) => {
        const previewUrl = URL.createObjectURL(file);
        createdUrlsRef.current.add(previewUrl);
        return {
          id: `photo-${Date.now()}-${index}-${file.name}`,
          filename: file.name,
          sizeBytes: file.size,
          mimeType: file.type,
          previewUrl,
          gpsLat: lat,
          gpsLng: lng,
          timestamp: stamp,
          file,
        };
      });

      emit([...photos, ...nextPhotos]);
      announce(`เพิ่ม ${nextPhotos.length} ภาพแล้ว (${nextPhotos.length} photos added)`);
    } finally {
      setBusy(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemove = (photoId: string) => {
    const target = photos.find((p) => p.id === photoId);
    if (target) {
      try {
        URL.revokeObjectURL(target.previewUrl);
      } catch {
        // ignore
      }
      createdUrlsRef.current.delete(target.previewUrl);
    }
    emit(photos.filter((p) => p.id !== photoId));
  };

  const handleManualLat = (photoId: string, lat: number | null) => {
    if (lat === null) return;
    emit(photos.map((p) => (p.id === photoId ? { ...p, gpsLat: lat } : p)));
  };

  const handleManualLng = (photoId: string, lng: number | null) => {
    if (lng === null) return;
    emit(photos.map((p) => (p.id === photoId ? { ...p, gpsLng: lng } : p)));
  };

  const handleManualTimestamp = (photoId: string, value: string) => {
    emit(photos.map((p) => (p.id === photoId ? { ...p, timestamp: value } : p)));
  };

  return (
    <div>
      <Space wrap style={{ marginBottom: SPACING.md }}>
        <Button
          icon={<CameraOutlined />}
          onClick={() => fileInputRef.current?.click()}
          loading={busy}
          aria-label={ariaLabel}
        >
          เลือกภาพ (Choose photos)
        </Button>
        <Text type="secondary">
          <EnvironmentOutlined /> GPS จับอัตโนมัติเมื่อเลือกภาพ (GPS captured per batch)
        </Text>
      </Space>
      {/* PR-D1c — Back-compat data-testid for batch4-daily-report-file-uploads
          spec that uses `setInputFiles` against `daily-report-photo-upload`. */}
      <input
        ref={fileInputRef}
        data-testid="daily-report-photo-upload"
        type="file"
        accept="image/*"
        multiple
        style={{ display: 'none' }}
        onChange={(event) => {
          void handleFilesSelected(event.target.files);
        }}
        aria-label={ariaLabel}
      />

      {photos.length === 0 ? (
        <Text type="secondary">ยังไม่ได้เลือกภาพ (No photos yet)</Text>
      ) : (
        <Row gutter={[SPACING.md, SPACING.md]}>
          {photos.map((photo, index) => {
            // PR-D1c — 1-based aria-labels match the legacy batch4 spec
            // selectors `ละติจูดภาพ 1` / `ลองจิจูดภาพ 1` / `เวลาถ่ายภาพ 1`.
            const oneBased = index + 1;
            return (
              <Col xs={24} sm={12} key={photo.id}>
                <Card size="small" styles={{ body: { padding: SPACING.md } }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={photo.previewUrl}
                    alt={`ภาพถ่าย ${photo.filename}`}
                    style={{
                      width: '100%',
                      maxHeight: 160,
                      objectFit: 'cover',
                      borderRadius: 4,
                      border: `1px solid ${COLORS.borderSoft}`,
                    }}
                  />
                  <div style={{ marginTop: SPACING.sm }}>
                    <Text strong ellipsis>
                      {photo.filename}
                    </Text>
                    <div>
                      <Text type="secondary">
                        {formatGpsLabel({ lat: photo.gpsLat, lng: photo.gpsLng })}
                      </Text>
                    </div>
                  </div>
                  <Row gutter={SPACING.sm} style={{ marginTop: SPACING.sm }}>
                    <Col span={12}>
                      <InputNumber
                        aria-label={`ละติจูดภาพ ${oneBased}`}
                        value={photo.gpsLat}
                        step={0.0001}
                        onChange={(next) => handleManualLat(photo.id, next as number | null)}
                        style={{ width: '100%' }}
                      />
                    </Col>
                    <Col span={12}>
                      <InputNumber
                        aria-label={`ลองจิจูดภาพ ${oneBased}`}
                        value={photo.gpsLng}
                        step={0.0001}
                        onChange={(next) => handleManualLng(photo.id, next as number | null)}
                        style={{ width: '100%' }}
                      />
                    </Col>
                  </Row>
                  <Input
                    aria-label={`เวลาถ่ายภาพ ${oneBased}`}
                    value={photo.timestamp}
                    onChange={(event) => handleManualTimestamp(photo.id, event.target.value)}
                    placeholder="YYYY-MM-DDTHH:mm:ss"
                    style={{ marginTop: SPACING.sm }}
                  />
                  <Button
                    block
                    danger
                    icon={<DeleteOutlined />}
                    onClick={() => handleRemove(photo.id)}
                    style={{ marginTop: SPACING.sm }}
                    aria-label={`ลบภาพ ${photo.filename} (Remove photo)`}
                  >
                    ลบภาพ (Remove)
                  </Button>
                </Card>
              </Col>
            );
          })}
        </Row>
      )}
    </div>
  );
}
