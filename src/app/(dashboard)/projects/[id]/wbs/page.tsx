'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Col,
  Empty,
  Form,
  Input,
  InputNumber,
  Modal,
  Progress,
  Row,
  Select,
  Skeleton,
  Space,
  Table,
  Tree,
  Typography,
  message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { DataNode } from 'antd/es/tree';
import {
  DownloadOutlined,
  PlusOutlined,
  SaveOutlined,
  UploadOutlined,
} from '@ant-design/icons';

import { useProject } from '@/hooks/useProjects';
import { useRouteProjectId } from '@/hooks/useRouteProjectId';
import {
  useCreateWBSNode,
  useWBS,
  type CreateWBSNodeInput,
  type WBSNode,
} from '@/hooks/useWBS';
import {
  useBOQ,
  useCreateBOQItem,
  type BOQItem,
  type CreateBOQItemInput,
} from '@/hooks/useBOQ';
import { buildWbsExportDocument } from '@/lib/export-documents';
import { formatBaht } from '@/lib/date-utils';
import { downloadSpreadsheetReport } from '@/lib/export-utils';
import { COLORS } from '@/theme/antd-theme';
import { isOutsourcedProject } from '@/types/project';

const { Title, Text } = Typography;

/* ---------- Utility: flat WBS nodes -> antd Tree structure ---------- */

interface WBSTreeNode extends DataNode {
  key: string;
  title: React.ReactNode;
  children: WBSTreeNode[];
}

function findPreferredWbsNodeId(
  nodes: WBSNode[],
  pendingSelectedWbsId: string | null,
  currentSelectedWbsId?: string,
) {
  if (
    pendingSelectedWbsId &&
    nodes.some((node) => node.id === pendingSelectedWbsId)
  ) {
    return pendingSelectedWbsId;
  }

  if (currentSelectedWbsId && nodes.some((node) => node.id === currentSelectedWbsId)) {
    return currentSelectedWbsId;
  }

  return (
    nodes.find((node) => node.level > 0 && node.hasBOQ)?.id ??
    nodes.find((node) => node.level > 0)?.id ??
    nodes[0]?.id
  );
}

function buildTree(nodes: WBSNode[]): WBSTreeNode[] {
  const map = new Map<string, WBSTreeNode>();
  const roots: WBSTreeNode[] = [];

  // First pass: create tree node entries keyed by id
  for (const node of nodes) {
    map.set(node.id, {
      key: node.id,
      title: (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <span>
            {node.code} {node.name} ({node.weight}%)
          </span>
          <Progress
            percent={node.progress}
            size="small"
            strokeColor={COLORS.accentTeal}
            style={{ width: 80, marginBottom: 0 }}
            format={() => `${node.progress}%`}
          />
        </span>
      ),
      children: [],
    });
  }

  // Second pass: wire children to parents
  for (const node of nodes) {
    const treeNode = map.get(node.id)!;
    if (node.parentId && map.has(node.parentId)) {
      map.get(node.parentId)!.children.push(treeNode);
    } else {
      roots.push(treeNode);
    }
  }

  return roots;
}

/* ---------- Page Component ---------- */

