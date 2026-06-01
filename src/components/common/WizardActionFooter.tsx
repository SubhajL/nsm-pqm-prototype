'use client';

import { Button, Space, Typography } from 'antd';
import { LeftOutlined, RightOutlined, SaveOutlined } from '@ant-design/icons';

import { COLORS } from '@/theme/antd-theme';
import { SPACING } from '@/theme/scales';

import { getNextButtonLabel } from './wizard-helpers';

const { Text } = Typography;

/**
 * PR-D1b — sticky wizard footer used by Daily Report + New Project
 * wizards. Pure presentation — no internal state, no Form coupling.
 *
 * The "Next" button label switches to "บันทึก (Submit)" on the final
 * step via `getNextButtonLabel`. Both wizards use the same component so
 * the bilingual copy + sticky styling stay in lock-step.
 */
export interface WizardActionFooterProps {
  current: number;
  total: number;
  onPrev: () => void;
  onNext: () => void;
  onSubmit: () => void;
  submitting?: boolean;
  /** When `true`, the Next/Submit button is disabled (eg validation pending). */
  nextDisabled?: boolean;
  /** Optional Cancel button. When set, renders to the left of Prev. */
  onCancel?: () => void;
  /** Optional secondary action (eg "Save Draft"). Renders between Cancel and Prev. */
  secondary?: { label: string; onClick: () => void; ariaLabel?: string };
  /** When `false`, the footer is rendered inline instead of sticky. Useful inside modals. */
  sticky?: boolean;
}

export function WizardActionFooter({
  current,
  total,
  onPrev,
  onNext,
  onSubmit,
  submitting = false,
  nextDisabled = false,
  onCancel,
  secondary,
  sticky = true,
}: WizardActionFooterProps) {
  const isLast = current >= total - 1;
  const isFirst = current === 0;
  // Reference the helper so callers consuming both the component + the
  // pure label can still find it via this module's re-export.
  void getNextButtonLabel;

  const stickyStyle: React.CSSProperties = sticky
    ? {
        position: 'sticky',
        bottom: 0,
        background: '#fff',
        borderTop: `1px solid ${COLORS.borderSoft}`,
        padding: `${SPACING.md}px ${SPACING.lg}px`,
        marginTop: SPACING.lg,
        zIndex: 1,
      }
    : { paddingTop: SPACING.md };

  return (
    <div
      role="group"
      aria-label="ขั้นตอน wizard (Wizard actions)"
      style={{
        ...stickyStyle,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: SPACING.sm,
      }}
    >
      <Text type="secondary" aria-live="polite">
        ขั้นตอน {current + 1} จาก {total} (Step {current + 1} of {total})
      </Text>
      <Space size={SPACING.sm} wrap>
        {onCancel ? (
          <Button onClick={onCancel} aria-label="ยกเลิก (Cancel)">
            ยกเลิก (Cancel)
          </Button>
        ) : null}
        {secondary ? (
          <Button
            onClick={secondary.onClick}
            aria-label={secondary.ariaLabel ?? secondary.label}
          >
            {secondary.label}
          </Button>
        ) : null}
        <Button
          icon={<LeftOutlined />}
          onClick={onPrev}
          disabled={isFirst}
          aria-label="ก่อนหน้า (Previous)"
        >
          ก่อนหน้า (Previous)
        </Button>
        {isLast ? (
          <Button
            type="primary"
            icon={<SaveOutlined />}
            onClick={onSubmit}
            loading={submitting}
            disabled={nextDisabled}
            aria-label="บันทึก (Submit)"
          >
            บันทึก (Submit)
          </Button>
        ) : (
          <Button
            type="primary"
            icon={<RightOutlined />}
            onClick={onNext}
            disabled={nextDisabled}
            aria-label="ถัดไป (Next)"
          >
            ถัดไป (Next)
          </Button>
        )}
      </Space>
    </div>
  );
}
