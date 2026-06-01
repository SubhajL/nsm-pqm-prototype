'use client';

import { useEffect, useRef, useState } from 'react';
import { Button, Card, Form, Input, Space, Tag, Typography } from 'antd';
import { ClearOutlined } from '@ant-design/icons';

import {
  blankSignature,
  clearSignature,
  markSignatureSigned,
  type SignatureState,
} from '@/components/common';
import { announce } from '@/components/a11y';
import { COLORS } from '@/theme/antd-theme';
import { SPACING } from '@/theme/scales';
import { formatThaiDate } from '@/lib/date-utils';

const { Text } = Typography;

export interface SignatureCaptureFieldProps {
  value?: SignatureState;
  onChange?: (next: SignatureState) => void;
  /** Bilingual label rendered above the pad (eg "ผู้จัดทำ (Reporter)"). */
  label: string;
  /** Bilingual aria-label for the name input. */
  nameInputLabel: string;
  /** Optional canvas height. Default 120px. */
  height?: number;
}

/**
 * PR-D1b — canvas-based signature pad. The pad records to a hidden
 * `SignatureState { name, signed, timestamp }`; the canvas itself is
 * presentational and is NOT serialized into form state (mock prototype).
 *
 * The component is controlled — `value`/`onChange` are the source of
 * truth. The internal canvas drawing is reset whenever the parent
 * sets `value` back to a blank signature.
 */
export function SignatureCaptureField({
  value,
  onChange,
  label,
  nameInputLabel,
  height = 120,
}: SignatureCaptureFieldProps) {
  const current = value ?? blankSignature();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [drawing, setDrawing] = useState(false);

  const emit = (next: SignatureState) => {
    onChange?.(next);
  };

  // Clear the canvas pixels whenever the parent resets signed=false.
  useEffect(() => {
    if (!current.signed) {
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
  }, [current.signed]);

  const getCtx = (): CanvasRenderingContext2D | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    return canvas.getContext('2d');
  };

  const positionFor = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    event.preventDefault();
    const ctx = getCtx();
    const pos = positionFor(event);
    if (!ctx || !pos) return;
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    ctx.lineWidth = 2;
    ctx.strokeStyle = COLORS.primary;
    setDrawing(true);
    canvasRef.current?.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing) return;
    const ctx = getCtx();
    const pos = positionFor(event);
    if (!ctx || !pos) return;
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing) return;
    setDrawing(false);
    canvasRef.current?.releasePointerCapture(event.pointerId);
    const next = markSignatureSigned(current, new Date());
    emit(next);
    announce(`ลงนาม${label}แล้ว (${label} signed)`);
  };

  const handleClear = () => {
    const ctx = getCtx();
    if (ctx && canvasRef.current) {
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }
    emit(clearSignature(current));
    announce(`ล้าง${label}แล้ว (${label} cleared)`);
  };

  const handleNameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    emit({ ...current, name: event.target.value });
  };

  return (
    <Card size="small" styles={{ body: { padding: SPACING.md } }}>
      <Space direction="vertical" size={SPACING.sm} style={{ width: '100%' }}>
        <Text strong>{label}</Text>
        <Form.Item label={nameInputLabel} style={{ marginBottom: 0 }}>
          <Input
            value={current.name}
            onChange={handleNameChange}
            aria-label={nameInputLabel}
            placeholder="ชื่อ-สกุล (Full name)"
          />
        </Form.Item>
        <canvas
          ref={canvasRef}
          width={400}
          height={height}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          style={{
            width: '100%',
            height,
            border: `1px dashed ${COLORS.borderSoft}`,
            borderRadius: 4,
            touchAction: 'none',
            cursor: 'crosshair',
            background: COLORS.surfaceMuted,
          }}
          aria-label={`พื้นที่ลงนาม${label} (Signature pad)`}
          role="img"
        />
        <Space size={SPACING.sm}>
          <Button
            icon={<ClearOutlined />}
            onClick={handleClear}
            aria-label={`ล้าง${label} (Clear)`}
          >
            ล้าง (Clear)
          </Button>
          {current.signed && current.timestamp ? (
            <Tag color="green">
              ลงนามเมื่อ {formatThaiDate(current.timestamp)} (Signed)
            </Tag>
          ) : (
            <Tag>ยังไม่ลงนาม (Not signed)</Tag>
          )}
        </Space>
      </Space>
    </Card>
  );
}
