'use client';

import { Button, Form, Input, InputNumber, Modal, Select, Space } from 'antd';
import { DeleteOutlined } from '@ant-design/icons';
import type { FormInstance } from 'antd/es/form';

import type { GanttTask } from '@/types/gantt';

import { LINK_TYPE_OPTIONS, type GanttTaskFormValues } from './constants';

interface GanttTaskFormModalProps {
  open: boolean;
  editingTask: GanttTask | null;
  form: FormInstance<GanttTaskFormValues>;
  taskOptions: Array<{ label: string; value: number }>;
  predecessorOptions: GanttTask[];
  isPending: boolean;
  onCancel: () => void;
  onOk: () => void;
}

export function GanttTaskFormModal({
  open,
  editingTask,
  form,
  taskOptions,
  predecessorOptions,
  isPending,
  onCancel,
  onOk,
}: GanttTaskFormModalProps) {
  return (
    <Modal
      title={editingTask ? 'แก้ไขงานในแผน Gantt' : 'เพิ่มงานในแผน Gantt'}
      open={open}
      onCancel={onCancel}
      onOk={onOk}
      okText="บันทึก"
      cancelText="ยกเลิก"
      confirmLoading={isPending}
      destroyOnClose
    >
      <Form<GanttTaskFormValues> form={form} layout="vertical">
        <Form.Item
          label="ชื่อกิจกรรม"
          name="text"
          rules={[{ required: true, message: 'กรุณาระบุชื่อกิจกรรม' }]}
        >
          <Input />
        </Form.Item>
        <Form.Item
          label="ผู้รับผิดชอบ"
          name="owner"
          rules={[{ required: true, message: 'กรุณาระบุผู้รับผิดชอบ' }]}
        >
          <Input />
        </Form.Item>
        <Form.Item label="ประเภทกิจกรรม" name="type">
          <Select
            options={[
              { label: 'งานหลัก (Project Phase)', value: 'project' },
              { label: 'งานย่อย (Task)', value: 'task' },
              { label: 'Milestone', value: 'milestone' },
            ]}
          />
        </Form.Item>
        <Form.Item label="งานแม่" name="parent">
          <Select
            options={[{ label: 'ระดับบนสุด', value: 0 }, ...taskOptions]}
          />
        </Form.Item>
        <Form.List name="predecessors">
          {(fields, { add, remove }) => (
            <Space direction="vertical" size={12} style={{ width: '100%' }}>
              {fields.map((field, index) => (
                <Space
                  key={field.key}
                  align="start"
                  style={{ display: 'flex', width: '100%' }}
                  size="middle"
                >
                  <Form.Item
                    {...field}
                    label={index === 0 ? 'งานก่อนหน้า' : undefined}
                    name={[field.name, 'taskId']}
                    rules={[{ required: true, message: 'กรุณาเลือกงานก่อนหน้า' }]}
                    style={{ flex: 1 }}
                  >
                    <Select
                      aria-label={`งานก่อนหน้า ${index + 1}`}
                      options={predecessorOptions
                        .filter((task) => task.id !== editingTask?.id && task.type !== 'project')
                        .map((task) => ({ label: task.text, value: task.id }))}
                      placeholder="เลือกงานที่เกี่ยวข้อง"
                    />
                  </Form.Item>
                  <Form.Item
                    {...field}
                    label={index === 0 ? 'ประเภทความสัมพันธ์' : undefined}
                    name={[field.name, 'linkType']}
                    initialValue="FS"
                    style={{ width: 220 }}
                  >
                    <Select
                      aria-label={`ประเภทความสัมพันธ์ ${index + 1}`}
                      options={LINK_TYPE_OPTIONS}
                    />
                  </Form.Item>
                  <Form.Item
                    {...field}
                    label={index === 0 ? 'Lag (วัน)' : undefined}
                    name={[field.name, 'lagDays']}
                    initialValue={0}
                    style={{ width: 140 }}
                  >
                    <InputNumber aria-label={`Lag ${index + 1}`} style={{ width: '100%' }} />
                  </Form.Item>
                  <Button
                    aria-label={`ลบงานก่อนหน้า ${index + 1}`}
                    icon={<DeleteOutlined />}
                    onClick={() => remove(field.name)}
                  />
                </Space>
              ))}
              <Button
                onClick={() => add({ taskId: undefined, linkType: 'FS', lagDays: 0 })}
              >
                เพิ่มงานก่อนหน้า
              </Button>
            </Space>
          )}
        </Form.List>
        <Space style={{ display: 'flex' }} size="middle" align="start">
          <Form.Item
            label="วันเริ่มต้น"
            name="start_date"
            rules={[{ required: true, message: 'กรุณาเลือกวันเริ่มต้น' }]}
          >
            <Input placeholder="เลือกวันเริ่มต้น" />
          </Form.Item>
          <Form.Item
            label="วันสิ้นสุด"
            name="end_date"
            rules={[{ required: true, message: 'กรุณาเลือกวันสิ้นสุด' }]}
          >
            <Input placeholder="เลือกวันสิ้นสุด" />
          </Form.Item>
        </Space>
        <Form.Item
          label="% ความคืบหน้า"
          name="progress"
          rules={[{ required: true, message: 'กรุณาระบุความคืบหน้า' }]}
        >
          <InputNumber min={0} max={100} style={{ width: '100%' }} />
        </Form.Item>
      </Form>
    </Modal>
  );
}
