'use client';

import { Button, Card, Col, Progress, Row, Typography } from 'antd';
import { SaveOutlined } from '@ant-design/icons';

import { COLORS } from '@/theme/antd-theme';

const { Text } = Typography;

export function SummaryCard({
  totalWeighted,
  physicalOverall,
  evmPercent,
}: {
  totalWeighted: number;
  physicalOverall: number;
  evmPercent: number;
}) {
  return (
    <Card
      title="สรุปและเปรียบเทียบ (Summary & Comparison)"
      styles={{ body: { padding: '24px' } }}
    >
      <Row gutter={32} align="middle">
        <Col span={8}>
          <div style={{ textAlign: 'center', marginBottom: 8 }}>
            <Text strong style={{ fontSize: 14 }}>
              Weighting Method
            </Text>
          </div>
          <Progress
            percent={Number(totalWeighted.toFixed(2))}
            strokeColor={COLORS.accentTeal}
            format={(pct) => `${pct?.toFixed(2)}%`}
            size={['100%', 20]}
          />
        </Col>
        <Col span={8}>
          <div style={{ textAlign: 'center', marginBottom: 8 }}>
            <Text strong style={{ fontSize: 14 }}>
              Physical Progress
            </Text>
          </div>
          <Progress
            percent={Number(physicalOverall.toFixed(1))}
            strokeColor={COLORS.success}
            format={(pct) => `${pct}%`}
            size={['100%', 20]}
          />
        </Col>
        <Col span={8}>
          <div style={{ textAlign: 'center', marginBottom: 8 }}>
            <Text strong style={{ fontSize: 14 }}>
              EVM (EV/BAC)
            </Text>
          </div>
          <Progress
            percent={Number(evmPercent.toFixed(1))}
            strokeColor={COLORS.info}
            format={(pct) => `${pct}%`}
            size={['100%', 20]}
          />
        </Col>
      </Row>

      <div
        style={{
          marginTop: 20,
          padding: '12px 16px',
          backgroundColor: COLORS.bgLayout,
          borderRadius: 8,
          border: `1px solid ${COLORS.borderLight}`,
        }}
      >
        <Text type="secondary" style={{ fontSize: 13 }}>
          ระบบแสดงข้อมูลล่าสุดจาก WBS, งานเชิงปริมาณ และ EVM ของโครงการนี้
        </Text>
      </div>

      <div style={{ marginTop: 20, textAlign: 'right' }}>
        <Button
          type="primary"
          icon={<SaveOutlined />}
          size="large"
          style={{
            backgroundColor: COLORS.accentTeal,
            borderColor: COLORS.accentTeal,
          }}
        >
          บันทึกการอัปเดต (Save Update)
        </Button>
      </div>
    </Card>
  );
}
