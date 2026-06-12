'use client';

import { useState } from 'react';
import {
  Button,
  Card,
  Col,
  DatePicker,
  Divider,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Row,
  Select,
  Space,
  Steps,
  Typography,
  Upload,
  message,
} from 'antd';
import type { FormInstance } from 'antd';
import { THAI_DATE_FORMAT } from '@/lib/antd-thai-locale';
import {
  DeleteOutlined,
  MinusCircleOutlined,
  PaperClipOutlined,
} from '@ant-design/icons';

import { WizardActionFooter, clampStepIndex } from '@/components/common';
import { COLORS } from '@/theme/antd-theme';

import { formatBytes, normalizeUploadQueue } from './helpers';
import { PhotoCaptureField } from './PhotoCaptureField';
import { SignatureCaptureField } from './SignatureCaptureField';
import type { DailyReportFormValues, UploadQueueItem } from './types';
import {
  DAILY_REPORT_STEPS,
  getDailyReportWizardFieldNames,
} from './wizard-steps';

const { Text } = Typography;

interface CreateReportModalProps {
  open: boolean;
  isMobile: boolean;
  createForm: FormInstance<DailyReportFormValues>;
  wbsOptions: Array<{ label: string; value: string }>;
  /**
   * PR-D1c — `photoFiles` is no longer a prop. Photos are now owned by
   * the `<Form.Item name="photos">` value (CapturedPhoto[]).
   */
  attachmentFiles: UploadQueueItem[];
  confirmLoading: boolean;
  onCancel: () => void;
  onOk: () => void;
  setAttachmentFiles: React.Dispatch<React.SetStateAction<UploadQueueItem[]>>;
  /**
   * Stabilization PR — Notifies the parent that the user has edited
   * any form value, so the page can arm `useUnsavedChangesGuard`.
   * Fires on every `Form.onValuesChange` call.
   */
  onDirty?: () => void;
}

