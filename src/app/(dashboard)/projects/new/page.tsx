'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import dayjs from 'dayjs';
import { Card, Form, Steps, message } from 'antd';

import type { Project } from '@/types/project';
import type { ContractingModel, DeliveryMethod, ProjectClass } from '@/types/rid/vocabulary';
import { useCreateProject } from '@/hooks/useProjects';
import { useAppStore } from '@/stores/useAppStore';
import { useAuthStore } from '@/stores/useAuthStore';
import { canCreateProject as canCreateProjectForRole } from '@/lib/auth';
import { COLORS } from '@/theme/antd-theme';
import { WizardActionFooter, clampStepIndex } from '@/components/common';
import { useUnsavedChangesGuard } from '@/hooks/useUnsavedChangesGuard';

import { BasicInfoSection } from './_components/BasicInfoSection';
import { DraftAlert } from './_components/DraftAlert';
import { MilestonesSection } from './_components/MilestonesSection';
import { NewProjectHeader } from './_components/NewProjectHeader';
import { TeamSection } from './_components/TeamSection';
import { TimelineBudgetSection } from './_components/TimelineBudgetSection';
import {
  NEW_PROJECT_STEPS,
  getNewProjectWizardFieldNames,
} from './_components/new-project-wizard-steps';
import {
  DEFAULT_MILESTONES,
  DRAFT_STORAGE_KEY,
  TOTAL_BUDGET,
  deserializeDraftValues,
  recalculatePercentagesFromAmounts,
  roundToCurrency,
  serializeDraftValues,
  type DraftFormValues,
  type DraftPayload,
  type MilestoneRow,
  type ProgressMethodInfo,
  type SubmittedFormValues,
} from './_components/helpers';

