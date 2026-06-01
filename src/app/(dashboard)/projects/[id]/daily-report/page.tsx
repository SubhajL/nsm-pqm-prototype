'use client';

import { useMemo, useState } from 'react';
import {
  Card,
  Form,
  Grid,
  Skeleton,
  Typography,
  message,
} from 'antd';

import dayjs from 'dayjs';
import {
  useCreateDailyReport,
  useDailyReports,
  useUpdateDailyReportStatus,
} from '@/hooks/useDailyReports';
import { useRouteProjectId } from '@/hooks/useRouteProjectId';
import { useWBS } from '@/hooks/useWBS';
import { useAuthStore } from '@/stores/useAuthStore';
import type { DailyReport, DailyReportStatus } from '@/types/daily-report';
import { canReviewDailyReport } from '@/lib/auth';

import { blankSignature } from '@/components/common';

import { CreateReportModal } from './_components/CreateReportModal';
import { PageHeader } from './_components/PageHeader';
import { ReportDetail } from './_components/ReportDetail';
import { ReportListCard } from './_components/ReportListCard';
import { ReportStatsCards } from './_components/ReportStatsCards';
import { buildDailyReportFormData } from './_components/submit-mapper';
import type { DailyReportFormValues, UploadQueueItem } from './_components/types';

const { Title } = Typography;

