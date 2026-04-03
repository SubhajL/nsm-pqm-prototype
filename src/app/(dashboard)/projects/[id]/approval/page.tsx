'use client';

import { useState } from 'react';
import {
  Card,
  Steps,
  Descriptions,
  List,
  Button,
  Input,
  Avatar,
  Tag,
  Typography,
  Row,
  Col,
  Space,
  message,
} from 'antd';
import {
  FileOutlined,
  DownloadOutlined,
  CheckCircleOutlined,
  RollbackOutlined,
  SendOutlined,
} from '@ant-design/icons';
import { useProject } from '@/hooks/useProjects';
import { useRouteProjectId } from '@/hooks/useRouteProjectId';
import { COLORS } from '@/theme/antd-theme';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

/* ---------- attachment data ---------- */
interface Attachment {
  name: string;
  size: string;
}

const ATTACHMENTS: Attachment[] = [
  { name: 'แผนงานโครงการ_v1.pdf', size: '2.3 MB' },
  { name: 'WBS_Template_ก่อสร้าง.xlsx', size: '1.1 MB' },
  { name: 'BOQ_Rev3.xlsx', size: '0.8 MB' },
  { name: 'ITP_Checklist.pdf', size: '0.5 MB' },
];

/* ========================================================================== */

export default function PlanApprovalPage() {
  const projectId = useRouteProjectId() ?? 'proj-001';
  const { data: project } = useProject(projectId);
  const [commentText, setCommentText] = useState('');

  const handleApprove = () => {
    message.success('อนุมัติแผนงานเรียบร้อยแล้ว (Plan approved successfully)');
  };

  const handleReject = () => {
    message.warning('ส่งกลับแก้ไขเรียบร้อยแล้ว (Returned for revision)');
  };

  const handleSendComment = () => {
    if (!commentText.trim()) {
      message.warning('กรุณาพิมพ์ความคิดเห็น');
      return;
    }
    message.success('ส่งความคิดเห็นแล้ว (Comment sent)');
    setCommentText('');
  };

  return (
    <div>
      {/* ---------- page header ---------- */}
      <div style={{ marginBottom: 24 }}>
        <Space size={12} align="center">
          <Title level={3} style={{ marginBottom: 0 }}>
            ขออนุมัติแผนงานโครงการ (Plan Approval)
          </Title>
          <Tag color="warning" style={{ fontSize: 14, padding: '2px 12px' }}>
            รออนุมัติ (Pending)
          </Tag>
        </Space>
        <div style={{ marginTop: 4 }}>
          <Text type="secondary">
            {project?.name ?? 'รายละเอียดโครงการ'} — {project?.code ?? '-'}
          </Text>
        </div>
      </div>

      {/* ---------- approval workflow stepper ---------- */}
      <Card
        style={{
          marginBottom: 24,
          borderRadius: 8,
          boxShadow: '0 2px 10px rgba(0,0,0,0.08)',
        }}
      >
        <Steps
          current={1}
          items={[
            {
              title: 'ผจก.โครงการ ส่งคำขอ',
              status: 'finish',
              description: 'วิภา ข. — 05/04/69',
            },
            {
              title: 'หัวหน้ากองพิจารณา',
              status: 'process',
              description: 'สมชาย ก. — รอพิจารณา',
            },
            {
              title: 'รอง ผอ. อนุมัติ',
              status: 'wait',
              description: 'ธนา ก.',
            },
            {
              title: 'แจ้งทีมโครงการ',
              status: 'wait',
            },
          ]}
        />
      </Card>

      {/* ---------- two-column content ---------- */}
      <Row gutter={24} style={{ marginBottom: 24 }}>
        {/* ===== Left: Plan Summary ===== */}
        <Col xs={24} lg={14}>
          <Card
            title={
              <Text strong style={{ fontSize: 16 }}>
                สรุปแผนงาน (Plan Summary)
              </Text>
            }
            style={{
              borderRadius: 8,
              boxShadow: '0 2px 10px rgba(0,0,0,0.08)',
              height: '100%',
            }}
          >
            <Descriptions bordered column={1} size="middle">
              <Descriptions.Item label="กิจกรรมหลัก (Main Activities)">
                <Text strong>12</Text>
              </Descriptions.Item>
              <Descriptions.Item label="กิจกรรมย่อย (Sub Activities)">
                <Text strong>48</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Checklist">
                <Text strong>156</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Dependencies">
                <Text strong>23</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Milestones">
                <Text strong>4</Text>
              </Descriptions.Item>
              <Descriptions.Item label="ระยะเวลา (Duration)">
                <Text strong>182 วัน</Text>
                <Text type="secondary"> (01/04/69 — 30/09/69)</Text>
              </Descriptions.Item>
              <Descriptions.Item label="งบประมาณ (Budget)">
                <Text strong>12,500,000 บาท</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Critical Path">
                <Text strong style={{ color: COLORS.error }}>
                  8 กิจกรรม
                </Text>
              </Descriptions.Item>
              <Descriptions.Item label="วิธีคำนวณ (Calculation Method)">
                <Tag color="blue">EVM</Tag>
                <Text type="secondary"> Earned Value Management</Text>
              </Descriptions.Item>
            </Descriptions>
          </Card>
        </Col>

        {/* ===== Right: Attachments ===== */}
        <Col xs={24} lg={10}>
          <Card
            title={
              <Text strong style={{ fontSize: 16 }}>
                เอกสารแนบ (Attachments)
              </Text>
            }
            style={{
              borderRadius: 8,
              boxShadow: '0 2px 10px rgba(0,0,0,0.08)',
              height: '100%',
            }}
          >
            <List
              dataSource={ATTACHMENTS}
              renderItem={(item, index) => (
                <List.Item
                  actions={[
                    <Button
                      key="download"
                      type="link"
                      icon={<DownloadOutlined />}
                      onClick={() =>
                        message.info(`ดาวน์โหลด ${item.name}`)
                      }
                    >
                      ดาวน์โหลด
                    </Button>,
                  ]}
                >
                  <List.Item.Meta
                    avatar={
                      <Avatar
                        shape="square"
                        size={40}
                        icon={<FileOutlined />}
                        style={{
                          backgroundColor:
                            item.name.endsWith('.pdf')
                              ? '#fff1f0'
                              : '#f6ffed',
                          color: item.name.endsWith('.pdf')
                            ? COLORS.error
                            : COLORS.success,
                        }}
                      />
                    }
                    title={
                      <Text style={{ fontSize: 14 }}>
                        {index + 1}. {item.name}
                      </Text>
                    }
                    description={item.size}
                  />
                </List.Item>
              )}
            />
          </Card>
        </Col>
      </Row>

      {/* ---------- comment section ---------- */}
      <Card
        title={
          <Text strong style={{ fontSize: 16 }}>
            ความคิดเห็นผู้พิจารณา (Reviewer Comments)
          </Text>
        }
        style={{
          marginBottom: 24,
          borderRadius: 8,
          boxShadow: '0 2px 10px rgba(0,0,0,0.08)',
        }}
      >
        {/* existing comment */}
        <div
          style={{
            display: 'flex',
            gap: 12,
            padding: '16px',
            background: '#fafbfc',
            borderRadius: 8,
            border: `1px solid ${COLORS.borderLight}`,
            marginBottom: 20,
          }}
        >
          <Avatar
            style={{ backgroundColor: COLORS.primary, flexShrink: 0 }}
            size={40}
          >
            สช
          </Avatar>
          <div style={{ flex: 1 }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 4,
              }}
            >
              <Text strong>สมชาย ก.</Text>
              <Text type="secondary" style={{ fontSize: 12 }}>
                06/04/69 10:30
              </Text>
            </div>
            <Paragraph style={{ marginBottom: 0 }}>
              แผนงานเหมาะสม Critical Path ครอบคลุม กรุณาเพิ่มรายละเอียด Buffer
              สำหรับงานรื้อถอน
            </Paragraph>
          </div>
        </div>

        {/* reply input */}
        <TextArea
          rows={3}
          placeholder="พิมพ์ความคิดเห็น... (Type your comment...)"
          value={commentText}
          onChange={(e) => setCommentText(e.target.value)}
        />
        <div style={{ marginTop: 12, textAlign: 'right' }}>
          <Button
            type="primary"
            icon={<SendOutlined />}
            onClick={handleSendComment}
          >
            ส่งความคิดเห็น (Send Comment)
          </Button>
        </div>
      </Card>

      {/* ---------- bottom action buttons ---------- */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'flex-end',
          gap: 12,
        }}
      >
        <Button
          danger
          icon={<RollbackOutlined />}
          onClick={handleReject}
        >
          ส่งกลับแก้ไข (Return for Revision)
        </Button>
        <Button
          type="primary"
          icon={<CheckCircleOutlined />}
          onClick={handleApprove}
          style={{
            backgroundColor: COLORS.success,
            borderColor: COLORS.success,
          }}
        >
          อนุมัติแผนงาน (Approve Plan)
        </Button>
      </div>
    </div>
  );
}
