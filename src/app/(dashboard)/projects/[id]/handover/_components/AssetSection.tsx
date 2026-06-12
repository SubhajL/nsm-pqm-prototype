'use client';

import { useState } from 'react';
import {
  Button,
  DatePicker,
  Form,
  Input,
  List,
  Select,
  Space,
  Tag,
  Typography,
  message,
} from 'antd';
import type { Dayjs } from 'dayjs';

import { announce } from '@/components/a11y';
import { BahtInput, EmptyState } from '@/components/common';
import { useCreateAssetRegistration } from '@/hooks/useHandover';
import { formatBaht, formatThaiDateShort } from '@/lib/date-utils';
import {
  ASSET_TYPES,
  ASSET_TYPE_LABELS,
  type AssetRegistration,
  type AssetType,
} from '@/types/asset-registration';

const { Text } = Typography;

interface AssetSectionProps {
  packetId: string;
  assets: AssetRegistration[];
  canManage: boolean;
}

interface AssetFormValues {
  assetCode: string;
  assetType: AssetType;
  installedAt: Dayjs;
  installedLocation: string;
  initialValue: number;
}

/** ทะเบียนทรัพย์สิน rail — feeds the downstream GFMIS asset register. */
export function AssetSection({ packetId, assets, canManage }: AssetSectionProps) {
  const [form] = Form.useForm<AssetFormValues>();
  const [formOpen, setFormOpen] = useState(false);
  const createAsset = useCreateAssetRegistration(packetId);

  const handleSubmit = async () => {
    const values = await form.validateFields().catch(() => null);
    if (!values) return;
    try {
      await createAsset.mutateAsync({
        assetCode: values.assetCode.trim(),
        assetType: values.assetType,
        installedAt: values.installedAt.format('YYYY-MM-DD'),
        installedLocation: values.installedLocation.trim(),
        initialValue: values.initialValue,
      });
      message.success('ลงทะเบียนทรัพย์สินแล้ว');
      announce('ลงทะเบียนทรัพย์สินเรียบร้อยแล้ว');
      form.resetFields();
      setFormOpen(false);
    } catch (error) {
      if (error instanceof Error) {
        message.error(error.message);
        announce(`เกิดข้อผิดพลาด: ${error.message}`, 'assertive');
      }
    }
  };

  return (
    <section aria-label="ทะเบียนทรัพย์สิน (Asset registrations)">
      {assets.length === 0 ? (
        <EmptyState size="small" title="ยังไม่มีทรัพย์สิน (No assets registered yet)" />
      ) : (
        <List
          size="small"
          dataSource={assets}
          renderItem={(asset) => {
            const label = ASSET_TYPE_LABELS[asset.assetType];
            return (
              <List.Item>
                <Space direction="vertical" size={0}>
                  <Space>
                    <Text strong>{asset.assetCode}</Text>
                    <Tag>{`${label.th} (${label.en})`}</Tag>
                  </Space>
                  <Text type="secondary">
                    {`${asset.installedLocation} · ${formatThaiDateShort(asset.installedAt)} · ${formatBaht(asset.initialValue)}`}
                  </Text>
                </Space>
              </List.Item>
            );
          }}
        />
      )}

      {canManage && !formOpen && (
        <Button onClick={() => setFormOpen(true)} style={{ marginTop: 8 }}>
          ลงทะเบียนทรัพย์สิน (Register Asset)
        </Button>
      )}

      {canManage && formOpen && (
        <Form form={form} layout="vertical" style={{ marginTop: 8 }}>
          <Form.Item
            name="assetCode"
            label="รหัสทรัพย์สิน (Asset Code)"
            rules={[{ required: true, message: 'กรุณาระบุรหัสทรัพย์สิน' }]}
          >
            <Input placeholder="เช่น WS-LCS-001" />
          </Form.Item>
          <Form.Item
            name="assetType"
            label="ประเภท (Type)"
            rules={[{ required: true, message: 'กรุณาเลือกประเภท' }]}
          >
            <Select
              placeholder="เลือกประเภททรัพย์สิน"
              options={ASSET_TYPES.map((type) => ({
                value: type,
                label: `${ASSET_TYPE_LABELS[type].th} (${ASSET_TYPE_LABELS[type].en})`,
              }))}
            />
          </Form.Item>
          <Form.Item
            name="installedAt"
            label="วันที่ติดตั้ง (Installed At)"
            rules={[{ required: true, message: 'กรุณาระบุวันที่ติดตั้ง' }]}
          >
            <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" />
          </Form.Item>
          <Form.Item
            name="installedLocation"
            label="สถานที่ติดตั้ง (Location)"
            rules={[{ required: true, message: 'กรุณาระบุสถานที่' }]}
          >
            <Input placeholder="เช่น อาคารนิทรรศการหลัก ชั้น 2" />
          </Form.Item>
          <Form.Item
            name="initialValue"
            label="มูลค่าเริ่มต้น (Initial Value, บาท)"
            rules={[{ required: true, message: 'กรุณาระบุมูลค่า' }]}
          >
            <BahtInput min={0} />
          </Form.Item>
          <Space>
            <Button
              onClick={() => {
                form.resetFields();
                setFormOpen(false);
              }}
            >
              ยกเลิก (Cancel)
            </Button>
            <Button type="primary" loading={createAsset.isPending} onClick={handleSubmit}>
              บันทึก (Save)
            </Button>
          </Space>
        </Form>
      )}
    </section>
  );
}
