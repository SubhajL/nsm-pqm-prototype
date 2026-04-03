'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import dayjs from 'dayjs';
import type { Dayjs } from 'dayjs';
import {
  Alert,
  Popover,
  Card,
  Form,
  Input,
  Select,
  DatePicker,
  InputNumber,
  Button,
  Table,
  Divider,
  Row,
  Col,
  Avatar,
  Tag,
  Typography,
  Space,
  message,
} from 'antd';
import {
  ExperimentOutlined,
  InfoCircleOutlined,
  PlusOutlined,
  UserAddOutlined,
  SaveOutlined,
  SendOutlined,
} from '@ant-design/icons';
import { PROJECT_EXECUTION_MODEL_LABELS, PROJECT_TYPE_LABELS } from '@/types/project';
import type { Project, ProjectExecutionModel, ProjectType } from '@/types/project';
import { useCreateProject } from '@/hooks/useProjects';
import { useAppStore } from '@/stores/useAppStore';
import { useAuthStore } from '@/stores/useAuthStore';
import { COLORS } from '@/theme/antd-theme';
import { formatBaht } from '@/lib/date-utils';
import { canCreateProject as canCreateProjectForRole } from '@/lib/auth';

const { Title, Text } = Typography;
const { TextArea } = Input;

/* ---------- milestone row type ---------- */
interface MilestoneRow {
  key: number;
  milestone: number;
  amount: number;
  percentage: number;
  deliverable: string;
}

interface ProgressMethodInfo {
  value: 'weighting' | 'physical' | 'evm';
  title: string;
  description: string;
  bestFor: string;
}

interface DraftFormValues {
  code?: string;
  name?: string;
  type?: ProjectType;
  executionModel?: ProjectExecutionModel;
  objectives?: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  budget?: number;
  budgetSource?: string;
  progressMethod?: ProgressMethodInfo['value'];
}

interface DraftPayload {
  values: DraftFormValues;
  milestones: MilestoneRow[];
  savedAt: string;
}

interface SubmittedFormValues {
  code?: string;
  name: string;
  type: ProjectType;
  executionModel: ProjectExecutionModel;
  objectives: string;
  description?: string;
  startDate: Dayjs;
  endDate: Dayjs;
  budget: number;
  budgetSource?: string;
  progressMethod: ProgressMethodInfo['value'];
}

const TOTAL_BUDGET = 12_500_000;
const DRAFT_STORAGE_KEY = 'nsm-pqm:new-project-draft';

const DEFAULT_MILESTONES: MilestoneRow[] = [
  { key: 1, milestone: 1, amount: 1_875_000, percentage: 15, deliverable: 'ส่งมอบงานงวด 1: แบบรายละเอียด (Detail Design)' },
  { key: 2, milestone: 2, amount: 4_375_000, percentage: 35, deliverable: 'ส่งมอบงานงวด 2: งานโครงสร้างหลัก' },
  { key: 3, milestone: 3, amount: 4_375_000, percentage: 35, deliverable: 'ส่งมอบงานงวด 3: งานระบบและตกแต่ง' },
  { key: 4, milestone: 4, amount: 1_875_000, percentage: 15, deliverable: 'ส่งมอบงานงวด 4: ทดสอบและส่งมอบ' },
];

/* ---------- project type select options ---------- */
const projectTypeOptions = (Object.keys(PROJECT_TYPE_LABELS) as ProjectType[]).map((key) => ({
  value: key,
  label: `${PROJECT_TYPE_LABELS[key].th} (${PROJECT_TYPE_LABELS[key].en})`,
}));

const projectExecutionModelOptions = (Object.keys(PROJECT_EXECUTION_MODEL_LABELS) as ProjectExecutionModel[]).map((key) => ({
  value: key,
  label: `${PROJECT_EXECUTION_MODEL_LABELS[key].th} (${PROJECT_EXECUTION_MODEL_LABELS[key].en})`,
}));

