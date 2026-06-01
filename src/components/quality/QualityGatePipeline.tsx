'use client';

import { Alert, Button, Space, Tooltip, message } from 'antd';
import {
  CheckCircleOutlined,
  WarningOutlined,
  LockOutlined,
} from '@ant-design/icons';

import { announce } from '@/components/a11y';
import { useTransitionQualityGate } from '@/hooks/useQuality';
import { formatThaiDateShort } from '@/lib/date-utils';
import { legalNextGateStates } from '@/lib/rid/quality-gate-state-machine';
import { COLORS } from '@/theme/antd-theme';
import type { GateStatus, QualityGate } from '@/types/quality';

interface QualityGatePipelineProps {
  gates: QualityGate[];
  /**
   * Project id is required to call the transition mutation. When omitted
   * the pipeline renders read-only (no per-gate action buttons) — keeps
   * the surface backwards-compatible with consumers (e.g. the project
   * detail page summary) that don't want the management controls.
   */
  projectId?: string;
  /**
   * When false the per-gate action buttons are hidden even if `projectId`
   * is supplied. Use this to gate on action-level authz from the page.
   */
  canManage?: boolean;
}

const STATUS_COLORS: Record<string, string> = {
  passed: COLORS.success,
  conditional: COLORS.warning,
  pending: COLORS.neutralGray,
};

const NEXT_STATE_LABELS: Record<GateStatus, { th: string; en: string }> = {
  passed: { th: 'ผ่าน', en: 'Pass' },
  conditional: { th: 'มีเงื่อนไข', en: 'Conditional' },
  pending: { th: 'รอตรวจ', en: 'Pending' },
};

function GateIcon({ status }: { status: string }) {
  if (status === 'passed') {
    return <CheckCircleOutlined style={{ fontSize: 22, color: COLORS.white }} />;
  }
  if (status === 'conditional') {
    return <WarningOutlined style={{ fontSize: 22, color: COLORS.white }} />;
  }
  return (
    <div
      style={{
        width: 18,
        height: 18,
        borderRadius: '50%',
        border: `2px solid ${COLORS.textDisabled}`,
        backgroundColor: 'transparent',
      }}
    />
  );
}

export function QualityGatePipeline({
  gates,
  projectId,
  canManage = false,
}: QualityGatePipelineProps) {
  const transitionMutation = useTransitionQualityGate(projectId);
  const transitionsEnabled = Boolean(projectId) && canManage;

  const conditionalGate = gates.find((g) => g.status === 'conditional');
  const warningCount = conditionalGate?.checklist?.filter(
    (c) => c.status === 'warning',
  ).length ?? 0;
  const totalChecklist = conditionalGate?.checklist?.length ?? 0;

  const handleTransition = async (gate: QualityGate, toState: GateStatus) => {
    if (!projectId) return;
    try {
      await transitionMutation.mutateAsync({ gateId: gate.id, toState });
      const label = NEXT_STATE_LABELS[toState];
      message.success(`บันทึก Gate ${gate.number} แล้ว (${label.th})`);
      announce(`บันทึก Gate ${gate.number} เป็นสถานะ ${label.th} (${label.en}) เรียบร้อย`);
    } catch (error) {
      const detail = error instanceof Error ? error.message : 'ไม่สามารถเปลี่ยนสถานะได้';
      message.error(detail);
      announce(`เกิดข้อผิดพลาด: ${detail}`, 'assertive');
    }
  };

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
          const color = STATUS_COLORS[gate.status] ?? COLORS.neutralGray;
          const isLast = index === gates.length - 1;
          const nextGate = !isLast ? gates[index + 1] : null;
          const lineColor =
            gate.status === 'passed' || gate.status === 'conditional'
              ? COLORS.success
              : COLORS.neutralGray;
          // If current gate is conditional, the line after it should be gray
          const segmentColor =
            gate.status === 'passed' ? lineColor : COLORS.neutralGray;
          const nextStates = legalNextGateStates(gate.status);

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
                        ? `2px dashed ${COLORS.textDisabled}`
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
                    color: COLORS.textMuted,
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
                      color: COLORS.textMuted,
                      marginTop: 2,
                    }}
                  >
                    {formatThaiDateShort(gate.date)}
                  </div>
                )}

                {/* PR-PRQM-K — per-gate transition buttons. Rendered only
                    when the consumer page opts in via `projectId` +
                    `canManage`, and only when the gate has at least one
                    legal next state. */}
                {transitionsEnabled && nextStates.length > 0 && (
                  <Space
                    direction="vertical"
                    size={4}
                    style={{
                      marginTop: 8,
                      width: '100%',
                      alignItems: 'center',
                    }}
                  >
                    {nextStates.map((toState) => {
                      const label = NEXT_STATE_LABELS[toState];
                      const buttonLabel = `${label.th} (${label.en})`;
                      return (
                        <Tooltip
                          key={toState}
                          title={`เปลี่ยน Gate ${gate.number} เป็น "${label.th}"`}
                        >
                          <Button
                            size="small"
                            type={toState === 'passed' ? 'primary' : 'default'}
                            loading={transitionMutation.isPending}
                            onClick={() => {
                              void handleTransition(gate, toState);
                            }}
                            aria-label={`Gate ${gate.number}: ${buttonLabel}`}
                            style={{ fontSize: 11, padding: '0 8px' }}
                          >
                            {label.th}
                          </Button>
                        </Tooltip>
                      );
                    })}
                  </Space>
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
                  backgroundColor: COLORS.neutralGray,
                  borderColor: COLORS.neutralGray,
                  color: COLORS.textMuted,
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