export default function NewProjectPage() {
  const router = useRouter();
  const [form] = Form.useForm();
  const [milestones, setMilestones] = useState<MilestoneRow[]>(DEFAULT_MILESTONES);
  const [savedDraftAt, setSavedDraftAt] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [dirty, setDirty] = useState(false);
  const totalSteps = NEW_PROJECT_STEPS.length;
  const createProject = useCreateProject();
  const setCurrentProject = useAppStore((s) => s.setCurrentProject);
  const currentUser = useAuthStore((s) => s.currentUser);
  const progressMethod = Form.useWatch('progressMethod', form) as ProgressMethodInfo['value'] | undefined;
  const budgetValue = Form.useWatch('budget', form);

  // PR-D1b — block reload/close while the user has unsaved edits.
  useUnsavedChangesGuard({ dirty, submitting: createProject.isPending });
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
        projectClass: values.projectClass,
        deliveryMethod: values.deliveryMethod,
        contractingModel: values.contractingModel ?? null,
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
      // PR-D1b — clear dirty only after confirmed save success so a
      // failed submit leaves the unsaved-changes guard armed.
      setDirty(false);
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

  const handleSaveDraft = (): boolean => {
    if (!draftStorageKey || !currentUser) {
      message.error('ไม่พบข้อมูลผู้ใช้งาน กรุณาเข้าสู่ระบบใหม่');
      return false;
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
    // PR-D1b — clear dirty only after the draft actually persisted so a
    // missing-user precondition doesn't disarm the unsaved-changes guard.
    setDirty(false);
    return true;
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

  const handleDemoFill = () => {
    form.setFieldsValue({
      name: 'โครงการก่อสร้างประตูระบายน้ำคลองรังสิตประยูรศักดิ์ ตอน 2',
      projectClass: 'construction' as ProjectClass,
      deliveryMethod: 'outsourced' as DeliveryMethod,
      contractingModel: 'lump_sum' as ContractingModel,
      objectives:
        'ก่อสร้างประตูระบายน้ำคอนกรีตเสริมเหล็กพร้อมระบบเครื่องกลและไฟฟ้า เพื่อควบคุมการระบายน้ำลุ่มน้ำเจ้าพระยาตอนล่างและบรรเทาอุทกภัยในพื้นที่กรุงเทพฯ ตอนเหนือ–ปทุมธานี',
      description:
        'โครงการก่อสร้างครบวงจร (สำรวจ–ออกแบบ–ก่อสร้าง–ส่งมอบ) สำหรับสาธิตเส้นทาง WBS → BOQ → Gantt → EVM ของระบบ PQM',
      startDate: dayjs('2026-08-01'),
      endDate: dayjs('2027-01-31'),
      budget: 18500000,
      budgetSource: 'investment',
      progressMethod: 'evm',
    });
    setMilestones([
      { key: 1, milestone: 1, amount: 2775000, percentage: 15, deliverable: 'งานสำรวจ + แบบรายละเอียด (Detail Design) + BOQ + แผนงาน' },
      { key: 2, milestone: 2, amount: 6475000, percentage: 35, deliverable: 'งานโครงสร้างประตูระบายน้ำ + ฐานราก + เสาเข็ม' },
      { key: 3, milestone: 3, amount: 6475000, percentage: 35, deliverable: 'งานติดตั้งบานประตู + ระบบเครื่องกล/ไฟฟ้า/SCADA' },
      { key: 4, milestone: 4, amount: 2775000, percentage: 15, deliverable: 'ทดสอบเดินเครื่อง + ตรวจรับ + ส่งมอบ' },
    ]);
    message.success('เติมข้อมูลตัวอย่างโครงการสาธิตแล้ว');
  };

  return (
    <div>
      <NewProjectHeader onDemoFill={handleDemoFill} />

      {savedDraftAt && (
        <DraftAlert
          savedDraftAt={savedDraftAt}
          currentUserName={currentUser?.name ?? ''}
          onLoadDraft={handleLoadDraft}
          onDiscardDraft={handleDiscardDraft}
        />
      )}

      <Card
        style={{
          borderRadius: 8,
          boxShadow: '0 2px 10px rgba(0,0,0,0.08)',
        }}
      >
        <Steps
          size="small"
          current={currentStep}
          items={NEW_PROJECT_STEPS.map((step) => ({ title: step.title }))}
          style={{ marginBottom: 16 }}
        />
        <Form
          form={form}
          layout="vertical"
          requiredMark="optional"
          initialValues={{
            budget: TOTAL_BUDGET,
            deliveryMethod: 'in_house',
            contractingModel: null,
          }}
          onValuesChange={() => setDirty(true)}
        >
          {/* PR-D1b — All panes stay visible so existing one-pass E2E specs
              continue to pass. The Steps header + WizardActionFooter give
              users a progress indicator; the active step gets a teal
              accent on its left border. */}
          <div
            data-wizard-step="basics"
            style={{
              paddingLeft: 12,
              borderLeft: `3px solid ${currentStep === 0 ? COLORS.accentTeal : 'transparent'}`,
              transition: 'border-color 0.2s ease',
            }}
          >
            <BasicInfoSection />
          </div>

          <div
            data-wizard-step="schedule"
            style={{
              paddingLeft: 12,
              borderLeft: `3px solid ${currentStep === 1 ? COLORS.accentTeal : 'transparent'}`,
              transition: 'border-color 0.2s ease',
            }}
          >
            <TimelineBudgetSection progressMethod={progressMethod} />

            <MilestonesSection
              milestones={milestones}
              currentBudget={currentBudget}
              onMilestoneChange={handleMilestoneChange}
              onAddMilestone={addMilestone}
            />
          </div>

          <div
            data-wizard-step="team"
            style={{
              paddingLeft: 12,
              borderLeft: `3px solid ${currentStep === 2 ? COLORS.accentTeal : 'transparent'}`,
              transition: 'border-color 0.2s ease',
            }}
          >
            <TeamSection defaultTeamMembers={defaultTeamMembers} />
          </div>

          <WizardActionFooter
            current={currentStep}
            total={totalSteps}
            onPrev={() => setCurrentStep((c) => clampStepIndex(c - 1, totalSteps))}
            onNext={async () => {
              const fields = getNewProjectWizardFieldNames(currentStep);
              try {
                if (fields.length > 0) {
                  await form.validateFields(fields as string[]);
                }
                setCurrentStep((c) => clampStepIndex(c + 1, totalSteps));
              } catch {
                message.error('กรุณาตรวจสอบข้อมูลที่จำเป็น (Please complete required fields)');
              }
            }}
            onSubmit={() => {
              // PR-D1b — handleSubmit owns the dirty=false clear on
              // confirmed success; don't pre-clear here.
              void handleSubmit();
            }}
            onCancel={() => router.push('/dashboard')}
            secondary={{
              label: 'บันทึกร่าง (Save draft)',
              onClick: () => {
                handleSaveDraft();
              },
              ariaLabel: 'บันทึกร่าง (Save draft)',
            }}
            submitting={createProject.isPending}
            sticky={false}
          />

        </Form>
      </Card>
    </div>
  );
}
