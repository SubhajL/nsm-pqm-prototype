'use client';

import { Col, Divider, Form, Input, Row, Select, Typography } from 'antd';

import {
  contractingModelOptions,
  deliveryMethodOptions,
  projectClassOptions,
} from './helpers';

const { Text } = Typography;
const { TextArea } = Input;

export function BasicInfoSection() {
  return (
    <>
      <Divider orientation="left" orientationMargin={0}>
        <Text strong style={{ fontSize: 16 }}>
          ข้อมูลพื้นฐานโครงการ (Basic Information)
        </Text>
      </Divider>

      <Row gutter={24}>
        <Col xs={24} md={16}>
          <Form.Item
            label="ชื่อโครงการ (Project Name)"
            name="name"
            rules={[{ required: true, message: 'กรุณาระบุชื่อโครงการ' }]}
          >
            <Input placeholder="ระบุชื่อโครงการ" />
          </Form.Item>
        </Col>
        <Col xs={24} md={8}>
          <Form.Item label="รหัสโครงการ (Project Code)" name="code">
            <Input disabled addonBefore="Auto" placeholder="ระบบจะสร้างให้อัตโนมัติ" />
          </Form.Item>
        </Col>
      </Row>

      <Row gutter={24}>
        <Col xs={24} md={12}>
          <Form.Item
            label="ประเภทโครงการ (Project Class)"
            name="projectClass"
            rules={[{ required: true, message: 'กรุณาเลือกประเภทโครงการ' }]}
          >
            <Select
              placeholder="เลือกประเภทโครงการ"
              options={projectClassOptions}
            />
          </Form.Item>
        </Col>
        <Col xs={24} md={12}>
          <Form.Item
            label="รูปแบบการดำเนินโครงการ (Delivery Method)"
            name="deliveryMethod"
            rules={[{ required: true, message: 'กรุณาเลือกรูปแบบการดำเนินโครงการ' }]}
          >
            <Select
              placeholder="เลือกรูปแบบการดำเนินโครงการ"
              options={deliveryMethodOptions}
            />
          </Form.Item>
        </Col>
      </Row>

      <Row gutter={24}>
        <Col xs={24} md={12}>
          <Form.Item
            label="รูปแบบสัญญา (Contracting Model)"
            name="contractingModel"
            tooltip="เลือกได้หากกำหนดเงื่อนไขสัญญาแล้ว มิฉะนั้นเว้นว่างไว้"
          >
            <Select
              placeholder="ยังไม่ระบุ (Not Specified)"
              allowClear
              options={contractingModelOptions}
            />
          </Form.Item>
        </Col>
      </Row>

      <Form.Item
        label="วัตถุประสงค์ (Objectives)"
        name="objectives"
        rules={[{ required: true, message: 'กรุณาระบุวัตถุประสงค์' }]}
      >
        <TextArea rows={3} placeholder="ระบุวัตถุประสงค์ของโครงการ" />
      </Form.Item>

      <Form.Item label="คำอธิบาย (Description)" name="description">
        <TextArea rows={3} placeholder="ระบุรายละเอียดเพิ่มเติม (ถ้ามี)" />
      </Form.Item>
    </>
  );
}
