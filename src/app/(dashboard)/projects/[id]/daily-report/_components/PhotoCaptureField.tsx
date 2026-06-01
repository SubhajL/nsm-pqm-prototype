'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Button, Card, Col, InputNumber, Row, Space, Typography, message } from 'antd';
import { CameraOutlined, DeleteOutlined, EnvironmentOutlined } from '@ant-design/icons';

import { formatGpsLabel, requestGpsAsync } from '@/components/common';
import { announce } from '@/components/a11y';
import { COLORS } from '@/theme/antd-theme';
import { SPACING } from '@/theme/scales';

const { Text } = Typography;

/**
 * PR-D1b — controlled multi-image capture field with per-photo GPS.
 *
 * Output shape is intentionally rich so the Daily Report submit handler
 * can map directly into the `DailyReport.photos[]` array.
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

  // Revoke object URLs on unmount so we don't leak memory between modal sessions.
  useEffect(() => {
    return () => {
      for (const photo of photos) {
        try {
          URL.revokeObjectURL(photo.previewUrl);
        } catch {
          // ignore
        }
      }
    };
    // We intentionally read `photos` once at unmount; per-add revokes
    // happen inline in handleRemove.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

      const nextPhotos: CapturedPhoto[] = Array.from(files).map((file, index) => ({
        id: `photo-${Date.now()}-${index}-${file.name}`,
        filename: file.name,
        sizeBytes: file.size,
        mimeType: file.type,
        previewUrl: URL.createObjectURL(file),
        gpsLat: lat,
        gpsLng: lng,
        timestamp: stamp,
        file,
      }));

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
      <input
        ref={fileInputRef}
        data-testid="photo-capture-input"
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
          {photos.map((photo) => (
            <Col xs={24} sm={12} key={photo.id}>
              <Card
                size="small"
                styles={{ body: { padding: SPACING.md } }}
              >
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
                      aria-label={`ปรับละติจูดภาพ ${photo.filename} (Adjust latitude)`}
                      value={photo.gpsLat}
                      step={0.0001}
                      onChange={(next) => handleManualLat(photo.id, next as number | null)}
                      style={{ width: '100%' }}
                    />
                  </Col>
                  <Col span={12}>
                    <InputNumber
                      aria-label={`ปรับลองจิจูดภาพ ${photo.filename} (Adjust longitude)`}
                      value={photo.gpsLng}
                      step={0.0001}
                      onChange={(next) => handleManualLng(photo.id, next as number | null)}
                      style={{ width: '100%' }}
                    />
                  </Col>
                </Row>
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
          ))}
        </Row>
      )}
    </div>
  );
}
