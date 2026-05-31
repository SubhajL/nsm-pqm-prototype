'use client';

import { Alert, Typography } from 'antd';
import { WarningOutlined } from '@ant-design/icons';

import { COLORS } from '@/theme/antd-theme';
import type { WorkflowStatus } from '@/types/quality';

const { Text } = Typography;

/**
 * PR-B2 — collapses the inspection page's stack of up to four alert
 * banners (UX gap G13 "alert fatigue") into a single, priority-ordered
 * banner. Priority:
 *
 *   1. **Fail items block sign-off** — user has to act before any
 *      workflow progression. Shown red, with the failing-item list.
 *   2. **Auto-NCR** — system has created an NCR Issue; project cannot
 *      close until resolved. Shown amber.
 *   3. **Hold Point** — the default state when no failure / no auto-NCR
 *      applies; work is on hold pending engineer approval. Shown red.
 *
 * The "Quick Tip" explainer for the H/W/RS legend that previously sat
 * as a fourth always-on info Alert is moved into the ChecklistCard's
 * H-column tooltip — explanatory text belongs next to the thing it
 * explains, not as a top-of-page banner.
 */
export interface InspectionAlertBannerProps {
  hasFailItems: boolean;
  failCount: number;
  failItems: string;
  workflowStatus: WorkflowStatus;
  autoNCR: boolean;
}

export function InspectionAlertBanner({
  hasFailItems,
  failCount,
  failItems,
  workflowStatus,
  autoNCR,
}: InspectionAlertBannerProps) {
  if (hasFailItems && workflowStatus !== 'signed') {
    return (
      <Alert
        type="error"
        showIcon
        icon={<WarningOutlined />}
        message={
          <Text strong style={{ color: COLORS.error }}>
            ไม่สามารถยืนยันหรือลงนามได้ — ยังมี {failCount} รายการที่ไม่ผ่าน
            ({failItems})
          </Text>
        }
        description="วิศวกรต้องแก้ไขรายการที่ไม่ผ่านให้เป็นผ่านก่อน จึงจะดำเนินการยืนยันผลตรวจและลงนามได้ (Engineer must resolve failed items before confirmation / sign-off)"
        style={{ borderColor: COLORS.error }}
      />
    );
  }

  if (autoNCR) {
    return (
      <Alert
        type="warning"
        showIcon
        icon={<WarningOutlined />}
        message={
          <Text strong>
            Auto NCR — ระบบสร้าง Issue (NCR) อัตโนมัติ
          </Text>
        }
        description="เมื่อ QC ไม่ผ่าน ระบบจะสร้าง Issue (NCR) อัตโนมัติ และไม่สามารถปิดโครงการได้จนกว่าจะแก้ไข (Auto NCR: Project cannot be closed until resolved)"
        style={{ border: `1px solid ${COLORS.warning}` }}
      />
    );
  }

  return (
    <Alert
      type="error"
      showIcon
      icon={<WarningOutlined />}
      message={
        <Text strong style={{ color: COLORS.error }}>
          Hold Point — งานต้องหยุด รอวิศวกรอนุมัติ (Work must stop until
          engineer approval)
        </Text>
      }
      style={{ borderColor: COLORS.error }}
    />
  );
}