export default function WbsBOQPage() {
  const projectId = useRouteProjectId();
  const { data: project } = useProject(projectId);
  const { data: wbsNodes, isLoading: wbsLoading } = useWBS(projectId);
  const createWbsNode = useCreateWBSNode(projectId);
  const [selectedWbsId, setSelectedWbsId] = useState<string | undefined>(undefined);
  const createBoqItem = useCreateBOQItem(selectedWbsId);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isCreateBoqModalOpen, setIsCreateBoqModalOpen] = useState(false);
  const [pendingSelectedWbsId, setPendingSelectedWbsId] = useState<string | null>(null);
  const [createForm] = Form.useForm<CreateWBSNodeInput>();
  const [createBoqForm] = Form.useForm<CreateBOQItemInput>();

  const { data: boqItems, isLoading: boqLoading } = useBOQ(
    selectedWbsId || undefined,
  );
  const isOutsourced = isOutsourcedProject(project);
  const canCreateBoq = !isOutsourced;

  useEffect(() => {
    if (!wbsNodes || wbsNodes.length === 0) {
      setSelectedWbsId(undefined);
      return;
    }

    setSelectedWbsId((current) => {
      const nextSelectedId = findPreferredWbsNodeId(
        wbsNodes,
        pendingSelectedWbsId,
        current,
      );
      if (pendingSelectedWbsId === nextSelectedId) {
        setPendingSelectedWbsId(null);
      }
      return nextSelectedId;
    });
  }, [pendingSelectedWbsId, wbsNodes]);

  // Build tree data
  const treeData = useMemo(() => {
    if (!wbsNodes) return [];
    return buildTree(wbsNodes);
  }, [wbsNodes]);

  // Default expanded keys: root + all level-1 nodes
  const defaultExpandedKeys = useMemo(() => {
    if (!wbsNodes) return [];
    return wbsNodes
      .filter((n) => n.level <= 1)
      .map((n) => n.id);
  }, [wbsNodes]);

  // Selected node name for right panel title
  const selectedNodeName = useMemo(() => {
    if (!wbsNodes || !selectedWbsId) return '';
    const node = wbsNodes.find((n) => n.id === selectedWbsId);
    return node ? `${node.code} ${node.name}` : '';
  }, [wbsNodes, selectedWbsId]);

  // BOQ total sum
  const boqTotalSum = useMemo(() => {
    if (!boqItems) return 0;
    return boqItems.reduce((sum, item) => sum + item.total, 0);
  }, [boqItems]);

  // Bottom stats
  const stats = useMemo(() => {
    if (!wbsNodes) return { level1: 0, level2: 0, milestones: 0 };
    const level1 = wbsNodes.filter((n) => n.level === 1).length;
    const level2 = wbsNodes.filter((n) => n.level === 2).length;
    // Milestones = level-1 nodes (major deliverables)
    const milestones = level1;
    return { level1, level2, milestones };
  }, [wbsNodes]);

  const eligibleParentOptions = useMemo(
    () =>
      (wbsNodes ?? []).map((node) => ({
        label: `${node.code} ${node.name}`,
        value: node.id,
      })),
    [wbsNodes],
  );

  const openCreateModal = () => {
    createForm.setFieldsValue({ name: '', parentId: selectedWbsId ?? null });
    setIsCreateModalOpen(true);
  };

  const handleExportExcel = () => {
    downloadSpreadsheetReport(
      buildWbsExportDocument({
        project,
        wbsNodes: wbsNodes ?? [],
        selectedNodeName,
        boqItems: boqItems ?? [],
        stats,
        isOutsourced,
      }),
    );
    message.success('ส่งออก WBS/BOQ แล้ว');
  };

  const handleCreateNode = async () => {
    try {
      const values = await createForm.validateFields();
      const createdNode = await createWbsNode.mutateAsync({
        name: values.name.trim(),
        parentId: values.parentId ?? null,
      });
      setPendingSelectedWbsId(createdNode.id);
      setSelectedWbsId(createdNode.id);
      setIsCreateModalOpen(false);
      createForm.resetFields();
      message.success('เพิ่ม WBS node แล้ว');
    } catch (error) {
      if (error instanceof Error && error.message) {
        message.error(error.message);
      }
    }
  };

  const openCreateBoqModal = () => {
    if (!canCreateBoq) {
      message.info('BOQ สำหรับโครงการจ้างภายนอกเป็นแบบอ่านอย่างเดียว');
      return;
    }
    createBoqForm.setFieldsValue({
      description: '',
      quantity: 1,
      unit: '',
      unitPrice: 0,
    });
    setIsCreateBoqModalOpen(true);
  };

  const handleCreateBoqItem = async () => {
    if (!canCreateBoq) {
      message.info('BOQ สำหรับโครงการจ้างภายนอกเป็นแบบอ่านอย่างเดียว');
      return;
    }

    try {
      const values = await createBoqForm.validateFields();
      await createBoqItem.mutateAsync(values);
      setIsCreateBoqModalOpen(false);
      createBoqForm.resetFields();
      message.success('เพิ่มรายการ BOQ แล้ว');
    } catch (error) {
      if (error instanceof Error && error.message) {
        message.error(error.message);
      }
    }
  };

  // BOQ table columns
  const boqColumns: ColumnsType<BOQItem> = [
    {
      title: 'ลำดับ',
      key: 'index',
      width: 60,
      align: 'center',
      render: (_val, _rec, index) => index + 1,
    },
    {
      title: 'รายการ (Description)',
      dataIndex: 'description',
      key: 'description',
    },
    {
      title: 'ปริมาณ (Qty)',
      dataIndex: 'quantity',
      key: 'quantity',
      width: 100,
      align: 'right',
      render: (qty: number) => formatBaht(qty),
    },
    {
      title: 'หน่วย (Unit)',
      dataIndex: 'unit',
      key: 'unit',
      width: 90,
      align: 'center',
    },
    {
      title: 'ราคา/หน่วย (Unit Price)',
      dataIndex: 'unitPrice',
      key: 'unitPrice',
      width: 140,
      align: 'right',
      render: (price: number) => formatBaht(price),
    },
    {
      title: 'รวม (Total)',
      dataIndex: 'total',
      key: 'total',
      width: 140,
      align: 'right',
      render: (total: number) => (
        <span style={{ fontWeight: 600 }}>{formatBaht(total)}</span>
      ),
    },
  ];

  // Loading state
  if (wbsLoading) {
    return (
      <div>
        <Title level={3}>
          โครงสร้างการแบ่งงาน (WBS) & BOQ
        </Title>
        <Row gutter={16}>
          <Col span={10}>
            <Card>
              <Skeleton active paragraph={{ rows: 12 }} />
            </Card>
          </Col>
          <Col span={14}>
            <Card>
              <Skeleton active paragraph={{ rows: 12 }} />
            </Card>
          </Col>
        </Row>
      </div>
    );
  }

  return (
    <div>
      {/* Page Title */}
      <div style={{ marginBottom: 16 }}>
        <Title level={3} style={{ marginBottom: 4 }}>
          โครงสร้างการแบ่งงาน (WBS) & BOQ
        </Title>
        <Text type="secondary">
          {project?.name ?? 'รายละเอียดโครงการ'}
        </Text>
      </div>

      {/* Top Action Bar */}
      <div style={{ marginBottom: 16 }}>
        <Space wrap>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={openCreateModal}
            style={{
              backgroundColor: COLORS.accentTeal,
              borderColor: COLORS.accentTeal,
            }}
          >
            เพิ่ม WBS Node
          </Button>
          <Button icon={<UploadOutlined />}>Import Excel</Button>
          <Button icon={<DownloadOutlined />} onClick={handleExportExcel}>Export Excel</Button>
          <Button icon={<SaveOutlined />}>บันทึก Template</Button>
        </Space>
      </div>

      {/* Split Panel Layout */}
      <Row gutter={16}>
        {/* Left Panel: WBS Tree */}
        <Col span={10}>
          <Card
            title="WBS Tree View"
            styles={{ body: { padding: '12px 16px', maxHeight: 600, overflow: 'auto' } }}
          >
            {treeData.length > 0 ? (
              <Tree
                showLine={{ showLeafIcon: false }}
                showIcon={false}
                treeData={treeData}
                defaultExpandedKeys={defaultExpandedKeys}
                selectedKeys={selectedWbsId ? [selectedWbsId] : []}
                onSelect={(keys) => {
                  if (keys.length > 0) {
                    setSelectedWbsId(keys[0] as string);
                  }
                }}
                blockNode
              />
            ) : (
              <Empty description="ไม่พบข้อมูล WBS" />
            )}
          </Card>
        </Col>

        {/* Right Panel: BOQ Table */}
        <Col span={14}>
          <Card
            title={
              selectedWbsId
                ? `BOQ — ${selectedNodeName}`
                : 'BOQ'
            }
            styles={{ body: { padding: '12px 16px' } }}
          >
            {isOutsourced ? (
              <Alert
                type="info"
                showIcon
                style={{ marginBottom: 12 }}
                message="BOQ สำหรับโครงการจ้างภายนอกเป็นแบบอ่านอย่างเดียว"
                description="การเปลี่ยนแปลง BOQ ต้องผ่านกระบวนการแก้ไขสัญญา ไม่ใช่แก้จากหน้า WBS"
              />
            ) : null}
            {!selectedWbsId ? (
              <Empty description="เลือก WBS node เพื่อดู BOQ" />
            ) : boqLoading ? (
              <Skeleton active paragraph={{ rows: 6 }} />
            ) : boqItems && boqItems.length > 0 ? (
              <>
                <Table<BOQItem>
                  columns={boqColumns}
                  dataSource={boqItems}
                  rowKey="id"
                  pagination={false}
                  size="middle"
                  summary={() => (
                    <Table.Summary fixed>
                      <Table.Summary.Row>
                        <Table.Summary.Cell index={0} colSpan={5} align="right">
                          <Text strong>รวมหมวด:</Text>
                        </Table.Summary.Cell>
                        <Table.Summary.Cell index={5} align="right">
                          <Text
                            strong
                            style={{ color: COLORS.primary, fontSize: 15 }}
                          >
                            {formatBaht(boqTotalSum)} ฿
                          </Text>
                        </Table.Summary.Cell>
                      </Table.Summary.Row>
                    </Table.Summary>
                  )}
                />
                {canCreateBoq ? (
                  <Button
                    type="dashed"
                    icon={<PlusOutlined />}
                    onClick={openCreateBoqModal}
                    style={{ marginTop: 12, width: '100%' }}
                  >
                    + เพิ่มรายการ BOQ
                  </Button>
                ) : null}
              </>
            ) : (
              <>
                <Empty description="ไม่มีรายการ BOQ สำหรับ WBS node นี้" />
                {canCreateBoq ? (
                  <Button
                    type="dashed"
                    icon={<PlusOutlined />}
                    onClick={openCreateBoqModal}
                    style={{ marginTop: 12, width: '100%' }}
                  >
                    + เพิ่มรายการ BOQ
                  </Button>
                ) : null}
              </>
            )}
          </Card>
        </Col>
      </Row>

      {/* Bottom Info Bar */}
      <Card
        size="small"
        style={{
          marginTop: 16,
          backgroundColor: COLORS.bgLayout,
          borderColor: COLORS.borderLight,
        }}
      >
        <Text type="secondary">
          ระดับ 1: {stats.level1} | ระดับ 2: {stats.level2} | Milestones: {stats.milestones}
        </Text>
      </Card>

      <Modal
        title="เพิ่ม WBS Node"
        open={isCreateModalOpen}
        onCancel={() => setIsCreateModalOpen(false)}
        onOk={handleCreateNode}
        okText="บันทึก"
        cancelText="ยกเลิก"
        confirmLoading={createWbsNode.isPending}
      >
        <Form<CreateWBSNodeInput> form={createForm} layout="vertical">
          <Form.Item<CreateWBSNodeInput>
            label="ชื่องาน WBS"
            name="name"
            rules={[{ required: true, message: 'กรุณาระบุชื่อ WBS' }]}
          >
            <Input placeholder="ระบุชื่อ WBS node" />
          </Form.Item>
          <Form.Item<CreateWBSNodeInput> label="WBS แม่" name="parentId">
            <Select
              allowClear
              placeholder="สร้างเป็นระดับบนสุดของโครงการ"
              options={eligibleParentOptions}
            />
          </Form.Item>
        </Form>
      </Modal>

      {canCreateBoq ? (
        <Modal
          title="เพิ่มรายการ BOQ"
          open={isCreateBoqModalOpen}
          onCancel={() => setIsCreateBoqModalOpen(false)}
          onOk={handleCreateBoqItem}
          okText="บันทึก"
          cancelText="ยกเลิก"
          confirmLoading={createBoqItem.isPending}
        >
          <Form<CreateBOQItemInput> form={createBoqForm} layout="vertical">
            <Form.Item
              label="รายการ"
              name="description"
              rules={[{ required: true, message: 'กรุณาระบุรายการ BOQ' }]}
            >
              <Input placeholder="เช่น งานโครงสร้างเหล็ก" />
            </Form.Item>
            <Form.Item
              label="ปริมาณ"
              name="quantity"
              rules={[{ required: true, message: 'กรุณาระบุปริมาณ' }]}
            >
              <InputNumber min={0} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item
              label="หน่วย"
              name="unit"
              rules={[{ required: true, message: 'กรุณาระบุหน่วย' }]}
            >
              <Input placeholder="เช่น งาน, ตร.ม., ชุด" />
            </Form.Item>
            <Form.Item
              label="ราคา/หน่วย"
              name="unitPrice"
              rules={[{ required: true, message: 'กรุณาระบุราคา/หน่วย' }]}
            >
              <InputNumber min={0} style={{ width: '100%' }} />
            </Form.Item>
          </Form>
        </Modal>
      ) : null}
    </div>
  );
}