const PROGRESS_METHOD_OPTIONS: ProgressMethodInfo[] = [
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

function renderProgressMethodLabel(option: ProgressMethodInfo) {
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

function roundToCurrency(value: number) {
  return Math.round(value);
}

function roundToPercentage(value: number) {
  return Math.round(value * 100) / 100;
}

function formatPercentage(value: number) {
  if (Number.isInteger(value)) {
    return value.toString();
  }

  return value.toFixed(2).replace(/\.?0+$/, '');
}

function recalculatePercentagesFromAmounts(rows: MilestoneRow[]) {
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

function serializeDraftValues(values: DraftFormValues): DraftFormValues {
  return {
    ...values,
    startDate: values.startDate ? dayjs(values.startDate).toISOString() : undefined,
    endDate: values.endDate ? dayjs(values.endDate).toISOString() : undefined,
  };
}

function deserializeDraftValues(values: DraftFormValues): DraftFormValues {
  return {
    ...values,
    startDate: values.startDate,
    endDate: values.endDate,
  };
}

/* ========================================================================== */

export default function NewProjectPage() {
  const router = useRouter();
  const [form] = Form.useForm();
  const [milestones, setMilestones] = useState<MilestoneRow[]>(DEFAULT_MILESTONES);
  const [savedDraftAt, setSavedDraftAt] = useState<string | null>(null);
  const createProject = useCreateProject();
  const setCurrentProject = useAppStore((s) => s.setCurrentProject);
  const currentUser = useAuthStore((s) => s.currentUser);
  const progressMethod = Form.useWatch('progressMethod', form) as ProgressMethodInfo['value'] | undefined;
  const budgetValue = Form.useWatch('budget', form);
  const currentBudget =
    typeof budgetValue === 'number' && Number.isFinite(budgetValue) ? budgetValue : TOTAL_BUDGET;
  const draftStorageKey = currentUser ? `${DRAFT_STORAGE_KEY}:${currentUser.id}` : null;

  useEffect(() => {
    if (currentUser && !canCreateProjectForRole(currentUser.role)) {
      message.warning('มีเฉพาะผู้จัดการโครงการหรือผู้ดูแลระบบเท่านั้นที่สร้างโครงการใหม่ได้');
      router.replace('/dashboard');
    }
  }, [currentUser, router]);

  useEffect(() => {
    if (!draftStorageKey) {
      setSavedDraftAt(null);
      return;
    }

    const rawDraft = window.localStorage.getItem(draftStorageKey);

    if (!rawDraft) {
      setSavedDraftAt(null);
      return;
    }

    try {
      const parsedDraft = JSON.parse(rawDraft) as DraftPayload;
      if (parsedDraft.savedAt) {
        setSavedDraftAt(parsedDraft.savedAt);
      }
    } catch {
      window.localStorage.removeItem(draftStorageKey);
      setSavedDraftAt(null);
    }
  }, [draftStorageKey]);

  /* ---------- milestone editing ---------- */
  const handleMilestoneChange = (key: number, field: keyof MilestoneRow, value: string | number | null) => {
    setMilestones((prev) => {
      if (field === 'amount') {
        const nextRows = prev.map((row) =>
          row.key === key ? { ...row, amount: Number(value ?? 0) } : row,
        );
        return recalculatePercentagesFromAmounts(nextRows);
      }

      if (field === 'percentage') {
        const nextPercentage = Number(value ?? 0);
        return prev.map((row) =>
          row.key === key
            ? {
                ...row,
                percentage: nextPercentage,
                amount: roundToCurrency((currentBudget * nextPercentage) / 100),
              }
            : row,
        );
      }

      return prev.map((row) =>
        row.key === key ? { ...row, [field]: value ?? '' } : row,
      );
    });
  };

  const addMilestone = () => {
    const next = milestones.length + 1;
    setMilestones((prev) => [
      ...prev,
      { key: next, milestone: next, amount: 0, percentage: 0, deliverable: '' },
    ]);
    message.info('เพิ่มงวดงานใหม่แล้ว');
  };

  const totalAmount = milestones.reduce((s, r) => s + r.amount, 0);
  const totalPercentage = milestones.reduce((s, r) => s + r.percentage, 0);
  const defaultTeamMembers = currentUser
    ? [
        {
          name: currentUser.name,
          role: 'ผู้จัดการโครงการ (Project Manager)',
          confirmed: true,
          avatar: currentUser.name.slice(0, 2),
        },
      ]
    : [];

  /* ---------- form submission ---------- */
  const handleSubmit = async () => {
    if (!currentUser) {
      message.error('ไม่พบข้อมูลผู้ใช้งาน กรุณาเข้าสู่ระบบใหม่');
      return;
    }

    if (!canCreateProjectForRole(currentUser.role)) {
      message.error('มีเฉพาะผู้จัดการโครงการหรือผู้ดูแลระบบเท่านั้นที่สร้างโครงการใหม่ได้');
      return;
    }

    try {
      const values = await form.validateFields() as SubmittedFormValues;
      const payload: Partial<Project> & {
        milestones: Array<{
          milestone: number;
          amount: number;
          percentage: number;
          deliverable: string;
        }>;
      } = {
        name: values.name,
        nameEn: values.name,
        type: values.type,
        executionModel: values.executionModel,
        status: 'planning',
        budget: values.budget,
        progress: 0,
        startDate: values.startDate.format('YYYY-MM-DD'),
        endDate: values.endDate.format('YYYY-MM-DD'),
        duration: values.endDate.diff(values.startDate, 'day') + 1,
        spiValue: 0,
        cpiValue: 0,
        managerId: currentUser.id,
        managerName: currentUser.name,
        departmentId: currentUser.departmentId,
        departmentName: currentUser.department,
        openIssues: 0,
        highRisks: 0,
        currentMilestone: 0,
        totalMilestones: milestones.length,
        milestones: milestones.map((row) => ({
          milestone: row.milestone,
          amount: row.amount,
          percentage: row.percentage,
          deliverable: row.deliverable,
        })),
      };
      const createdProject = await createProject.mutateAsync(payload);

      if (draftStorageKey) {
        window.localStorage.removeItem(draftStorageKey);
      }
      setSavedDraftAt(null);
      setCurrentProject(createdProject.id);
      message.success('สร้างโครงการสำเร็จ (Project created successfully)');
      router.push(`/projects/${createdProject.id}`);
    } catch (error) {
      if (error instanceof Error && error.message) {
        message.error(error.message);
        return;
      }
    }
  };

  const handleSaveDraft = () => {
    if (!draftStorageKey || !currentUser) {
      message.error('ไม่พบข้อมูลผู้ใช้งาน กรุณาเข้าสู่ระบบใหม่');
      return;
    }

    const values = form.getFieldsValue(true) as DraftFormValues;
    const payload: DraftPayload = {
      values: serializeDraftValues(values),
      milestones,
      savedAt: new Date().toISOString(),
    };

    window.localStorage.setItem(draftStorageKey, JSON.stringify(payload));
    setSavedDraftAt(payload.savedAt);
    message.success('บันทึกร่างแล้ว (Draft saved)');
  };

  const handleLoadDraft = () => {
    if (!draftStorageKey) {
      message.error('ไม่พบข้อมูลผู้ใช้งาน กรุณาเข้าสู่ระบบใหม่');
      return;
    }

    const rawDraft = window.localStorage.getItem(draftStorageKey);

    if (!rawDraft) {
      message.warning('ไม่พบร่างที่บันทึกไว้');
      return;
    }

    try {
      const parsedDraft = JSON.parse(rawDraft) as DraftPayload;
      const values = deserializeDraftValues(parsedDraft.values);

      form.setFieldsValue({
        ...values,
        startDate: values.startDate ? dayjs(values.startDate) : undefined,
        endDate: values.endDate ? dayjs(values.endDate) : undefined,
      });
      setMilestones(parsedDraft.milestones.length > 0 ? parsedDraft.milestones : DEFAULT_MILESTONES);
      setSavedDraftAt(parsedDraft.savedAt);
      message.success('โหลดร่างล่าสุดแล้ว (Draft restored)');
    } catch {
      window.localStorage.removeItem(draftStorageKey);
      setSavedDraftAt(null);
      message.error('ร่างไม่สมบูรณ์ จึงไม่สามารถโหลดได้');
    }
  };

  const handleDiscardDraft = () => {
    if (!draftStorageKey) {
      message.error('ไม่พบข้อมูลผู้ใช้งาน กรุณาเข้าสู่ระบบใหม่');
      return;
    }

    window.localStorage.removeItem(draftStorageKey);
    setSavedDraftAt(null);
    message.success('ลบร่างที่บันทึกไว้แล้ว');
  };

  /* ---------- milestone table columns ---------- */
  const milestoneColumns = [
    {
      title: 'งวด',
      dataIndex: 'milestone',
      key: 'milestone',
      width: 70,
      align: 'center' as const,
      render: (val: number) => <Text strong>#{val}</Text>,
    },
    {
      title: 'ค่าใช้จ่าย (บาท)',
      dataIndex: 'amount',
      key: 'amount',
      width: 200,
      render: (val: number, record: MilestoneRow) => (
        <InputNumber
          value={val}
          min={0}
          style={{ width: '100%' }}
          formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
          parser={(v) => Number(v?.replace(/,/g, '') || 0) as unknown as 0}
          onChange={(v) => handleMilestoneChange(record.key, 'amount', v)}
        />
      ),
    },
    {
      title: 'สัดส่วน %',
      dataIndex: 'percentage',
      key: 'percentage',
      width: 120,
      render: (val: number, record: MilestoneRow) => (
        <InputNumber
          value={val}
          min={0}
          max={100}
          style={{ width: '100%' }}
          addonAfter="%"
          onChange={(v) => handleMilestoneChange(record.key, 'percentage', v)}
        />
      ),
    },
    {
      title: 'สิ่งส่งมอบ (Deliverables)',
      dataIndex: 'deliverable',
      key: 'deliverable',
      render: (val: string, record: MilestoneRow) => (
        <Input
          value={val}
          onChange={(e) => handleMilestoneChange(record.key, 'deliverable', e.target.value)}
        />
      ),
    },
  ];

  const handleDemoFill = () => {
    form.setFieldsValue({
      name: 'โครงการปรับปรุงอาคารนิทรรศการ อาคาร C',
      type: 'construction' as ProjectType,
      executionModel: 'outsourced' as ProjectExecutionModel,
      objectives:
        'ปรับปรุงอาคารนิทรรศการ อาคาร C เพื่อรองรับนิทรรศการเทคโนโลยีอวกาศและดาราศาสตร์ รวมถึงงานโครงสร้าง ระบบ M&E งานตกแต่งภายใน และระบบมัลติมีเดีย',
      description:
        'โครงการก่อสร้างครบวงจร ตาม Scenario 1 (SSO → WBS → BOQ → Gantt → EVM) สำหรับสาธิตระบบ PQM',
      startDate: dayjs('2026-08-01'),
      endDate: dayjs('2027-01-31'),
      budget: 18500000,
      budgetSource: 'investment',
      progressMethod: 'evm',
    });
    setMilestones([
      { key: 1, milestone: 1, amount: 2775000, percentage: 15, deliverable: 'แบบรายละเอียด (Detail Design) + BOQ + แผนงาน' },
      { key: 2, milestone: 2, amount: 6475000, percentage: 35, deliverable: 'งานโครงสร้างหลัก + ระบบไฟฟ้า/สุขาภิบาล' },
      { key: 3, milestone: 3, amount: 6475000, percentage: 35, deliverable: 'งานตกแต่งภายใน + ระบบมัลติมีเดีย + ระบบ IT' },
      { key: 4, milestone: 4, amount: 2775000, percentage: 15, deliverable: 'ทดสอบระบบ + ตรวจรับ + ส่งมอบ' },
    ]);
    message.success('เติมข้อมูลตัวอย่าง Scenario 1 แล้ว');
  };

  return (
    <div>
      {/* ---------- page header ---------- */}
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <Title level={3} style={{ marginBottom: 4 }}>
            สร้างโครงการใหม่ (New Project)
          </Title>
          <Text type="secondary">
            หน้าแรก / โครงการทั้งหมด / สร้างโครงการใหม่
          </Text>
        </div>
        <Button
          icon={<ExperimentOutlined />}
          onClick={handleDemoFill}
          style={{ borderColor: COLORS.accentTeal, color: COLORS.accentTeal }}
        >
          Demo: Scenario 1 ก่อสร้างครบวงจร
        </Button>
      </div>

      {savedDraftAt && (
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
          message="พบร่างโครงการที่บันทึกไว้"
          description={`บันทึกล่าสุดเมื่อ ${dayjs(savedDraftAt).format('DD/MM/YYYY HH:mm')} สำหรับผู้ใช้ ${currentUser?.name ?? ''}`}
          action={(
            <Space>
              <Button size="small" onClick={handleLoadDraft}>
                โหลดร่างล่าสุด
              </Button>
              <Button size="small" danger onClick={handleDiscardDraft}>
                ลบร่าง
              </Button>
            </Space>
          )}
        />
      )}

      {/* ---------- main form card ---------- */}
      <Card
        style={{
          borderRadius: 8,
          boxShadow: '0 2px 10px rgba(0,0,0,0.08)',
        }}
      >
        <Form
          form={form}
          layout="vertical"
          requiredMark="optional"
          initialValues={{
            budget: TOTAL_BUDGET,
            executionModel: 'internal',
          }}
        >
          {/* ===== Section 1: Basic Info ===== */}
          <Divider orientation="left" orientationMargin={0}>
            <Text strong style={{ fontSize: 16 }}>
              ข้อมูลพื้นฐานโครงการ (Basic Information)
            </Text>
          </Divider>

          <Row gutter={24}>
            <Col xs={24} md={16}>
              <Form.Item
                label="ชื่อโครงการ (Project Name)"
                name="name"
                rules={[{ required: true, message: 'กรุณาระบุชื่อโครงการ' }]}
              >
                <Input placeholder="ระบุชื่อโครงการ" />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item label="รหัสโครงการ (Project Code)" name="code">
                <Input disabled addonBefore="Auto" placeholder="ระบบจะสร้างให้อัตโนมัติ" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={24}>
            <Col xs={24} md={12}>
              <Form.Item
                label="ประเภทโครงการ (Project Type)"
                name="type"
                rules={[{ required: true, message: 'กรุณาเลือกประเภทโครงการ' }]}
              >
                <Select
                  placeholder="เลือกประเภทโครงการ"
                  options={projectTypeOptions}
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                label="รูปแบบการดำเนินโครงการ (Execution Model)"
                name="executionModel"
                rules={[{ required: true, message: 'กรุณาเลือกรูปแบบการดำเนินโครงการ' }]}
              >
                <Select
                  placeholder="เลือกรูปแบบการดำเนินโครงการ"
                  options={projectExecutionModelOptions}
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            label="วัตถุประสงค์ (Objectives)"
            name="objectives"
            rules={[{ required: true, message: 'กรุณาระบุวัตถุประสงค์' }]}
          >
            <TextArea rows={3} placeholder="ระบุวัตถุประสงค์ของโครงการ" />
          </Form.Item>

          <Form.Item label="คำอธิบาย (Description)" name="description">
            <TextArea rows={3} placeholder="ระบุรายละเอียดเพิ่มเติม (ถ้ามี)" />
          </Form.Item>

          {/* ===== Section 2: Timeline & Budget ===== */}
          <Divider orientation="left" orientationMargin={0}>
            <Text strong style={{ fontSize: 16 }}>
              ระยะเวลาและงบประมาณ (Timeline & Budget)
            </Text>
          </Divider>

          <Row gutter={24}>
            <Col xs={24} md={12}>
              <Form.Item
                label="วันเริ่มต้น (Start Date)"
                name="startDate"
                rules={[{ required: true, message: 'กรุณาเลือกวันเริ่มต้น' }]}
              >
                <DatePicker
                  style={{ width: '100%' }}
                  format="DD/MM/YYYY"
                  placeholder="เลือกวันที่เริ่มต้น"
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                label="วันสิ้นสุด (End Date)"
                name="endDate"
                rules={[{ required: true, message: 'กรุณาเลือกวันสิ้นสุด' }]}
              >
                <DatePicker
                  style={{ width: '100%' }}
                  format="DD/MM/YYYY"
                  placeholder="เลือกวันที่สิ้นสุด"
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={24}>
            <Col xs={24} md={12}>
              <Form.Item
                label="งบประมาณ (Budget)"
                name="budget"
                rules={[{ required: true, message: 'กรุณาระบุงบประมาณ' }]}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  min={0}
                  addonAfter="บาท"
                  formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  parser={(v) => Number(v?.replace(/,/g, '') || 0) as unknown as 0}
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item label="แหล่งงบประมาณ (Budget Source)" name="budgetSource">
                <Select
                  placeholder="เลือกแหล่งงบประมาณ"
                  options={[
                    { value: 'investment', label: 'งบลงทุน (Investment)' },
                    { value: 'operating', label: 'งบดำเนินงาน (Operating)' },
                    { value: 'revenue', label: 'งบรายได้ (Revenue)' },
                  ]}
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={24}>
            <Col xs={24} md={12}>
              <Form.Item
                label="วิธีคำนวณ Progress (Progress Calculation Method)"
                name="progressMethod"
                rules={[{ required: true, message: 'กรุณาเลือกวิธีคำนวณ' }]}
              >
                <Select
                  placeholder="เลือกวิธีคำนวณ"
                  options={PROGRESS_METHOD_OPTIONS.map((option) => ({
                    value: option.value,
                    label: renderProgressMethodLabel(option),
                  }))}
                />
              </Form.Item>
            </Col>
          </Row>
          {progressMethod && (
            <div style={{ marginTop: -8, marginBottom: 8 }}>
              <Text type="secondary" style={{ fontSize: 12 }}>
                เลื่อนเมาส์บนชื่อวิธีคำนวณหรือไอคอนข้อมูลเพื่อดูคำอธิบายเพิ่มเติม
              </Text>
            </div>
          )}

          {/* ===== Section 3: Payment Milestones ===== */}
          <Divider orientation="left" orientationMargin={0}>
            <Text strong style={{ fontSize: 16 }}>
              งวดงาน (Payment Milestones)
            </Text>
          </Divider>

          <Alert
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
            message="หลักการคำนวณงวดงาน"
            description="เมื่อแก้ไขเปอร์เซ็นต์ ระบบจะคำนวณจำนวนเงินจากงบประมาณโครงการให้ทันที เมื่อแก้ไขจำนวนเงิน ระบบจะคำนวณยอดรวมและสัดส่วนของทุกงวดใหม่อัตโนมัติ และเมื่อต้องการเพิ่มงวดงานใหม่ ระบบจะเพิ่มแถวว่างให้ โดยไม่ล้างสัดส่วนเดิม"
          />

          <Table
            dataSource={milestones}
            columns={milestoneColumns}
            pagination={false}
            size="middle"
            bordered
            rowKey="key"
            summary={() => (
              <Table.Summary fixed>
                <Table.Summary.Row
                  style={{ background: '#f0f2f5' }}
                >
                  <Table.Summary.Cell index={0} align="center">
                    <Text strong>รวม</Text>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={1}>
                    <Text strong>{formatBaht(totalAmount)} บาท</Text>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={2}>
                    <Text
                      strong
                      style={{ color: totalPercentage === 100 ? COLORS.success : COLORS.error }}
                    >
                      {formatPercentage(totalPercentage)}%
                    </Text>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={3}>
                    <Text type="secondary">
                      {totalAmount === 0
                        ? 'กรุณากำหนดงวดงานใหม่'
                        : totalAmount === currentBudget
                          ? 'ยอดรวมตรงกับงบประมาณโครงการ'
                          : totalAmount < currentBudget
                            ? `ต่ำกว่างบประมาณ ${formatBaht(currentBudget - totalAmount)} บาท`
                            : `เกินงบประมาณ ${formatBaht(totalAmount - currentBudget)} บาท`}
                    </Text>
                  </Table.Summary.Cell>
                </Table.Summary.Row>
              </Table.Summary>
            )}
          />

          <Button
            type="dashed"
            icon={<PlusOutlined />}
            onClick={addMilestone}
            style={{ marginTop: 12, width: '100%' }}
          >
            + เพิ่มงวดงาน (Add Milestone)
          </Button>

          {/* ===== Section 4: Team Members ===== */}
          <Divider orientation="left" orientationMargin={0}>
            <Text strong style={{ fontSize: 16 }}>
              ทีมโครงการ (Project Team)
            </Text>
          </Divider>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {defaultTeamMembers.map((member) => (
              <div
                key={member.name}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 16px',
                  border: `1px solid ${COLORS.borderLight}`,
                  borderRadius: 8,
                  background: '#fafbfc',
                }}
              >
                <Space size={12}>
                  <Avatar
                    style={{
                      backgroundColor: COLORS.primary,
                      verticalAlign: 'middle',
                    }}
                    size={40}
                  >
                    {member.avatar}
                  </Avatar>
                  <div>
                    <Text strong>{member.name}</Text>
                    <br />
                    <Text type="secondary" style={{ fontSize: 13 }}>
                      {member.role}
                    </Text>
                  </div>
                </Space>
                <Tag color={member.confirmed ? 'success' : 'warning'}>
                  {member.confirmed
                    ? 'ยืนยันแล้ว (Confirmed)'
                    : 'รอยืนยัน (Pending)'}
                </Tag>
              </div>
            ))}
          </div>

          <Button
            type="dashed"
            icon={<UserAddOutlined />}
            style={{ marginTop: 12, width: '100%' }}
            onClick={() => message.info('สร้างโครงการก่อน แล้วจึงเชิญสมาชิกในหน้า Team')}
          >
            + เชิญสมาชิก (Invite Member)
          </Button>

          {/* ===== Bottom Action Bar ===== */}
          <Divider />

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <Button onClick={() => router.push('/dashboard')}>
              ยกเลิก (Cancel)
            </Button>
            <Space>
              <Button icon={<SaveOutlined />} onClick={handleSaveDraft}>
                บันทึกร่าง (Save Draft)
              </Button>
              <Button
                type="primary"
                icon={<SendOutlined />}
                onClick={handleSubmit}
                style={{
                  backgroundColor: COLORS.accentTeal,
                  borderColor: COLORS.accentTeal,
                }}
              >
                สร้างโครงการ (Create Project)
              </Button>
            </Space>
          </div>
        </Form>
      </Card>
    </div>
  );
}
