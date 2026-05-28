'use client';

import { Card, Col, Progress, Row, Statistic } from 'antd';
import {
  CheckCircleOutlined,
  ExperimentOutlined,
  WarningOutlined,
} from '@ant-design/icons';

import { COLORS } from '@/theme/antd-theme';

export function QualityKPICards({
  firstPassRate,
  conditionalInspectionCount,
  passedCount,
  itpItemsLength,
}: {
  firstPassRate: number;
  conditionalInspectionCount: number;
  passedCount: number;
  itpItemsLength: number;
}) {
  return (
    <Row gutter={[16, 16]}>
      <Col xs={24} md={8}>
        <Card
          style={{
            borderRadius: 8,
            boxShadow: '0 2px 10px rgba(0,0,0,0.08)',
          }}
        >
          <div
            style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}
          >
            <CheckCircleOutlined
              style={{
                fontSize: 24,
                color: COLORS.success,
                marginTop: 4,
              }}
            />
            <Statistic
              title="QC First-Pass Rate"
              value={`${firstPassRate}%`}
              valueStyle={{
                fontSize: 28,
                fontWeight: 600,
                color: COLORS.success,
              }}
            />
          </div>
        </Card>
      </Col>
      <Col xs={24} md={8}>
        <Card
          style={{
            borderRadius: 8,
            boxShadow: '0 2px 10px rgba(0,0,0,0.08)',
          }}
        >
          <div
            style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}
          >
            <WarningOutlined
              style={{
                fontSize: 24,
                color: COLORS.warning,
                marginTop: 4,
              }}
            />
            <Statistic
              title="NCR (Non-Conformance)"
              value={`${conditionalInspectionCount} รายการเปิด (Open)`}
              valueStyle={{
                fontSize: 20,
                fontWeight: 600,
                color: COLORS.warning,
              }}
            />
          </div>
        </Card>
      </Col>
      <Col xs={24} md={8}>
        <Card
          style={{
            borderRadius: 8,
            boxShadow: '0 2px 10px rgba(0,0,0,0.08)',
          }}
        >
          <div
            style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}
          >
            <ExperimentOutlined
              style={{
                fontSize: 24,
                color: COLORS.info,
                marginTop: 4,
              }}
            />
            <div style={{ flex: 1 }}>
              <Statistic
                title="ITP Coverage"
                value={`${passedCount}/${itpItemsLength} รายการตรวจแล้ว (${Math.round((passedCount / (itpItemsLength || 1)) * 100)}%)`}
                valueStyle={{
                  fontSize: 16,
                  fontWeight: 600,
                  color: COLORS.info,
                }}
              />
              <Progress
                percent={Math.round(
                  (passedCount / (itpItemsLength || 1)) * 100,
                )}
                size="small"
                strokeColor={COLORS.info}
                style={{ marginTop: 8 }}
              />
            </div>
          </div>
        </Card>
      </Col>
    </Row>
  );
}
