'use client';

import { DatePicker, Form, Input, InputNumber, Modal, Select, Typography, message } from 'antd';
import type { Dayjs } from 'dayjs';

import { announce } from '@/components/a11y';
import {
  useCreateAwardedContract,
  useEngineeringEstimates,
} from '@/hooks/useProcurement';
import type { ProcurementPackage } from '@/types/procurement-package';
import { CONTRACTING_MODEL_LABELS } from '@/types/project';
import { CONTRACTING_MODELS, type ContractingModel } from '@/types/rid/vocabulary';

import { compatibleContractingModelsForBasis } from './procurement-actions';

const { Text } = Typography;

interface CreateContractModalProps {
  projectId: string;
  /** Only packages in `awarded` state may produce a contract. */
  awardedPackages: ProcurementPackage[];
  open: boolean;
  onClose: () => void;
}

interface CreateContractFormValues {
  procurementPackageId: string;
  contractNumber: string;
  contractorName: string;
  contractorTaxId?: string;
  awardAmount: number;
  contractingModel: ContractingModel;
  signedAt?: Dayjs;
  expirationDate?: Dayjs;
  warrantyMonths?: number;
}

export function CreateContractModal({
  projectId,
  awardedPackages,
  open,
  onClose,
}: CreateContractModalProps) {
  const [form] = Form.useForm<CreateContractFormValues>();
  const createContract = useCreateAwardedContract(projectId);

  // Estimate-basis compatibility hint: when the selected package has an
  // engineering estimate, models its basis cannot price are disabled (the
  // server-side guard remains the authority).
  const selectedPackageId = Form.useWatch('procurementPackageId', form);
  const { data: estimates } = useEngineeringEstimates(selectedPackageId);
  const latestBasis = estimates?.[estimates.length - 1]?.basis ?? null;
  const compatibleModels = latestBasis
    ? compatibleContractingModelsForBasis(latestBasis)
    : null;

  const close = () => {
    form.resetFields();
    onClose();
  };

  const handleOk = async () => {
    let values: CreateContractFormValues;
    try {
      values = await form.validateFields();
    } catch {
      return; // antd shows the field-level errors
    }

    try {
      await createContract.mutateAsync({
        procurementPackageId: values.procurementPackageId,
        contractNumber: values.contractNumber.trim(),
        contractorName: values.contractorName.trim(),
        contractorTaxId: values.contractorTaxId?.trim() || null,
        awardAmount: values.awardAmount,
        contractingModel: values.contractingModel,
        signedAt: values.signedAt ? values.signedAt.format('YYYY-MM-DD') : null,
        expirationDate: values.expirationDate
          ? values.expirationDate.format('YYYY-MM-DD')
          : null,
        warrantyMonths: values.warrantyMonths ?? null,
      });
      message.success('บันทึกสัญญาแล้ว');
      announce('บันทึกสัญญาเรียบร้อยแล้ว');
      close();
    } catch (error) {
      if (error instanceof Error) {
        message.error(error.message);
        announce(`เกิดข้อผิดพลาด: ${error.message}`, 'assertive');
      }
    }
  };

  return (
    <Modal
      title="บันทึกสัญญา (Record Awarded Contract)"
      open={open}
      onOk={handleOk}
      onCancel={close}
      confirmLoading={createContract.isPending}
      okText="บันทึก (Save)"
      cancelText="ยกเลิก (Cancel)"
    >
      <Form form={form} layout="vertical" requiredMark style={{ marginTop: 12 }}>
        <Form.Item
          name="procurementPackageId"
          label="ชุดจัดซื้อ (Procurement Package)"
          rules={[{ required: true, message: 'กรุณาเลือกชุดจัดซื้อ' }]}
        >
          <Select
            placeholder="เลือกชุดจัดซื้อที่ลงนามแล้ว"
            options={awardedPackages.map((pkg) => ({
              value: pkg.id,
              label: pkg.name,
            }))}
          />
        </Form.Item>
        <Form.Item
          name="contractNumber"
          label="เลขที่สัญญา (Contract No.)"
          rules={[{ required: true, message: 'กรุณาระบุเลขที่สัญญา' }]}
        >
          <Input placeholder="เช่น สธ 123/2569" />
        </Form.Item>
        <Form.Item
          name="contractorName"
          label="คู่สัญญา (Contractor)"
          rules={[{ required: true, message: 'กรุณาระบุชื่อคู่สัญญา' }]}
        >
          <Input placeholder="ชื่อบริษัทคู่สัญญา" />
        </Form.Item>
        <Form.Item name="contractorTaxId" label="เลขประจำตัวผู้เสียภาษี (Tax ID)">
          <Input maxLength={13} placeholder="13 หลัก" />
        </Form.Item>
        <Form.Item
          name="awardAmount"
          label="มูลค่าสัญญา (Award Amount, บาท)"
          rules={[{ required: true, message: 'กรุณาระบุมูลค่าสัญญา' }]}
        >
          <InputNumber<number>
            min={0}
            style={{ width: '100%' }}
            formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
            parser={(value) => Number((value ?? '').replace(/,/g, ''))}
          />
        </Form.Item>
        <Form.Item
          name="contractingModel"
          label="รูปแบบสัญญา (Contracting Model)"
          rules={[{ required: true, message: 'กรุณาเลือกรูปแบบสัญญา' }]}
          extra={
            compatibleModels ? (
              <Text type="secondary">
                รูปแบบที่เข้ากับราคากลางล่าสุดเท่านั้นที่เลือกได้ (models
                incompatible with the latest estimate basis are disabled)
              </Text>
            ) : null
          }
        >
          <Select
            placeholder="เลือกรูปแบบสัญญา"
            options={CONTRACTING_MODELS.map((model) => ({
              value: model,
              label: `${CONTRACTING_MODEL_LABELS[model].th} (${CONTRACTING_MODEL_LABELS[model].en})`,
              disabled: compatibleModels !== null && !compatibleModels.includes(model),
            }))}
          />
        </Form.Item>
        <Form.Item name="signedAt" label="วันที่ลงนาม (Signed At)">
          <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" />
        </Form.Item>
        <Form.Item name="expirationDate" label="วันสิ้นสุดสัญญา (Expiration)">
          <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" />
        </Form.Item>
        <Form.Item name="warrantyMonths" label="ระยะประกัน (Warranty, เดือน)">
          <InputNumber min={0} style={{ width: '100%' }} />
        </Form.Item>
      </Form>
    </Modal>
  );
}
