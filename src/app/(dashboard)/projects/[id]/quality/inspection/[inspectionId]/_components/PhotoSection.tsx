'use client';

import { Card, Col, Row, Tag, Typography } from 'antd';
import { CameraOutlined, EnvironmentOutlined } from '@ant-design/icons';

import { COLORS } from '@/theme/antd-theme';
import { PHOTO_PLACEHOLDERS } from './constants';

const { Text } = Typography;

export function PhotoSection() {
  return (
    <Card
      title="ภาพถ่ายประกอบ (Site Photos)"
      style={{
        borderRadius: 8,
        boxShadow: '0 2px 10px rgba(0,0,0,0.08)',
      }}
    >
      <Row gutter={16}>
        {PHOTO_PLACEHOLDERS.map((photo) => (
          <Col key={photo.id} xs={12} sm={8} md={6}>
            <div
              style={{
                backgroundColor: COLORS.tableHeaderBg,
                borderRadius: 8,
                height: 160,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                border: `1px dashed ${COLORS.neutralGray}`,
                marginBottom: 16,
              }}
            >
              <CameraOutlined
                style={{
                  fontSize: 32,
                  color: COLORS.textDisabled,
                  marginBottom: 8,
                }}
              />
              <Text
                type="secondary"
                style={{
                  fontSize: 12,
                  textAlign: 'center',
                  padding: '0 8px',
                }}
                ellipsis
              >
                {photo.filename}
              </Text>
              <Tag
                color="blue"
                style={{ marginTop: 8, fontSize: 11 }}
                icon={<EnvironmentOutlined />}
              >
                GPS
              </Tag>
              <Text
                type="secondary"
                style={{ fontSize: 10, marginTop: 4 }}
              >
                {photo.gpsLat.toFixed(4)}, {photo.gpsLng.toFixed(4)}
              </Text>
            </div>
          </Col>
        ))}
      </Row>
    </Card>
  );
}
