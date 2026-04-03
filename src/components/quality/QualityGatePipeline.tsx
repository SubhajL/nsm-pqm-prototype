'use client';

import { Alert, Button } from 'antd';
import {
  CheckCircleOutlined,
  WarningOutlined,
  LockOutlined,
} from '@ant-design/icons';
import { formatThaiDateShort } from '@/lib/date-utils';
import { COLORS } from '@/theme/antd-theme';
import type { QualityGate } from '@/types/quality';

interface QualityGatePipelineProps {
  gates: QualityGate[];
}

const STATUS_COLORS: Record<string, string> = {
  passed: COLORS.success,
  conditional: COLORS.warning,
  pending: '#d9d9d9',
};

function GateIcon({ status }: { status: string }) {
  if (status === 'passed') {
    return <CheckCircleOutlined style={{ fontSize: 22, color: '#fff' }} />;
  }
  if (status === 'conditional') {
    return <WarningOutlined style={{ fontSize: 22, color: '#fff' }} />;
  }
  return (
    <div
      style={{
        width: 18,
        height: 18,
        borderRadius: '50%',
        border: '2px solid #bfbfbf',
        backgroundColor: 'transparent',
      }}
    />
  );
}

export function QualityGatePipeline({ gates }: QualityGatePipelineProps) {
  const conditionalGate = gates.find((g) => g.status === 'conditional');
  const warningCount = conditionalGate?.checklist?.filter(
    (c) => c.status === 'warning',
  ).length ?? 0;
  const totalChecklist = conditionalGate?.checklist?.length ?? 0;

  return (
    <div>
      {/* Pipeline */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          overflowX: 'auto',
          padding: '16px 0',
          gap: 0,
        }}
      >
        {gates.map((gate, index) => {
          const color = STATUS_COLORS[gate.status] ?? '#d9d9d9';
          const isLast = index === gates.length - 1;
          const nextGate = !isLast ? gates[index + 1] : null;
          const lineColor =
            gate.status === 'passed' || gate.status === 'conditional'
              ? COLORS.success
              : '#d9d9d9';
          // If current gate is conditional, the line after it should be gray
          const segmentColor =
            gate.status === 'passed' ? lineColor : '#d9d9d9';

          return (
            <div
              key={gate.id}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                flex: isLast ? '0 0 auto' : '1 1 0',
                minWidth: 0,
              }}
            >
              {/* Gate node */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  minWidth: 70,
                  flexShrink: 0,
                }}
              >
                <div
                  className={gate.status === 'conditional' ? 'pulse-amber' : undefined}
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: '50%',
                    backgroundColor: color,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border:
                      gate.status === 'pending'
                        ? '2px dashed #bfbfbf'
                        : `2px solid ${color}`,
                    position: 'relative',
                  }}
                >
                  <GateIcon status={gate.status} />
                </div>
                <div
                  style={{
                    marginTop: 8,
                    textAlign: 'center',
                    fontSize: 12,
                    fontWeight: 600,
                    color: COLORS.textDark,
                    lineHeight: 1.3,
                  }}
                >
                  G{gate.number}
                </div>
                <div
                  style={{
                    textAlign: 'center',
                    fontSize: 11,
                    color: '#8c8c8c',
                    lineHeight: 1.3,
                    maxWidth: 80,
                  }}
                >
                  {gate.name}
                </div>
                {gate.date && (
                  <div
                    style={{
                      textAlign: 'center',
                      fontSize: 10,
                      color: '#8c8c8c',
                      marginTop: 2,
                    }}
                  >
                    {formatThaiDateShort(gate.date)}
                  </div>
                )}
              </div>

              {/* Connecting line */}
              {!isLast && nextGate && (
                <div
                  style={{
                    flex: 1,
                    height: 3,
                    backgroundColor: segmentColor,
                    marginTop: 25,
                    minWidth: 20,
                    borderRadius: 2,
                  }}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Conditional gate warning */}
      {conditionalGate && (
        <Alert
          type="warning"
          showIcon
          style={{ marginTop: 16 }}
          message="Quality Checklist ต้องผ่าน 100% จึงจะเลื่อนไปยัง Gate ถัดไป (Must be 100% Pass to advance)"
          description={
            <div style={{ marginTop: 8 }}>
              <div style={{ marginBottom: 8 }}>
                รายการที่ต้องตรวจ: {totalChecklist} | สถานะ: {warningCount}{' '}
                เตือน (WARNING)
              </div>
              <Button
                type="primary"
                disabled
                icon={<LockOutlined />}
                style={{
                  backgroundColor: '#d9d9d9',
                  borderColor: '#d9d9d9',
                  color: '#8c8c8c',
                }}
              >
                ดำเนินการ Gate 5
              </Button>
            </div>
          }
        />
      )}
    </div>
  );
}
