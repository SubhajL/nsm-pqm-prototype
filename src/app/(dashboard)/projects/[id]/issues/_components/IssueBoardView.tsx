'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, Col, Row, Tag, Typography } from 'antd';

import { COLORS } from '@/theme/antd-theme';
import type { Issue, IssueStatus } from '@/types/risk';

import { IssueCard } from './IssueCard';
import { getIssueDestination, KANBAN_COLUMNS, type IssueDestination } from './helpers';

const { Text } = Typography;

export function IssueBoardView({
  projectId,
  grouped,
  issueDestinations,
}: {
  projectId: string;
  grouped: Record<IssueStatus, Issue[]>;
  issueDestinations: Record<string, IssueDestination>;
}) {
  const router = useRouter();

  return (
    <Row gutter={[12, 12]}>
      {KANBAN_COLUMNS.map((col) => (
        <Col xs={24} sm={12} lg={6} key={col.key}>
          <Card
            size="small"
            title={
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>{col.label}</span>
                <Tag>{grouped[col.key].length}</Tag>
              </div>
            }
            styles={{
              header: {
                backgroundColor: col.headerColor,
                color: '#fff',
                borderTopLeftRadius: 8,
                borderTopRightRadius: 8,
                minHeight: 40,
              },
              body: {
                padding: 8,
                minHeight: 200,
                backgroundColor: COLORS.surfaceMuted,
              },
            }}
            style={{ borderRadius: 8, overflow: 'hidden' }}
          >
            {col.key === 'closed' ? (
              <div style={{ textAlign: 'center', padding: '24px 0', color: COLORS.textMuted }}>
                <Text type="secondary" style={{ fontSize: 16, fontWeight: 600 }}>
                  {grouped.closed.length} รายการ
                </Text>
                <div style={{ marginTop: 8, maxHeight: 180, overflowY: 'auto' }}>
                  {grouped.closed.map((iss) => (
                    <div key={iss.id} style={{ fontSize: 12, color: COLORS.textMuted, marginBottom: 4 }}>
                      <Link
                        href={issueDestinations[iss.id]?.href ?? `/projects/${projectId}`}
                        style={{ color: COLORS.textMuted }}
                      >
                        {iss.id}: {iss.title}
                      </Link>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              grouped[col.key].map((issue) => (
                <IssueCard
                  key={issue.id}
                  issue={issue}
                  destination={issueDestinations[issue.id] ?? getIssueDestination(issue, projectId)}
                  onOpen={() => router.push(issueDestinations[issue.id]?.href ?? `/projects/${projectId}`)}
                />
              ))
            )}
          </Card>
        </Col>
      ))}
    </Row>
  );
}
