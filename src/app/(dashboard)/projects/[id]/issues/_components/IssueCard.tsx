'use client';

import { Avatar, Card, Progress, Tag, Typography } from 'antd';
import { ClockCircleOutlined, UserOutlined } from '@ant-design/icons';

import { COLORS } from '@/theme/antd-theme';
import type { Issue } from '@/types/risk';
import { ISSUE_SEVERITY_LABELS } from '@/types/risk';
import { computeSlaStatus, SEVERITY_BORDER_COLOR, type IssueDestination } from './helpers';

const { Text } = Typography;

export function IssueCard({
  issue,
  destination,
  onOpen,
}: {
  issue: Issue;
  destination: IssueDestination;
  onOpen: () => void;
}) {
  const sevEntry = ISSUE_SEVERITY_LABELS[issue.severity];
  const sla = computeSlaStatus(issue);

  return (
    <Card
      size="small"
      hoverable
      onClick={onOpen}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onOpen();
        }
      }}
      role="link"
      tabIndex={0}
      aria-label={`${issue.title} - ${destination.label}`}
      style={{
        marginBottom: 8,
        borderTop: `3px solid ${SEVERITY_BORDER_COLOR[issue.severity]}`,
        borderRadius: 8,
        cursor: 'pointer',
      }}
      styles={{ body: { padding: 12 } }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <Text strong style={{ fontSize: 13 }}>{issue.title}</Text>
      </div>
      <Text type="secondary" style={{ fontSize: 11 }}>{issue.id}</Text>

      <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
        <Tag color={sevEntry.color} style={{ fontSize: 11 }}>
          {sevEntry.th} ({sevEntry.en})
        </Tag>
        {issue.tags?.map((tag) => (
          <Tag key={tag} style={{ fontSize: 11 }}>{tag}</Tag>
        ))}
      </div>

      <div style={{ marginTop: 8, fontSize: 12, color: sla.overdue ? COLORS.error : COLORS.textMuted }}>
        <ClockCircleOutlined style={{ marginRight: 4 }} />
        SLA: {sla.text}
      </div>

      <div style={{ marginTop: 4, fontSize: 12, color: COLORS.textMuted }}>
        {issue.linkedWbs}
      </div>

      {issue.status === 'in_progress' && issue.progress !== undefined && (
        <Progress
          percent={issue.progress}
          size="small"
          strokeColor={COLORS.info}
          style={{ marginTop: 8 }}
        />
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8 }}>
        <Avatar size={20} icon={<UserOutlined />} style={{ backgroundColor: COLORS.primary }} />
        <Text style={{ fontSize: 12 }}>{issue.assignee}</Text>
      </div>
    </Card>
  );
}
