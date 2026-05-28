'use client';

import { Popover, Typography } from 'antd';
import { InfoCircleOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';

import { CONTRACTING_MODEL_LABELS, DELIVERY_METHOD_LABELS, PROJECT_TYPE_LABELS } from '@/types/project';
import type { ProjectType } from '@/types/project';
import type { ContractingModel, DeliveryMethod } from '@/types/rid/vocabulary';
import { COLORS } from '@/theme/antd-theme';

const { Text } = Typography;

/* ---------- milestone row type ---------- */
export interface MilestoneRow {
  key: number;
  milestone: number;
  amount: number;
  percentage: number;
  deliverable: string;
}

export interface ProgressMethodInfo {
  value: 'weighting' | 'physical' | 'evm';
  title: string;
  description: string;
  bestFor: string;
}

export interface DraftFormValues {
  code?: string;
  name?: string;
  type?: ProjectType;
  deliveryMethod?: DeliveryMethod;
  contractingModel?: ContractingModel | null;
  objectives?: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  budget?: number;
  budgetSource?: string;
  progressMethod?: ProgressMethodInfo['value'];
}

export interface DraftPayload {
  values: DraftFormValues;
  milestones: MilestoneRow[];
  savedAt: string;
}

export interface SubmittedFormValues {
  code?: string;
  name: string;
  type: ProjectType;
  deliveryMethod: DeliveryMethod;
  contractingModel?: ContractingModel | null;
  objectives: string;
  description?: string;
  startDate: dayjs.Dayjs;
  endDate: dayjs.Dayjs;
  budget: number;
  budgetSource?: string;
  progressMethod: ProgressMethodInfo['value'];
}

export const TOTAL_BUDGET = 12_500_000;
export const DRAFT_STORAGE_KEY = 'nsm-pqm:new-project-draft';

export const DEFAULT_MILESTONES: MilestoneRow[] = [
  { key: 1, milestone: 1, amount: 1_875_000, percentage: 15, deliverable: 'ส่งมอบงานงวด 1: แบบรายละเอียด (Detail Design)' },
  { key: 2, milestone: 2, amount: 4_375_000, percentage: 35, deliverable: 'ส่งมอบงานงวด 2: งานโครงสร้างหลัก' },
  { key: 3, milestone: 3, amount: 4_375_000, percentage: 35, deliverable: 'ส่งมอบงานงวด 3: งานระบบและตกแต่ง' },
  { key: 4, milestone: 4, amount: 1_875_000, percentage: 15, deliverable: 'ส่งมอบงานงวด 4: ทดสอบและส่งมอบ' },
];

/* ---------- project type select options ---------- */
export const projectTypeOptions = (Object.keys(PROJECT_TYPE_LABELS) as ProjectType[]).map((key) => ({
  value: key,
  label: `${PROJECT_TYPE_LABELS[key].th} (${PROJECT_TYPE_LABELS[key].en})`,
}));

export const deliveryMethodOptions = (Object.keys(DELIVERY_METHOD_LABELS) as DeliveryMethod[]).map((key) => ({
  value: key,
  label: `${DELIVERY_METHOD_LABELS[key].th} (${DELIVERY_METHOD_LABELS[key].en})`,
}));

export const contractingModelOptions = (Object.keys(CONTRACTING_MODEL_LABELS) as ContractingModel[]).map((key) => ({
  value: key,
  label: `${CONTRACTING_MODEL_LABELS[key].th} (${CONTRACTING_MODEL_LABELS[key].en})`,
}));

export const PROGRESS_METHOD_OPTIONS: ProgressMethodInfo[] = [
  {
    value: 'weighting',
    title: 'Weighting Method',
    description: 'กำหนดน้ำหนักของแต่ละงวดหรือกิจกรรม แล้วคำนวณความก้าวหน้าตาม % น้ำหนักที่ส่งมอบแล้ว',
    bestFor: 'เหมาะกับโครงการที่แบ่งงวดชัดเจนและมีสัดส่วนมูลค่างานแน่นอน',
  },
  {
    value: 'physical',
    title: 'Physical Progress',
    description: 'วัดจากผลงานที่เกิดขึ้นจริงหน้างาน เช่น ปริมาณงานก่อสร้าง งานติดตั้ง หรือจำนวนหน่วยที่เสร็จแล้ว',
    bestFor: 'เหมาะกับงานก่อสร้างหรืองานติดตั้งที่ตรวจนับผลงานจริงได้',
  },
  {
    value: 'evm',
    title: 'Earned Value Management (EVM)',
    description: 'ใช้มูลค่างานที่ทำได้จริงเทียบกับแผนและต้นทุน เพื่อดูทั้งความก้าวหน้า เวลา และประสิทธิภาพการใช้เงิน',
    bestFor: 'เหมาะกับโครงการที่ต้องติดตามทั้ง schedule และ cost อย่างใกล้ชิด',
  },
];

export function renderProgressMethodLabel(option: ProgressMethodInfo) {
  return (
    <Popover
      trigger="hover"
      placement="rightTop"
      content={(
        <div style={{ maxWidth: 320 }}>
          <Text strong>{option.title}</Text>
          <div style={{ marginTop: 8 }}>
            <Text>{option.description}</Text>
          </div>
          <div style={{ marginTop: 8 }}>
            <Text strong style={{ fontSize: 12 }}>
              เหมาะกับ:
            </Text>{' '}
            <Text style={{ fontSize: 12 }}>{option.bestFor}</Text>
          </div>
        </div>
      )}
    >
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
        <span>{option.title}</span>
        <InfoCircleOutlined style={{ color: COLORS.info, fontSize: 14 }} />
      </span>
    </Popover>
  );
}

export function roundToCurrency(value: number) {
  return Math.round(value);
}

export function roundToPercentage(value: number) {
  return Math.round(value * 100) / 100;
}

export function formatPercentage(value: number) {
  if (Number.isInteger(value)) {
    return value.toString();
  }

  return value.toFixed(2).replace(/\.?0+$/, '');
}

export function recalculatePercentagesFromAmounts(rows: MilestoneRow[]) {
  const total = rows.reduce((sum, row) => sum + row.amount, 0);

  if (total <= 0) {
    return rows.map((row) => ({ ...row, percentage: 0 }));
  }

  let runningPercentage = 0;

  return rows.map((row, index) => {
    if (index === rows.length - 1) {
      return {
        ...row,
        percentage: roundToPercentage(Math.max(0, 100 - runningPercentage)),
      };
    }

    const percentage = roundToPercentage((row.amount / total) * 100);
    runningPercentage = roundToPercentage(runningPercentage + percentage);

    return {
      ...row,
      percentage,
    };
  });
}

export function serializeDraftValues(values: DraftFormValues): DraftFormValues {
  return {
    ...values,
    startDate: values.startDate ? dayjs(values.startDate).toISOString() : undefined,
    endDate: values.endDate ? dayjs(values.endDate).toISOString() : undefined,
  };
}

export function deserializeDraftValues(values: DraftFormValues): DraftFormValues {
  return {
    ...values,
    startDate: values.startDate,
    endDate: values.endDate,
  };
}