export default function DailyReportPage() {
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;
  const projectId = useRouteProjectId() ?? 'proj-001';
  const { data: reports, isLoading } = useDailyReports(projectId);
  const { data: wbsNodes } = useWBS(projectId);
  const createDailyReport = useCreateDailyReport();
  const updateDailyReportStatus = useUpdateDailyReportStatus();
  const currentUser = useAuthStore((s) => s.currentUser);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [localSelectedReport, setLocalSelectedReport] = useState<DailyReport | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | DailyReportStatus>('all');
  // PR-D1c — photo upload queue is now owned by the
  // `<Form.Item name="photos">` value via PhotoCaptureField; only
  // attachments still use the legacy queue state.
  const [attachmentFiles, setAttachmentFiles] = useState<UploadQueueItem[]>([]);
  const [createForm] = Form.useForm<DailyReportFormValues>();

  const selectedReport =
    localSelectedReport?.id === selectedReportId
      ? localSelectedReport
      : reports?.find((r) => r.id === selectedReportId) ?? null;
  const reportStats = useMemo(() => {
    const allReports = reports ?? [];
    return {
      total: allReports.length,
      draft: allReports.filter((report) => report.status === 'draft').length,
      submitted: allReports.filter((report) => report.status === 'submitted').length,
      approved: allReports.filter((report) => report.status === 'approved').length,
      rejected: allReports.filter((report) => report.status === 'rejected').length,
    };
  }, [reports]);
  const filteredReports = useMemo(() => {
    const allReports = reports ?? [];
    const lowered = searchText.trim().toLowerCase();

    return allReports.filter((report) => {
      const matchesStatus = statusFilter === 'all' || report.status === statusFilter;
      const matchesSearch =
        lowered.length === 0 ||
        report.issues.toLowerCase().includes(lowered) ||
        String(report.reportNumber).includes(lowered) ||
        report.signatures.reporter.name.toLowerCase().includes(lowered);

      return matchesStatus && matchesSearch;
    });
  }, [reports, searchText, statusFilter]);
  const wbsOptions = useMemo(
    () =>
      (wbsNodes ?? [])
        .filter((node) => node.level > 0)
        .map((node) => ({
          label: `${node.code} ${node.name}`,
          value: node.id,
        })),
    [wbsNodes],
  );

  const handleCreateDailyReport = async () => {
    try {
      const values = await createForm.validateFields();
      // PR-D1c — Delegate the FormData payload assembly to the pure
      // `buildDailyReportFormData` mapper so the legacy shape stays
      // locked by `submit-mapper.test.ts`. The mapper consumes the new
      // `values.photos` (CapturedPhoto[]) + `values.signatures` shapes.
      const formData = buildDailyReportFormData({
        projectId,
        date: values.date,
        weather: values.weather,
        temperature: values.temperature,
        linkedWbs: values.linkedWbs ?? [],
        personnel: values.personnel ?? [],
        activities: values.activities ?? [],
        photos: values.photos ?? [],
        attachments: attachmentFiles.map((entry) => ({
          file: entry.file,
          name: entry.name,
        })),
        signatures: values.signatures,
        issues: values.issues,
      });

      const createdReport = await createDailyReport.mutateAsync(formData);
      setIsCreateModalOpen(false);
      createForm.resetFields();
      setAttachmentFiles([]);
      setSelectedReportId(createdReport.id);
      setLocalSelectedReport(createdReport);
      message.success('สร้างรายงานประจำวันแล้ว');
    } catch (error) {
      if (error instanceof Error && error.message) {
        message.error(error.message);
      }
    }
  };

  const handleStatusUpdate = async (status: DailyReportStatus, note?: string) => {
    if (!selectedReport) {
      return;
    }

    try {
      const updatedReport = await updateDailyReportStatus.mutateAsync({
        id: selectedReport.id,
        status,
        note,
      });
      setSelectedReportId(updatedReport.id);
      setLocalSelectedReport(updatedReport);
      message.success('อัปเดตสถานะรายงานแล้ว');
    } catch (error) {
      if (error instanceof Error && error.message) {
        message.error(error.message);
      }
    }
  };

  if (isLoading) {
    return (
      <div>
        <Title level={3}>รายงานประจำวัน (Daily Reports)</Title>
        <Card>
          <Skeleton active paragraph={{ rows: 8 }} />
        </Card>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        isMobile={isMobile}
        onCreateClick={() => {
          createForm.setFieldsValue({
            date: dayjs(),
            weather: 'แดดจัด (Sunny)',
            temperature: 32,
            linkedWbs: [],
            personnel: [],
            activities: [],
            // PR-D1c — Migrated to PhotoCaptureField + SignatureCaptureField
            // controlled values. `photos` carries CapturedPhoto[]; signatures
            // start blank with the current user's name pre-filled on reporter.
            photos: [],
            signatures: {
              reporter: blankSignature(currentUser?.name ?? ''),
              inspector: blankSignature(''),
            },
            issues: '',
          });
          setAttachmentFiles([]);
          setIsCreateModalOpen(true);
        }}
      />

      <ReportStatsCards reportStats={reportStats} />

      <ReportListCard
        isMobile={isMobile}
        filteredReports={filteredReports}
        searchText={searchText}
        statusFilter={statusFilter}
        selectedReportId={selectedReportId}
        onSearchChange={setSearchText}
        onStatusFilterChange={setStatusFilter}
        onSelectReport={setSelectedReportId}
        onRowClick={(id) => {
          setSelectedReportId(id);
          setLocalSelectedReport(null);
        }}
      />

      {/* Report Detail Section */}
      {selectedReport && (
        <ReportDetail
          report={selectedReport}
          currentUserName={currentUser?.name ?? ''}
          canReview={canReviewDailyReport(currentUser?.role)}
          statusUpdating={updateDailyReportStatus.isPending}
          onStatusUpdate={handleStatusUpdate}
        />
      )}

      <CreateReportModal
        open={isCreateModalOpen}
        isMobile={isMobile}
        createForm={createForm}
        wbsOptions={wbsOptions}
        attachmentFiles={attachmentFiles}
        confirmLoading={createDailyReport.isPending}
        onCancel={() => {
          setIsCreateModalOpen(false);
          setAttachmentFiles([]);
        }}
        onOk={handleCreateDailyReport}
        setAttachmentFiles={setAttachmentFiles}
      />
    </div>
  );
}
