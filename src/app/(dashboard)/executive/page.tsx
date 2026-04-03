'use client';

import { Row, Col, Card, Typography, Progress, Button, Spin, Alert, message } from 'antd';
import {
  FolderOutlined,
  DollarOutlined,
  WarningOutlined,
  SafetyCertificateOutlined,
  CheckCircleOutlined,
  FilePdfOutlined,
  SendOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import { useProjects } from '@/hooks/useProjects';
import { KPICard } from '@/components/common/KPICard';
import { StatusBadge } from '@/components/common/StatusBadge';
import { buildExecutiveExportDocument } from '@/lib/export-documents';
import { formatBahtShort } from '@/lib/date-utils';
import { openPrintableReport } from '@/lib/export-utils';
import { COLORS, PROJECT_STATUS_COLORS } from '@/theme/antd-theme';

const { Title, Text } = Typography;

const STATUS_PROGRESS_COLORS: Record<string, string> = {
  in_progress: PROJECT_STATUS_COLORS.inProgress,
  on_schedule: PROJECT_STATUS_COLORS.onSchedule,
  watch: PROJECT_STATUS_COLORS.watch,
  delayed: PROJECT_STATUS_COLORS.delayed,
  completed: PROJECT_STATUS_COLORS.completed,
  planning: PROJECT_STATUS_COLORS.planning,
  on_hold: PROJECT_STATUS_COLORS.onHold,
  draft: PROJECT_STATUS_COLORS.draft,
  cancelled: PROJECT_STATUS_COLORS.cancelled,
};

function getProjectDisplayStatus(project: { status: string; scheduleHealth?: string }) {
  if (project.status !== 'in_progress') {
    return project.status;
  }

  return project.scheduleHealth ?? 'on_schedule';
}

export default function ExecutiveDashboardPage() {
  const { data: projects, isLoading, isError, error, refetch } = useProjects();

  if (isLoading) {
    return (
      <div style={{ textAlign: 'center', padding: 80 }}>
        <Spin size="large" />
      </div>
    );
  }

  if (isError) {
    return (
      <div>
        <Title level={3}>แดชบอร์ดผู้บริหาร (Executive Dashboard)</Title>
        <Alert
          type="error"
          showIcon
          message="ไม่สามารถโหลดข้อมูลโครงการได้"
          description={error instanceof Error ? error.message : 'กรุณาลองใหม่อีกครั้ง'}
          action={
            <Button size="small" onClick={() => void refetch()}>
              ลองใหม่
            </Button>
          }
        />
      </div>
    );
  }

  const allProjects = projects ?? [];
  const totalProjects = allProjects.length;
  const activeProjects = allProjects.filter(
    (p) => p.status === 'in_progress',
  ).length;
  const completedOnTime = allProjects.filter(
    (p) => p.status === 'completed',
  );
  const delayedProjects = allProjects.filter(
    (p) => getProjectDisplayStatus(p) === 'delayed',
  ).length;

  const totalBudget = allProjects.reduce((sum, p) => sum + p.budget, 0);
  const spentAmount = 38200000;
  const spentPercent = Math.round((spentAmount / totalBudget) * 1000) / 10;

  const handleExportPdf = () => {
    const opened = openPrintableReport(buildExecutiveExportDocument(allProjects));
    if (!opened) {
      message.error('ไม่สามารถเปิดหน้าต่างรายงานได้ กรุณาอนุญาต pop-up');
    }
  };

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <Title level={3} style={{ marginBottom: 4 }}>
              แดชบอร์ดผู้บริหาร (Executive Dashboard)
            </Title>
            <Text type="secondary">
              ปีงบประมาณ 2569 | อัปเดตล่าสุด: 15/07/2569 14:30
            </Text>
          </div>
          <div style={{ textAlign: 'right' }}>
            <Text strong>ธนา ก. (รอง ผอ.)</Text>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={5}>
          <KPICard
            title="โครงการทั้งหมด"
            value={totalProjects}
            icon={<FolderOutlined />}
            color={COLORS.info}
            subtitle={`${activeProjects} active`}
          />
        </Col>
        <Col xs={24} sm={12} lg={5}>
          <KPICard
            title="งบประมาณรวม"
            value={formatBahtShort(totalBudget)}
            icon={<DollarOutlined />}
            color={COLORS.info}
            subtitle={`เบิกจ่ายแล้ว ${formatBahtShort(spentAmount)} (${spentPercent}%)`}
            extraContent={
              <Progress
                percent={spentPercent}
                size="small"
                strokeColor={COLORS.accentTeal}
                showInfo={false}
              />
            }
          />
        </Col>
        <Col xs={24} sm={12} lg={5}>
          <KPICard
            title="ล่าช้า"
            value={delayedProjects}
            icon={<WarningOutlined />}
            color={COLORS.error}
            suffix="โครงการ"
          />
        </Col>
        <Col xs={24} sm={12} lg={5}>
          <KPICard
            title="Quality Gate ไม่ผ่าน"
            value={1}
            icon={<SafetyCertificateOutlined />}
            color={COLORS.warning}
          />
        </Col>
        <Col xs={24} sm={12} lg={4}>
          <KPICard
            title="เสร็จตามกำหนด"
            value={`${completedOnTime.length}/${completedOnTime.length}`}
            icon={<CheckCircleOutlined />}
            color={COLORS.success}
            subtitle="100%"
          />
        </Col>
      </Row>

      {/* Two columns: Project Status & Budget */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} lg={12}>
          <Card
            title="สถานะโครงการรายโครงการ (Project Status)"
            style={{ height: '100%' }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {allProjects.map((project) => (
                <div key={project.id}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: 4,
                    }}
                  >
                    <Text
                      style={{
                        maxWidth: 280,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                      title={project.name}
                    >
                      {project.name}
                    </Text>
                    <StatusBadge status={getProjectDisplayStatus(project)} type="project" />
                  </div>
                  <Progress
                    percent={Math.round(project.progress * 100)}
                    strokeColor={
                      STATUS_PROGRESS_COLORS[getProjectDisplayStatus(project)] ?? COLORS.info
                    }
                    size="small"
                  />
                </div>
              ))}
            </div>
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card
            title="งบประมาณรายโครงการ (Budget by Project)"
            style={{ height: '100%' }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {allProjects.map((project) => {
                const spent = Math.round(project.budget * project.progress);
                const spentPct = Math.round(project.progress * 100);
                return (
                  <div key={project.id}>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        marginBottom: 4,
                      }}
                    >
                      <Text
                        style={{
                          maxWidth: 280,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                        title={project.name}
                      >
                        {project.name}
                      </Text>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {formatBahtShort(spent)} / {formatBahtShort(project.budget)}
                      </Text>
                    </div>
                    <Progress
                      percent={spentPct}
                      strokeColor={COLORS.accentTeal}
                      trailColor={COLORS.borderLight}
                      size="small"
                      showInfo={false}
                    />
                  </div>
                );
              })}
            </div>
          </Card>
        </Col>
      </Row>

      {/* Critical Watchlist */}
      <Card
        title="โครงการที่ต้องติดตามเป็นพิเศษ (Critical Watchlist)"
        style={{
          marginBottom: 24,
          background: '#fff2f0',
          borderColor: '#ffccc7',
        }}
        styles={{ header: { background: '#fff2f0' } }}
      >
        <Row gutter={[16, 16]}>
          <Col xs={24} lg={12}>
            <Card size="small">
              <Text strong>ปรับปรุงนิทรรศการดาราศาสตร์</Text>
              <div style={{ marginTop: 8 }}>
                <div style={{ marginBottom: 4 }}>
                  <Text type="secondary">SPI: </Text>
                  <Text style={{ color: COLORS.warning, fontWeight: 600 }}>
                    0.92
                  </Text>
                  <Text type="secondary"> (amber)</Text>
                </div>
                <div style={{ marginBottom: 4 }}>
                  <Text type="secondary">Open Issues: </Text>
                  <Text strong>3</Text>
                </div>
                <div>
                  <Text type="secondary">Quality Gate: </Text>
                  <Text style={{ color: COLORS.warning, fontWeight: 600 }}>
                    Conditional
                  </Text>
                </div>
              </div>
            </Card>
          </Col>
          <Col xs={24} lg={12}>
            <Card size="small">
              <Text strong>พัฒนาระบบจองกิจกรรม</Text>
              <div style={{ marginTop: 8 }}>
                <div style={{ marginBottom: 4 }}>
                  <Text type="secondary">Sprint velocity: </Text>
                  <Text style={{ color: COLORS.warning, fontWeight: 600 }}>
                    declining
                  </Text>
                </div>
                <div>
                  <Text type="secondary">Critical bug: </Text>
                  <Text style={{ color: COLORS.error, fontWeight: 600 }}>
                    1
                  </Text>
                </div>
              </div>
            </Card>
          </Col>
        </Row>
      </Card>

      {/* Bottom Buttons */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <Button
          type="primary"
          icon={<FilePdfOutlined />}
          onClick={handleExportPdf}
          style={{ backgroundColor: COLORS.accentTeal, borderColor: COLORS.accentTeal }}
        >
          สร้างรายงาน PDF (Generate PDF)
        </Button>
        <Button icon={<SendOutlined />} type="default">
          ส่ง Dashboard ไปยัง อพวช. DSC
        </Button>
        <Button icon={<TeamOutlined />} type="default">
          นัดประชุมทีม
        </Button>
      </div>
    </div>
  );
}
