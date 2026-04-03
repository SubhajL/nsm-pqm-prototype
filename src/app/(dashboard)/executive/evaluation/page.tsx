'use client';

import dynamic from 'next/dynamic';
import { Row, Col, Card, Typography, Table, Rate, Button, Collapse, Spin } from 'antd';
import { FileOutlined, ShareAltOutlined, SaveOutlined } from '@ant-design/icons';
import { useEvaluation } from '@/hooks/useEvaluation';
import type { EvaluationCategory } from '@/hooks/useEvaluation';
import { COLORS } from '@/theme/antd-theme';
import type { ColumnsType } from 'antd/es/table';

const RadarChart = dynamic(
  () => import('@/components/charts/RadarChart').then((mod) => mod.RadarChart),
  { ssr: false },
);

const { Title, Text } = Typography;

export default function ProjectEvaluationPage() {
  const { data: evaluation, isLoading } = useEvaluation('proj-005');

  if (isLoading || !evaluation) {
    return (
      <div style={{ textAlign: 'center', padding: 80 }}>
        <Spin size="large" />
      </div>
    );
  }

  const columns: ColumnsType<EvaluationCategory> = [
    {
      title: 'หมวด (Category)',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: EvaluationCategory) => (
        <div>
          <div>{text}</div>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {record.nameEn}
          </Text>
        </div>
      ),
    },
    {
      title: 'คะแนน (Score)',
      dataIndex: 'score',
      key: 'score',
      width: 180,
      render: (score: number) => (
        <Rate disabled value={score} count={5} />
      ),
    },
    {
      title: 'หมายเหตุ (Note)',
      dataIndex: 'note',
      key: 'note',
    },
  ];

  const radarData = evaluation.categories.map((cat) => ({
    dimension: cat.name,
    score: cat.score,
  }));

  const collapseItems = [
    {
      key: '1',
      label: 'ประวัติการประเมินย้อนหลัง (Evaluation History)',
      children: (
        <Text type="secondary">
          ไม่มีประวัติการประเมินก่อนหน้า (No previous evaluations)
        </Text>
      ),
    },
  ];

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <Title level={3} style={{ marginBottom: 4 }}>
          แบบประเมินโครงการ (Project Evaluation)
        </Title>
        <Text type="secondary">
          {evaluation.projectName} (เสร็จสิ้น)
        </Text>
      </div>

      {/* Two columns */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} lg={14}>
          <Card title="ผลการประเมิน (Evaluation Results)">
            <Table<EvaluationCategory>
              columns={columns}
              dataSource={evaluation.categories}
              rowKey="nameEn"
              pagination={false}
              size="middle"
            />

            {/* Recommendations */}
            <div style={{ marginTop: 24 }}>
              <Text strong style={{ fontSize: 14 }}>
                ข้อเสนอแนะ (Recommendations)
              </Text>
              <div
                style={{
                  marginTop: 8,
                  padding: 12,
                  background: COLORS.bgLayout,
                  borderRadius: 8,
                }}
              >
                <Text>{evaluation.recommendation}</Text>
              </div>
            </div>

            {/* Buttons */}
            <div
              style={{
                marginTop: 24,
                display: 'flex',
                gap: 12,
                flexWrap: 'wrap',
              }}
            >
              <Button icon={<FileOutlined />}>
                แนบเอกสารหลักฐาน
              </Button>
              <Button
                type="primary"
                icon={<SaveOutlined />}
                style={{
                  backgroundColor: COLORS.accentTeal,
                  borderColor: COLORS.accentTeal,
                }}
              >
                บันทึกผลประเมิน
              </Button>
              <Button icon={<ShareAltOutlined />}>
                แชร์ผลให้ทีม (Share)
              </Button>
            </div>
          </Card>
        </Col>

        <Col xs={24} lg={10}>
          <Card title="สรุปผลประเมิน (Summary)">
            {/* Large circular score display */}
            <div
              style={{
                textAlign: 'center',
                padding: '24px 0',
              }}
            >
              <div
                style={{
                  width: 140,
                  height: 140,
                  borderRadius: '50%',
                  border: `6px solid ${COLORS.accentTeal}`,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto',
                }}
              >
                <span
                  style={{
                    fontSize: 32,
                    fontWeight: 700,
                    color: COLORS.accentTeal,
                    lineHeight: 1.1,
                  }}
                >
                  {evaluation.overallScore}
                </span>
                <span
                  style={{
                    fontSize: 16,
                    color: '#8c8c8c',
                    lineHeight: 1.2,
                  }}
                >
                  / {evaluation.maxScore}
                </span>
              </div>

              <div style={{ marginTop: 16 }}>
                <div>
                  <Text type="secondary">ระดับ: </Text>
                  <Text strong style={{ color: COLORS.accentTeal }}>
                    {evaluation.level}
                  </Text>
                </div>
                <div style={{ marginTop: 4 }}>
                  <Text
                    style={{
                      fontSize: 20,
                      fontWeight: 600,
                      color: COLORS.accentTeal,
                    }}
                  >
                    {evaluation.percentage}%
                  </Text>
                </div>
              </div>
            </div>

            {/* Radar Chart */}
            <div style={{ marginTop: 8 }}>
              <RadarChart
                data={radarData}
                maxScore={evaluation.maxScore}
                height={300}
              />
            </div>
          </Card>
        </Col>
      </Row>

      {/* Collapsible Evaluation History */}
      <Collapse items={collapseItems} />
    </div>
  );
}
