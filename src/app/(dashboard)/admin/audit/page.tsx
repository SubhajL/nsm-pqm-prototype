'use client';

import { useState, useMemo } from 'react';
import {
  Row,
  Col,
  Card,
  Typography,
  Table,
  Tag,
  Button,
  Input,
  Select,
  DatePicker,
  Space,
  Spin,
} from 'antd';
import type { TableProps } from 'antd';
import {
  SearchOutlined,
  ReloadOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { useAuditLogs } from '@/hooks/useAuditLogs';
import type { AuditLog } from '@/types/admin';
import { MODULE_COLORS } from '@/types/admin';
import { COLORS } from '@/theme/antd-theme';
import { toBuddhistYear } from '@/lib/date-utils';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

const MODULE_OPTIONS = [
  { value: '', label: 'ทุก Module' },
  { value: 'Task', label: 'Task' },
  { value: 'Daily Report', label: 'Daily Report' },
  { value: 'Login', label: 'Login' },
  { value: 'Document', label: 'Document' },
  { value: 'Risk', label: 'Risk' },
  { value: 'Quality', label: 'Quality' },
  { value: 'Approval', label: 'Approval' },
  { value: 'Issue', label: 'Issue' },
  { value: 'Team', label: 'Team' },
];

const INTEGRATION_ITEMS = [
  {
    name: 'อพวช. Digital Service Center (SSO)',
    protocol: 'OpenID Connect',
    lastSync: '15/07/69',
  },
  {
    name: 'อพวช. Email Gateway (SMTP)',
    protocol: 'SMTP TLS',
    lastSync: '15/07/69',
  },
  {
    name: 'อพวช. HR Database',
    protocol: 'REST API',
    lastSync: '14/07/69',
  },
  {
    name: 'อพวช. Notification Push',
    protocol: 'Web Service',
    lastSync: 'Active',
  },
];

function formatTimestamp(isoDate: string): string {
  const d = dayjs(isoDate);
  const thaiMonths = [
    'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
    'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.',
  ];
  const day = d.date();
  const month = thaiMonths[d.month()];
  const beYear = toBuddhistYear(d.year()) % 100;
  const time = d.format('HH:mm');
  return `${day} ${month} ${beYear} ${time}`;
}

export default function AuditLogPage() {
  const [searchText, setSearchText] = useState('');
  const [moduleFilter, setModuleFilter] = useState('');
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs | null, dayjs.Dayjs | null] | null>(null);
  const [appliedFilters, setAppliedFilters] = useState<{
    search?: string;
    module?: string;
    startDate?: string;
    endDate?: string;
  }>({});

  const { data: auditLogs, isLoading } = useAuditLogs(appliedFilters);

  const handleSearch = () => {
    setAppliedFilters({
      search: searchText || undefined,
      module: moduleFilter || undefined,
      startDate: dateRange?.[0]?.format('YYYY-MM-DD') || undefined,
      endDate: dateRange?.[1]?.format('YYYY-MM-DD') || undefined,
    });
  };

  const handleReset = () => {
    setSearchText('');
    setModuleFilter('');
    setDateRange(null);
    setAppliedFilters({});
  };

  const logs = useMemo(() => auditLogs ?? [], [auditLogs]);

  if (isLoading) {
    return (
      <div style={{ textAlign: 'center', padding: 80 }}>
        <Spin size="large" />
      </div>
    );
  }

  const columns: TableProps<AuditLog>['columns'] = [
    {
      title: 'วันที่/เวลา',
      dataIndex: 'timestamp',
      key: 'timestamp',
      width: 150,
      sorter: (a: AuditLog, b: AuditLog) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
      defaultSortOrder: 'descend',
      render: (ts: string) => (
        <Text style={{ fontSize: 13 }}>{formatTimestamp(ts)}</Text>
      ),
    },
    {
      title: 'ผู้ใช้',
      dataIndex: 'userName',
      key: 'userName',
      width: 100,
    },
    {
      title: 'IP Address',
      dataIndex: 'ip',
      key: 'ip',
      width: 130,
      render: (ip: string) => (
        <Text code style={{ fontSize: 12 }}>
          {ip}
        </Text>
      ),
    },
    {
      title: 'OS',
      dataIndex: 'os',
      key: 'os',
      width: 90,
    },
    {
      title: 'Module',
      dataIndex: 'module',
      key: 'module',
      width: 120,
      render: (mod: string) => (
        <Tag color={MODULE_COLORS[mod] ?? 'default'}>{mod}</Tag>
      ),
    },
    {
      title: 'Action',
      dataIndex: 'action',
      key: 'action',
      ellipsis: true,
    },
  ];

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <Title level={3} style={{ marginBottom: 4 }}>
          บันทึกประวัติกิจกรรม (Audit Log)
        </Title>
      </div>

      {/* Filter bar */}
      <Card size="small" style={{ marginBottom: 16 }}>
        <Space wrap>
          <Input
            placeholder="ค้นหา..."
            prefix={<SearchOutlined />}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={{ width: 200 }}
            onPressEnter={handleSearch}
          />
          <RangePicker
            value={dateRange}
            onChange={(dates) =>
              setDateRange(dates as [dayjs.Dayjs | null, dayjs.Dayjs | null] | null)
            }
            style={{ width: 280 }}
          />
          <Select
            value={moduleFilter}
            onChange={setModuleFilter}
            options={MODULE_OPTIONS}
            style={{ width: 160 }}
            placeholder="ทุก Module"
          />
          <Button
            type="primary"
            icon={<SearchOutlined />}
            onClick={handleSearch}
            style={{
              backgroundColor: COLORS.accentTeal,
              borderColor: COLORS.accentTeal,
            }}
          >
            ค้นหา
          </Button>
          <Button icon={<ReloadOutlined />} onClick={handleReset}>
            รีเซ็ต
          </Button>
        </Space>
      </Card>

      {/* Main Content: Table + Sidebar */}
      <Row gutter={[16, 16]}>
        {/* Left: Audit Log Table */}
        <Col xs={24} lg={17}>
          <Card title="รายการ Audit Log">
            <Table<AuditLog>
              columns={columns}
              dataSource={logs}
              rowKey="id"
              size="middle"
              pagination={{
                pageSize: 20,
                showTotal: (total, range) =>
                  `แสดง ${range[0]}-${range[1]} จาก ${total} รายการ`,
              }}
              scroll={{ x: 800 }}
            />
          </Card>
        </Col>

        {/* Right: Security & Integration */}
        <Col xs={24} lg={7}>
          {/* Security Status */}
          <Card
            title="สถานะความปลอดภัย (Security Status)"
            size="small"
            style={{ marginBottom: 16 }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <Space>
                  <CheckCircleOutlined style={{ color: COLORS.success, fontSize: 16 }} />
                  <Text>OWASP Top 10</Text>
                </Space>
                <Tag color="green">ผ่าน (Passed)</Tag>
              </div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <Space>
                  <CheckCircleOutlined style={{ color: COLORS.success, fontSize: 16 }} />
                  <Text>PDPA Compliant</Text>
                </Space>
                <Tag color="green">ผ่าน (Passed)</Tag>
              </div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <Space>
                  <CheckCircleOutlined style={{ color: COLORS.success, fontSize: 16 }} />
                  <Text>RBAC</Text>
                </Space>
                <Tag color="green">ผ่าน (Passed)</Tag>
              </div>
            </div>
            <div
              style={{
                marginTop: 12,
                padding: '8px 12px',
                background: '#f6ffed',
                borderRadius: 6,
                fontSize: 12,
              }}
            >
              <Text type="secondary" style={{ fontSize: 12 }}>
                VA Scan ล่าสุด: 10/07/2569 — ไม่พบช่องโหว่ Critical/High
              </Text>
            </div>
          </Card>

          {/* System Integration */}
          <Card title="การเชื่อมต่อระบบ (System Integration)" size="small">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {INTEGRATION_ITEMS.map((item, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 10,
                  }}
                >
                  <div
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      backgroundColor: COLORS.success,
                      marginTop: 6,
                      flexShrink: 0,
                    }}
                  />
                  <div style={{ flex: 1 }}>
                    <div>
                      <Text strong style={{ fontSize: 13 }}>
                        {item.name}
                      </Text>
                    </div>
                    <div>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {item.protocol}
                      </Text>
                      <Text
                        style={{
                          fontSize: 12,
                          color: COLORS.success,
                          marginLeft: 8,
                        }}
                      >
                        Connected
                      </Text>
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginTop: 4,
                      }}
                    >
                      <Text type="secondary" style={{ fontSize: 11 }}>
                        Last sync: {item.lastSync}
                      </Text>
                      <Button size="small" type="default">
                        ทดสอบ
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