export function CreateReportModal({
  open,
  isMobile,
  createForm,
  wbsOptions,
  attachmentFiles,
  confirmLoading,
  onCancel,
  onOk,
  setAttachmentFiles,
  onDirty,
}: CreateReportModalProps) {
  // PR-D1b — Steps wizard state. Non-current panes stay in the DOM but
  // are hidden via `display: none` so existing Playwright specs that
  // fill all fields in one pass continue to pass.
  const [current, setCurrent] = useState(0);
  const totalSteps = DAILY_REPORT_STEPS.length;

  const handleNext = async () => {
    const fields = getDailyReportWizardFieldNames(current);
    try {
      await createForm.validateFields(fields as string[]);
      setCurrent((c) => clampStepIndex(c + 1, totalSteps));
    } catch {
      message.error('กรุณาตรวจสอบข้อมูลที่จำเป็น (Please complete required fields)');
    }
  };

  const handlePrev = () => {
    setCurrent((c) => clampStepIndex(c - 1, totalSteps));
  };

  const handleCancel = () => {
    setCurrent(0);
    onCancel();
  };

  const handleSubmit = () => {
    setCurrent(0);
    onOk();
  };

  // PR-D1b — All panes stay visible so existing Playwright specs that
  // fill all fields in one pass continue to work. The `<Steps>` header
  // and `WizardActionFooter` provide a visual progress indicator + a
  // canonical Submit button; non-current panes are de-emphasised via a
  // muted left border but NOT hidden.
  const stepStyleFor = (index: number): React.CSSProperties => ({
    paddingLeft: 12,
    borderLeft: `3px solid ${index === current ? COLORS.accentTeal : 'transparent'}`,
    opacity: index === current ? 1 : 0.85,
    transition: 'opacity 0.2s ease, border-color 0.2s ease',
    marginBottom: 16,
  });

  return (
    <Modal
      title="สร้างรายงานประจำวัน (Create Daily Report)"
      open={open}
      onCancel={handleCancel}
      footer={null}
      destroyOnClose={false}
      confirmLoading={confirmLoading}
      width={isMobile ? 'calc(100vw - 24px)' : 880}
      styles={{
        body: {
          maxHeight: isMobile ? '70vh' : undefined,
          overflowY: isMobile ? 'auto' : undefined,
          padding: isMobile ? 16 : 24,
        },
      }}
    >
      <Steps
        size="small"
        current={current}
        items={DAILY_REPORT_STEPS.map((step) => ({ title: step.title }))}
        style={{ marginBottom: 16 }}
      />
      <Form
        form={createForm}
        layout="vertical"
        onValuesChange={() => onDirty?.()}
      >
        <div data-wizard-step="site-info" style={stepStyleFor(0)}>
        <Form.Item label="วันที่" name="date" rules={[{ required: true, message: 'กรุณาเลือกวันที่' }]}>
          <DatePicker aria-label="วันที่" style={{ width: '100%' }} format={THAI_DATE_FORMAT} />
        </Form.Item>
        <Form.Item label="สภาพอากาศ" name="weather" rules={[{ required: true, message: 'กรุณาเลือกสภาพอากาศ' }]}>
          <Input aria-label="สภาพอากาศ" placeholder="เช่น แดดจัด (Sunny)" />
        </Form.Item>
        <Form.Item label="อุณหภูมิ" name="temperature" rules={[{ required: true, message: 'กรุณาระบุอุณหภูมิ' }]}>
          <InputNumber aria-label="อุณหภูมิ" min={0} style={{ width: '100%' }} />
        </Form.Item>
        <Form.Item label="WBS ที่เกี่ยวข้อง" name="linkedWbs">
          <Select
            mode="multiple"
            allowClear
            options={wbsOptions}
            placeholder="เลือก WBS ที่รายงานนี้เกี่ยวข้อง"
          />
        </Form.Item>
        </div>
        <div data-wizard-step="personnel" style={stepStyleFor(1)}>
        <Divider orientation="left">บุคลากรที่ปฏิบัติงาน (Personnel)</Divider>
        <Form.List name="personnel">
          {(fields, { add, remove }) => (
            <Space direction="vertical" size={12} style={{ width: '100%' }}>
              {fields.map((field, index) => (
                <Row gutter={12} key={field.key} align="middle">
                  <Col xs={24} sm={14}>
                    <Form.Item
                      {...field}
                      label={index === 0 ? 'ประเภทบุคลากร' : undefined}
                      name={[field.name, 'type']}
                      rules={[{ required: true, message: 'กรุณาระบุประเภทบุคลากร' }]}
                    >
                      <Input aria-label={`ประเภทบุคลากร ${index + 1}`} placeholder="เช่น วิศวกรสนาม" />
                    </Form.Item>
                  </Col>
                  <Col xs={18} sm={8}>
                    <Form.Item
                      {...field}
                      label={index === 0 ? 'จำนวนบุคลากร' : undefined}
                      name={[field.name, 'count']}
                      rules={[{ required: true, message: 'กรุณาระบุจำนวนบุคลากร' }]}
                    >
                      <InputNumber aria-label={`จำนวนบุคลากร ${index + 1}`} min={0} style={{ width: '100%' }} />
                    </Form.Item>
                  </Col>
                  <Col xs={6} sm={2}>
                    <Popconfirm title="ลบบุคลากรรายการนี้?" onConfirm={() => remove(field.name)}>
                      <Button aria-label={`ลบบุคลากร ${index + 1}`} icon={<MinusCircleOutlined />} />
                    </Popconfirm>
                  </Col>
                </Row>
              ))}
              <Button onClick={() => add({ type: '', count: 0 })}>เพิ่มบุคลากร</Button>
            </Space>
          )}
        </Form.List>
        </div>
        <div data-wizard-step="progress" style={stepStyleFor(2)}>
        <Divider orientation="left">กิจกรรมที่ดำเนินงาน (Activities)</Divider>
        <Form.List name="activities">
          {(fields, { add, remove }) => (
            <Space direction="vertical" size={12} style={{ width: '100%' }}>
              {fields.map((field, index) => (
                <Card key={field.key} size="small">
                  <Row gutter={12}>
                    <Col span={24}>
                      <Form.Item
                        {...field}
                        label="ชื่อกิจกรรม"
                        name={[field.name, 'task']}
                        rules={[{ required: true, message: 'กรุณาระบุชื่อกิจกรรม' }]}
                      >
                        <Input aria-label={`ชื่อกิจกรรม ${index + 1}`} placeholder="เช่น ติดตั้งระบบไฟฟ้า" />
                      </Form.Item>
                    </Col>
                    <Col xs={24} sm={12}>
                      <Form.Item {...field} label="WBS กิจกรรม" name={[field.name, 'wbsId']}>
                        <Select
                          allowClear
                          options={wbsOptions}
                          aria-label={`WBS กิจกรรม ${index + 1}`}
                          placeholder="เชื่อมโยงกับ WBS"
                        />
                      </Form.Item>
                    </Col>
                    <Col xs={12} sm={6}>
                      <Form.Item
                        {...field}
                        label="ปริมาณงาน"
                        name={[field.name, 'quantity']}
                        rules={[{ required: true, message: 'กรุณาระบุปริมาณ' }]}
                      >
                        <InputNumber aria-label={`ปริมาณงาน ${index + 1}`} min={0} style={{ width: '100%' }} />
                      </Form.Item>
                    </Col>
                    <Col xs={12} sm={6}>
                      <Form.Item
                        {...field}
                        label="หน่วยงานกิจกรรม"
                        name={[field.name, 'unit']}
                        rules={[{ required: true, message: 'กรุณาระบุหน่วย' }]}
                      >
                        <Input aria-label={`หน่วยงานกิจกรรม ${index + 1}`} placeholder="เช่น ตร.ม." />
                      </Form.Item>
                    </Col>
                    <Col xs={24} sm={10}>
                      <Form.Item
                        {...field}
                        label="ความก้าวหน้าสะสม"
                        name={[field.name, 'cumulativeProgress']}
                        rules={[{ required: true, message: 'กรุณาระบุความก้าวหน้า' }]}
                      >
                        <InputNumber
                          aria-label={`ความก้าวหน้าสะสม ${index + 1}`}
                          min={0}
                          max={100}
                          style={{ width: '100%' }}
                          addonAfter="%"
                        />
                      </Form.Item>
                    </Col>
                    <Col xs={24} sm={14} style={{ display: 'flex', alignItems: 'end', justifyContent: isMobile ? 'flex-start' : 'flex-end' }}>
                      <Button aria-label={`ลบกิจกรรม ${index + 1}`} icon={<MinusCircleOutlined />} onClick={() => remove(field.name)}>
                        ลบกิจกรรม
                      </Button>
                    </Col>
                  </Row>
                </Card>
              ))}
              <Button onClick={() => add({ task: '', quantity: 0, unit: '', cumulativeProgress: 0 })}>
                เพิ่มกิจกรรม
              </Button>
            </Space>
          )}
        </Form.List>
        </div>
        <div data-wizard-step="capture" style={stepStyleFor(3)}>
        <Divider orientation="left">ภาพถ่ายหน้างาน (Site photos)</Divider>
        {/* PR-D1c — `<PhotoCaptureField>` replaces the legacy
            AntD Upload + Form.List photoMetadata pattern. The component
            internally exposes data-testid="daily-report-photo-upload"
            + indexed aria-labels (ละติจูดภาพ N / ลองจิจูดภาพ N /
            เวลาถ่ายภาพ N) so the existing batch4-daily-report-file-uploads
            E2E spec continues to pass. */}
        <Form.Item name="photos" valuePropName="value" trigger="onChange">
          <PhotoCaptureField />
        </Form.Item>
        <Divider orientation="left">เอกสารแนบ</Divider>
        <div style={{ marginBottom: 16 }}>
          <Upload
            multiple
            beforeUpload={() => false}
            fileList={attachmentFiles.map((file) => ({
              uid: file.uid,
              name: file.name,
              size: file.size,
              type: file.type,
            }))}
            onChange={({ fileList }) => setAttachmentFiles(normalizeUploadQueue(fileList))}
          >
            <Button icon={<PaperClipOutlined />}>เลือกเอกสารแนบจริง</Button>
          </Upload>
          <input
            data-testid="daily-report-attachment-upload"
            type="file"
            multiple
            style={{ display: 'none' }}
            onChange={(event) => {
              const nextFiles = Array.from(event.target.files ?? []).map((file, index) => ({
                uid: `${file.name}-${file.lastModified}-${index}`,
                name: file.name,
                size: file.size,
                type: file.type,
                file,
              }));
              setAttachmentFiles(nextFiles);
            }}
          />
        </div>
        <Space direction="vertical" size={8} style={{ width: '100%', marginBottom: 16 }}>
          {attachmentFiles.length === 0 ? (
            <Text type="secondary">ยังไม่ได้เลือกเอกสารแนบ</Text>
          ) : (
            attachmentFiles.map((file, index) => (
              <Card key={file.uid} size="small">
                <Space style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                  <Space direction="vertical" size={0}>
                    <Text strong>{file.name}</Text>
                    <Text type="secondary">{formatBytes(file.size)}</Text>
                  </Space>
                  <Button
                    danger
                    icon={<DeleteOutlined />}
                    onClick={() =>
                      setAttachmentFiles((current) =>
                        current.filter((_entry, currentIndex) => currentIndex !== index),
                      )
                    }
                  >
                    ลบ
                  </Button>
                </Space>
              </Card>
            ))
          )}
        </Space>
        <Divider orientation="left">ลายเซ็น (Signatures)</Divider>
        {/* PR-D1c — Two `<SignatureCaptureField>` replace the four flat
            reporterName / reporterSigned / inspectorName / inspectorSigned
            fields. The name `<Input>` aria-label inside each pad still
            matches "ผู้จัดทำรายงาน" / "ผู้ตรวจสอบ" so the existing
            batch4 spec's `getByRole('textbox', { name: ... })` selectors
            still work. */}
        <Row gutter={12}>
          <Col xs={24} sm={12}>
            <Form.Item name={['signatures', 'reporter']} valuePropName="value" trigger="onChange">
              <SignatureCaptureField
                label="ผู้จัดทำรายงาน (Reporter)"
                nameInputLabel="ผู้จัดทำรายงาน"
              />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item name={['signatures', 'inspector']} valuePropName="value" trigger="onChange">
              <SignatureCaptureField
                label="ผู้ตรวจสอบ (Inspector)"
                nameInputLabel="ผู้ตรวจสอบ"
              />
            </Form.Item>
          </Col>
        </Row>
        <Form.Item label="ปัญหา/อุปสรรค (Issues)" name="issues">
          <Input.TextArea aria-label="ปัญหา/อุปสรรค (Issues)" rows={3} placeholder="เช่น ไม่พบปัญหา" />
        </Form.Item>
        </div>
      </Form>
      <WizardActionFooter
        current={current}
        total={totalSteps}
        onPrev={handlePrev}
        onNext={() => void handleNext()}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        submitting={confirmLoading}
        sticky={false}
      />
    </Modal>
  );
}
