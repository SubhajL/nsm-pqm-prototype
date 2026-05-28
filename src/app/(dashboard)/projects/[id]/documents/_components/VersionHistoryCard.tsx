'use client';

import { Card, Collapse, Tag, Timeline } from 'antd';

import { formatThaiDate } from '@/lib/date-utils';
import { COLORS } from '@/theme/antd-theme';
import type { DocumentFile, VersionEntry } from '@/types/document';

export function VersionHistoryCard({
  selectedFile,
  selectedFileHistory,
}: {
  selectedFile: DocumentFile;
  selectedFileHistory: VersionEntry[];
}) {
  return (
    <Card
      style={{ borderRadius: 8, boxShadow: '0 2px 10px rgba(0,0,0,0.08)' }}
      styles={{ body: { padding: 0 } }}
    >
      <Collapse
        defaultActiveKey={['version-history']}
        ghost
        items={[
          {
            key: 'version-history',
            label: (
              <span style={{ fontWeight: 600, fontSize: 16 }}>
                ประวัติเวอร์ชัน — {selectedFile.name}
              </span>
            ),
            children: (
              <div style={{ padding: '0 16px 16px' }}>
                <Timeline
                  items={selectedFileHistory.map((entry, index) => ({
                    color: index === 0 ? COLORS.accentTeal : COLORS.info,
                    children: (
                      <div>
                        <Tag color="blue">v{entry.version}</Tag>
                        <span style={{ fontWeight: 500 }}>{formatThaiDate(entry.date)}</span>
                        <span style={{ margin: '0 8px', color: '#999' }}>|</span>
                        <span>{entry.author}</span>
                        <br />
                        <span style={{ color: '#666' }}>{entry.note}</span>
                      </div>
                    ),
                  }))}
                />
              </div>
            ),
          },
        ]}
      />
    </Card>
  );
}
