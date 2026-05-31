'use client';

import {
  Row,
  Col,
  Card,
  Typography,
  Progress,
  Button,
  Spin,
  Alert,
  message,
  Tag,
  Tooltip,
} from 'antd';
import {
  FolderOutlined,
  DollarOutlined,
  WarningOutlined,
  SafetyCertificateOutlined,
  CheckCircleOutlined,
  FilePdfOutlined,
  SendOutlined,
  TeamOutlined,
  AuditOutlined,
} from '@ant-design/icons';
import { useProjects } from '@/hooks/useProjects';
import { usePmqa } from '@/hooks/usePmqa';
import { KPICard } from '@/components/common/KPICard';
import { StatusBadge } from '@/components/common/StatusBadge';
import { getAgencyBrand } from '@/lib/branding';
import {
  buildExecutiveExportDocument,
  buildPmqaExportDocument,
} from '@/lib/export-documents';
import { formatBahtShort } from '@/lib/date-utils';
import { openPrintableReport } from '@/lib/export-utils';
import {
  PMQA_CATEGORY_LABELS,
  type PmqaCategory,
  type PmqaIndicator,
  type PmqaScore,
} from '@/lib/pmqa/pmqa-types';
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

function pmqaToneColor(score: number): string {
  if (score >= 4.5) return COLORS.success;
  if (score >= 3.5) return COLORS.accentTeal;
  if (score >= 2.5) return COLORS.warning;
  return COLORS.error;
}

function topIndicatorsByCategory(
  indicators: PmqaIndicator[],
  category: PmqaCategory,
  limit = 3,
): PmqaIndicator[] {
  return indicators
    .filter((i) => i.category === category)
    .slice(0, limit);
}

function formatPmqaValue(indicator: PmqaIndicator): string {
  switch (indicator.unit) {
    case 'percent':
      return `${indicator.value.toFixed(1)}%`;
    case 'ratio':
      return indicator.value.toFixed(2);
    case 'days':
      return `${indicator.value.toFixed(0)} วัน`;
    case 'count':
    default:
      return String(Math.round(indicator.value));
  }
}

export default function ExecutiveDashboardPage() {
  const { data: projects, isLoading, isError, error, refetch } = useProjects();
  const pmqaQuery = usePmqa();

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

  const handleExportPmqa = () => {
    if (!pmqaQuery.data) {
      message.warning('ข้อมูล PMQA ยังโหลดไม่เสร็จ กรุณารอสักครู่');
      return;
    }
    const opened = openPrintableReport(buildPmqaExportDocument(pmqaQuery.data));
    if (!opened) {
      message.error('ไม่สามารถเปิดหน้าต่างรายงานได้ กรุณาอนุญาต pop-up');
    }
  };

  const pmqaScore: PmqaScore | undefined = pmqaQuery.data;

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
          background: COLORS.errorBg,
          borderColor: COLORS.errorBorder,
        }}
        styles={{ header: { background: COLORS.errorBg } }}
      >
        <Row gutter={[16, 16]}>
          <Col xs={24} lg={12}>
            <Card size="small">
              <Text strong>ก่อสร้างฝายทดน้ำห้วยขุนแก้ว ตอน 1</Text>
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
              <Text strong>ระบบติดตามสถานการณ์น้ำลุ่มน้ำเจ้าพระยา</Text>
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

      {/* PMQA (PR-28) — OPDC categories 2 / 6 / 7 */}
      <Card
        title={
          <span>
            <AuditOutlined style={{ marginRight: 8 }} />
            PMQA — หมวด 2 / 6 / 7 (OPDC PMQA Categories)
          </span>
        }
        style={{ marginBottom: 24 }}
        extra={
          pmqaScore ? (
            <Tooltip title="คะแนนเฉลี่ยจากทุกหมวด (1–5)">
              <Tag color={pmqaToneColor(pmqaScore.overallScore)} style={{ fontSize: 14 }}>
                คะแนนรวม {pmqaScore.overallScore.toFixed(2)} / 5
              </Tag>
            </Tooltip>
          ) : null
        }
      >
        {pmqaQuery.isLoading ? (
          <div style={{ textAlign: 'center', padding: 24 }}>
            <Spin />
          </div>
        ) : pmqaQuery.isError ? (
          <Alert
            type="error"
            showIcon
            message="ไม่สามารถโหลดคะแนน PMQA ได้"
            description={
              pmqaQuery.error instanceof Error
                ? pmqaQuery.error.message
                : 'กรุณาลองใหม่อีกครั้ง'
            }
            action={
              <Button size="small" onClick={() => void pmqaQuery.refetch()}>
                ลองใหม่
              </Button>
            }
          />
        ) : pmqaScore ? (
          <Row gutter={[16, 16]}>
            {(
              [
                'category_2_strategy',
                'category_6_process',
                'category_7_results',
              ] as PmqaCategory[]
            ).map((category) => {
              const avg = pmqaScore.categoryAverages[category];
              const topIndicators = topIndicatorsByCategory(
                pmqaScore.indicators,
                category,
                3,
              );
              const { th, en } = PMQA_CATEGORY_LABELS[category];
              return (
                <Col xs={24} lg={8} key={category}>
                  <Card
                    size="small"
                    title={
                      <span>
                        <Text strong>{th}</Text>
                        <br />
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          {en}
                        </Text>
                      </span>
                    }
                    extra={
                      <Tag color={pmqaToneColor(avg)}>เฉลี่ย {avg.toFixed(2)}</Tag>
                    }
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {topIndicators.map((indicator) => (
                        <div key={indicator.key}>
                          <div
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'baseline',
                              marginBottom: 2,
                            }}
                          >
                            <Text style={{ fontSize: 12 }}>{indicator.label}</Text>
                            <Tag color={pmqaToneColor(indicator.score)} style={{ marginLeft: 8 }}>
                              {indicator.score}/5
                            </Tag>
                          </div>
                          <div
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              fontSize: 12,
                              color: COLORS.textMuted,
                            }}
                          >
                            <Text type="secondary" style={{ fontSize: 12 }}>
                              {formatPmqaValue(indicator)}
                            </Text>
                            {indicator.benchmark !== undefined ? (
                              <Text type="secondary" style={{ fontSize: 12 }}>
                                เกณฑ์ {indicator.benchmark}
                                {indicator.unit === 'percent' ? '%' : ''}
                              </Text>
                            ) : null}
                          </div>
                        </div>
                      ))}
                    </div>
                  </Card>
                </Col>
              );
            })}
          </Row>
        ) : null}
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
        <Button
          icon={<AuditOutlined />}
          onClick={handleExportPmqa}
          disabled={!pmqaScore}
        >
          ส่งออก ก.พ.ร. (Export OPDC)
        </Button>
        <Button icon={<SendOutlined />} type="default">
          {`ส่ง Dashboard ไปยัง ${getAgencyBrand().name} DSC`}
        </Button>
        <Button icon={<TeamOutlined />} type="default">
          นัดประชุมทีม
        </Button>
      </div>
    </div>
  );
}
