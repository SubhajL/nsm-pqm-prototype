'use client';

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
  Switch,
  Typography,
  Upload,
} from 'antd';
import type { FormInstance } from 'antd';
import {
  DeleteOutlined,
  MinusCircleOutlined,
  PaperClipOutlined,
  UploadOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';

import { formatBytes, normalizeUploadQueue } from './helpers';
import type { DailyReportFormValues, UploadQueueItem } from './types';

const { Text } = Typography;

interface CreateReportModalProps {
  open: boolean;
  isMobile: boolean;
  createForm: FormInstance<DailyReportFormValues>;
  wbsOptions: Array<{ label: string; value: string }>;
  photoFiles: UploadQueueItem[];
  attachmentFiles: UploadQueueItem[];
  confirmLoading: boolean;
  onCancel: () => void;
  onOk: () => void;
  setPhotoFiles: React.Dispatch<React.SetStateAction<UploadQueueItem[]>>;
  setAttachmentFiles: React.Dispatch<React.SetStateAction<UploadQueueItem[]>>;
}

export function CreateReportModal({
  open,
  isMobile,
  createForm,
  wbsOptions,
  photoFiles,
  attachmentFiles,
  confirmLoading,
  onCancel,
  onOk,
  setPhotoFiles,
  setAttachmentFiles,
}: CreateReportModalProps) {
  return (
    <Modal
      title="สร้างรายงานประจำวัน"
      open={open}
      onCancel={onCancel}
      onOk={onOk}
      okText="บันทึก"
      cancelText="ยกเลิก"
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
      <Form form={createForm} layout="vertical">
        <Form.Item label="วันที่" name="date" rules={[{ required: true, message: 'กรุณาเลือกวันที่' }]}>
          <DatePicker aria-label="วันที่" style={{ width: '100%' }} format="DD/MM/YYYY" />
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
        <Divider orientation="left">บุคลากรที่ปฏิบัติงาน</Divider>
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
        <Divider orientation="left">กิจกรรมที่ดำเนินงาน</Divider>
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
        <Divider orientation="left">ภาพถ่ายหน้างาน</Divider>
        <div style={{ marginBottom: 16 }}>
          <Upload
            multiple
            accept="image/*"
            beforeUpload={() => false}
            fileList={photoFiles.map((file) => ({
              uid: file.uid,
              name: file.name,
              size: file.size,
              type: file.type,
            }))}
            onChange={({ fileList }) => {
              const nextFiles = normalizeUploadQueue(fileList);
              const previousMetadata = createForm.getFieldValue('photoMetadata') ?? [];
              createForm.setFieldValue(
                'photoMetadata',
                nextFiles.map((_, index) => previousMetadata[index] ?? {
                  gpsLat: 13.7563,
                  gpsLng: 100.5018,
                  timestamp: dayjs().format('YYYY-MM-DDTHH:mm:ss'),
                }),
              );
              setPhotoFiles(nextFiles);
            }}
            onRemove={(file) => {
              const nextFiles = photoFiles.filter((item) => item.uid !== file.uid);
              const nextMetadata = (createForm.getFieldValue('photoMetadata') ?? []).filter(
                (_entry: DailyReportFormValues['photoMetadata'][number], index: number) =>
                  nextFiles[index] !== undefined,
              );
              createForm.setFieldValue('photoMetadata', nextMetadata);
              setPhotoFiles(nextFiles);
            }}
          >
            <Button icon={<UploadOutlined />}>เลือกภาพถ่ายจริง</Button>
          </Upload>
          <input
            data-testid="daily-report-photo-upload"
            type="file"
            accept="image/*"
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
              const previousMetadata = createForm.getFieldValue('photoMetadata') ?? [];
              createForm.setFieldValue(
                'photoMetadata',
                nextFiles.map((_, index) => previousMetadata[index] ?? {
                  gpsLat: 13.7563,
                  gpsLng: 100.5018,
                  timestamp: dayjs().format('YYYY-MM-DDTHH:mm:ss'),
                }),
              );
              setPhotoFiles(nextFiles);
            }}
          />
        </div>
        <Form.List name="photoMetadata">
          {(fields, { remove }) => (
            <Space direction="vertical" size={12} style={{ width: '100%' }}>
              {fields.map((field, index) => (
                <Card key={field.key} size="small">
                  <Row gutter={12}>
                    <Col xs={24} sm={12}>
                      <Text strong>{photoFiles[index]?.name ?? `ภาพถ่าย ${index + 1}`}</Text>
                      <div>
                        <Text type="secondary">{photoFiles[index] ? formatBytes(photoFiles[index].size) : 'ยังไม่เลือกไฟล์'}</Text>
                      </div>
                    </Col>
                    <Col xs={12} sm={6}>
                      <Form.Item
                        {...field}
                        label="ละติจูดภาพ"
                        name={[field.name, 'gpsLat']}
                        rules={[{ required: true, message: 'กรุณาระบุละติจูด' }]}
                      >
                        <InputNumber aria-label={`ละติจูดภาพ ${index + 1}`} style={{ width: '100%' }} />
                      </Form.Item>
                    </Col>
                    <Col xs={12} sm={6}>
                      <Form.Item
                        {...field}
                        label="ลองจิจูดภาพ"
                        name={[field.name, 'gpsLng']}
                        rules={[{ required: true, message: 'กรุณาระบุลองจิจูด' }]}
                      >
                        <InputNumber aria-label={`ลองจิจูดภาพ ${index + 1}`} style={{ width: '100%' }} />
                      </Form.Item>
                    </Col>
                    <Col xs={24} sm={18}>
                      <Form.Item
                        {...field}
                        label="เวลาถ่ายภาพ"
                        name={[field.name, 'timestamp']}
                        rules={[{ required: true, message: 'กรุณาระบุเวลาถ่ายภาพ' }]}
                      >
                        <Input aria-label={`เวลาถ่ายภาพ ${index + 1}`} placeholder="YYYY-MM-DDTHH:mm:ss" />
                      </Form.Item>
                    </Col>
                    <Col xs={24} sm={6} style={{ display: 'flex', alignItems: 'end', justifyContent: isMobile ? 'flex-start' : 'flex-end' }}>
                      <Button
                        aria-label={`ลบภาพ ${index + 1}`}
                        icon={<MinusCircleOutlined />}
                        onClick={() => {
                          remove(field.name);
                          setPhotoFiles((current) => current.filter((_entry, currentIndex) => currentIndex !== index));
                        }}
                      >
                        ลบภาพ
                      </Button>
                    </Col>
                  </Row>
                </Card>
              ))}
              {fields.length === 0 ? <Text type="secondary">ยังไม่ได้เลือกภาพถ่าย</Text> : null}
            </Space>
          )}
        </Form.List>
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
        <Divider orientation="left">ลายเซ็น</Divider>
        <Row gutter={12}>
          <Col xs={24} sm={12}>
            <Form.Item label="ผู้จัดทำรายงาน" name="reporterName" rules={[{ required: true, message: 'กรุณาระบุผู้จัดทำ' }]}>
              <Input aria-label="ผู้จัดทำรายงาน" />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item label="ผู้ตรวจสอบ" name="inspectorName" rules={[{ required: true, message: 'กรุณาระบุผู้ตรวจสอบ' }]}>
              <Input aria-label="ผู้ตรวจสอบ" />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item label="ผู้จัดทำลงนาม" name="reporterSigned" valuePropName="checked">
              <Switch aria-label="ผู้จัดทำลงนาม" />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item label="ผู้ตรวจสอบลงนาม" name="inspectorSigned" valuePropName="checked">
              <Switch aria-label="ผู้ตรวจสอบลงนาม" />
            </Form.Item>
          </Col>
        </Row>
        <Form.Item label="ปัญหา/อุปสรรค" name="issues">
          <Input.TextArea aria-label="ปัญหา/อุปสรรค" rows={3} placeholder="เช่น ไม่พบปัญหา" />
        </Form.Item>
      </Form>
    </Modal>
  );
}
