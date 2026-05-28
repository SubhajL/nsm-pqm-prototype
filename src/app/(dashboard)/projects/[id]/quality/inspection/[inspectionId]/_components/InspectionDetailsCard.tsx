'use client';

import { Card, Descriptions, Tag } from 'antd';

import { formatThaiDate } from '@/lib/date-utils';
import type { InspectionRecord } from '@/types/quality';

export function InspectionDetailsCard({ inspection }: { inspection: InspectionRecord }) {
  return (
    <Card
      title="ข้อมูลการตรวจ (Inspection Details)"
      style={{
        borderRadius: 8,
        boxShadow: '0 2px 10px rgba(0,0,0,0.08)',
      }}
    >
      <Descriptions bordered column={{ xs: 1, sm: 2, md: 2 }} size="middle">
        <Descriptions.Item label="วันที่ (Date)">
          {formatThaiDate(inspection.date)}
        </Descriptions.Item>
        <Descriptions.Item label="เวลา (Time)">
          {inspection.time}
        </Descriptions.Item>
        <Descriptions.Item label="ผู้ตรวจสอบ (Inspectors)">
          {inspection.inspectors.join(', ')}
        </Descriptions.Item>
        <Descriptions.Item label="กิจกรรม (Activity)">
          {inspection.wbsLink}
        </Descriptions.Item>
        <Descriptions.Item label="มาตรฐาน (Standards)" span={2}>
          {inspection.standards.map((s) => (
            <Tag key={s} color="blue" style={{ marginBottom: 4 }}>
              {s}
            </Tag>
          ))}
        </Descriptions.Item>
      </Descriptions>
    </Card>
  );
}
