'use client';

import { Button, Card, List, Pagination, Typography } from 'antd';

import { COLORS } from '@/theme/antd-theme';
import type { Notification } from '@/types/notification';

import { SEVERITY_BORDER, formatRelativeTime, getTypeIcon, PAGE_SIZE } from './helpers';

const { Text } = Typography;

export function NotificationList({
  paged,
  filteredLength,
  currentPage,
  onPageChange,
}: {
  paged: Notification[];
  filteredLength: number;
  currentPage: number;
  onPageChange: (page: number) => void;
}) {
  return (
    <Card
      style={{
        borderRadius: 8,
        boxShadow: '0 2px 10px rgba(0,0,0,0.08)',
      }}
      styles={{ body: { padding: 0 } }}
    >
      <List
        dataSource={paged}
        renderItem={(item: Notification) => {
          const borderColor = SEVERITY_BORDER[item.severity];
          const isUnread = !item.isRead;

          return (
            <List.Item
              key={item.id}
              style={{
                borderLeft: `4px solid ${borderColor}`,
                backgroundColor: isUnread ? COLORS.infoBg : COLORS.white,
                padding: '16px 20px',
                display: 'flex',
                alignItems: 'flex-start',
                gap: 12,
              }}
              actions={[
                item.actionUrl ? (
                  <Button
                    key="detail"
                    type="link"
                    size="small"
                    href={item.actionUrl}
                  >
                    ดูรายละเอียด
                  </Button>
                ) : null,
              ]}
            >
              <List.Item.Meta
                avatar={
                  <div
                    style={{
                      fontSize: 22,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: 40,
                      height: 40,
                      borderRadius: '50%',
                      backgroundColor: `${borderColor}14`,
                    }}
                  >
                    {getTypeIcon(item.type)}
                  </div>
                }
                title={
                  <Text strong={isUnread} style={{ fontSize: 14 }}>
                    {item.title}
                  </Text>
                }
                description={
                  <div>
                    <Text
                      type="secondary"
                      style={{ fontSize: 13, display: 'block' }}
                    >
                      {item.message}
                    </Text>
                    <Text
                      type="secondary"
                      style={{ fontSize: 12, marginTop: 4, display: 'block' }}
                    >
                      {formatRelativeTime(item.timestamp)}
                    </Text>
                  </div>
                }
              />
            </List.Item>
          );
        }}
      />

      {/* Pagination */}
      <div
        style={{
          padding: '12px 20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderTop: `1px solid ${COLORS.borderLight}`,
        }}
      >
        <Text type="secondary" style={{ fontSize: 13 }}>
          แสดง {Math.min((currentPage - 1) * PAGE_SIZE + 1, filteredLength)}
          -{Math.min(currentPage * PAGE_SIZE, filteredLength)} จาก{' '}
          {filteredLength} รายการ
        </Text>
        <Pagination
          current={currentPage}
          pageSize={PAGE_SIZE}
          total={filteredLength}
          onChange={onPageChange}
          size="small"
          showSizeChanger={false}
        />
      </div>
    </Card>
  );
}
