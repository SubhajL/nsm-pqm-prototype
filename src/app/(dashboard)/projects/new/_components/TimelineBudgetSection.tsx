'use client';

import {
  Col,
  DatePicker,
  Divider,
  Form,
  InputNumber,
  Row,
  Select,
  Typography,
} from 'antd';
import { THAI_DATE_FORMAT } from '@/lib/antd-thai-locale';

import { formatBahtLive, parseBahtLive } from '@/lib/baht-live-format';

import {
  PROGRESS_METHOD_OPTIONS,
  type ProgressMethodInfo,
  renderProgressMethodLabel,
} from './helpers';

const { Text } = Typography;

export function TimelineBudgetSection({
  progressMethod,
}: {
  progressMethod: ProgressMethodInfo['value'] | undefined;
}) {
  return (
    <>
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
              format={THAI_DATE_FORMAT}
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
              format={THAI_DATE_FORMAT}
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
              aria-label="งบประมาณ (Budget)"
              // PR-D1b — use the shared formatBahtLive helper for Thai
              // grouping + leading ฿. parseBahtLive returns a numeric
              // string so AntD's InputNumber state remains a number.
              formatter={(value) => formatBahtLive(value)}
              parser={(value) => Number(parseBahtLive(value) || 0) as unknown as 0}
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
    </>
  );
}
