'use client';

import { useState } from 'react';
import { Button, Dropdown, Input, Modal, Space, message } from 'antd';
import { DownOutlined, FilePdfOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';

import { apiGet } from '@/lib/api-client';
import { buildRidReportDocument } from '@/lib/export-documents';
import { openPrintableReport } from '@/lib/export-utils';
import type {
  RidReportData,
  RidReportKind,
} from '@/lib/rid/reporting/reporting-types';
import { REPORT_KIND_LABELS } from '@/lib/rid/reporting/reporting-types';

/**
 * PR-29 — "ออกรายงาน (Export report)" button.
 *
 * Placement: on the project header card under each project detail page.
 * The dropdown exposes the three RID report kinds. Monthly defaults to
 * the current calendar month, delay to today, work_period prompts the
 * user to enter the งวด id (no project-scoped งวด picker exists yet).
 *
 * The actual report generation is server-side via `/api/reports`; the
 * client just calls `buildRidReportDocument(data)` to feed the existing
 * `openPrintableReport` pipeline.
 */
export function ReportExportButton({ projectId }: { projectId: string }) {
  const [busy, setBusy] = useState(false);
  const [workPeriodModalOpen, setWorkPeriodModalOpen] = useState(false);
  const [workPeriodId, setWorkPeriodId] = useState('');

  const fetchAndPrint = async (params: Record<string, string>) => {
    try {
      setBusy(true);
      const url = `/reports?${new URLSearchParams(params).toString()}`;
      const data = await apiGet<RidReportData>(url);
      const opened = openPrintableReport(buildRidReportDocument(data));
      if (!opened) {
        message.error('ไม่สามารถเปิดหน้าต่างรายงานได้ กรุณาอนุญาต pop-up');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'ออกรายงานไม่สำเร็จ';
      message.error(`ออกรายงานไม่สำเร็จ: ${msg}`);
    } finally {
      setBusy(false);
    }
  };

  const handleMonthly = () => {
    const start = dayjs().startOf('month').format('YYYY-MM-DD');
    const end = dayjs().endOf('month').format('YYYY-MM-DD');
    void fetchAndPrint({
      projectId,
      kind: 'monthly',
      periodStart: start,
      periodEnd: end,
    });
  };

  const handleDelay = () => {
    void fetchAndPrint({
      projectId,
      kind: 'delay',
      evaluationDate: dayjs().format('YYYY-MM-DD'),
    });
  };

  const handleWorkPeriod = () => {
    if (!workPeriodId.trim()) {
      message.warning('กรุณาระบุ Work Period ID');
      return;
    }
    setWorkPeriodModalOpen(false);
    void fetchAndPrint({
      projectId,
      kind: 'work_period',
      workPeriodId: workPeriodId.trim(),
    });
  };

  const items = (['monthly', 'delay', 'work_period'] as RidReportKind[]).map(
    (kind) => ({
      key: kind,
      label: `${REPORT_KIND_LABELS[kind].th} (${REPORT_KIND_LABELS[kind].en})`,
      onClick: () => {
        if (kind === 'monthly') handleMonthly();
        else if (kind === 'delay') handleDelay();
        else setWorkPeriodModalOpen(true);
      },
    }),
  );

  return (
    <>
      <Dropdown menu={{ items }} trigger={['click']} disabled={busy}>
        <Button icon={<FilePdfOutlined />} loading={busy}>
          <Space>
            ออกรายงาน RID (Export Report)
            <DownOutlined />
          </Space>
        </Button>
      </Dropdown>
      <Modal
        title="ระบุงวดงาน (Specify Work Period)"
        open={workPeriodModalOpen}
        onCancel={() => setWorkPeriodModalOpen(false)}
        onOk={handleWorkPeriod}
        okText="สร้างรายงาน"
        cancelText="ยกเลิก"
      >
        <p>กรุณาระบุ Work Period ID เพื่อสร้างรายงานปิดงวดงาน</p>
        <Input
          value={workPeriodId}
          onChange={(e) => setWorkPeriodId(e.target.value)}
          placeholder="wp-001"
          aria-label="Work Period ID"
        />
      </Modal>
    </>
  );
}
