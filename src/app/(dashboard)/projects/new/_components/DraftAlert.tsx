'use client';

import { Alert, Button, Space } from 'antd';
import dayjs from 'dayjs';

export function DraftAlert({
  savedDraftAt,
  currentUserName,
  onLoadDraft,
  onDiscardDraft,
}: {
  savedDraftAt: string;
  currentUserName: string;
  onLoadDraft: () => void;
  onDiscardDraft: () => void;
}) {
  return (
    <Alert
      type="info"
      showIcon
      style={{ marginBottom: 16 }}
      message="พบร่างโครงการที่บันทึกไว้"
      description={`บันทึกล่าสุดเมื่อ ${dayjs(savedDraftAt).format('DD/MM/YYYY HH:mm')} สำหรับผู้ใช้ ${currentUserName}`}
      action={(
        <Space>
          <Button size="small" onClick={onLoadDraft}>
            โหลดร่างล่าสุด
          </Button>
          <Button size="small" danger onClick={onDiscardDraft}>
            ลบร่าง
          </Button>
        </Space>
      )}
    />
  );
}
