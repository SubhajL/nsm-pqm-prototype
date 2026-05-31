'use client';

import { useEffect, useMemo, useState } from 'react';
import { Col, Form, Row, Typography, message } from 'antd';

import { useProject } from '@/hooks/useProjects';
import { useRouteProjectId } from '@/hooks/useRouteProjectId';
import {
  useCreateWBSNode,
  useWBS,
  type CreateWBSNodeInput,
} from '@/hooks/useWBS';
import {
  useBOQ,
  useCreateBOQItem,
  type CreateBOQItemInput,
} from '@/hooks/useBOQ';
import { buildWbsExportDocument } from '@/lib/export-documents';
import { downloadSpreadsheetReport } from '@/lib/export-utils';
import { isOutsourcedProject } from '@/types/project';

import { BoqTablePanel } from './_components/BoqTablePanel';
import { CreateBoqItemModal } from './_components/CreateBoqItemModal';
import { CreateWbsNodeModal } from './_components/CreateWbsNodeModal';
import { WbsActionBar } from './_components/WbsActionBar';
import { WbsLoading } from './_components/WbsLoading';
import { WbsStatsBar } from './_components/WbsStatsBar';
import { WbsTreePanel } from './_components/WbsTreePanel';
import { buildTree, findPreferredWbsNodeId } from './_components/helpers';

const { Title, Text } = Typography;

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

  // Loading state
  if (wbsLoading) {
    return <WbsLoading />;
  }

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <Title level={3} style={{ marginBottom: 4 }}>
          โครงสร้างการแบ่งงาน (WBS) & BOQ
        </Title>
        <Text type="secondary">
          {project?.name ?? 'รายละเอียดโครงการ'}
        </Text>
      </div>

      <WbsActionBar onCreateNode={openCreateModal} onExportExcel={handleExportExcel} />

      <Row gutter={[16, 16]}>
        {/* PR-B1: stack on xs/sm/md (≤991px); side-by-side from lg (≥992px).
            Replaces the previous fixed `span={10}/{14}` which broke layout
            on tablet and mobile. */}
        <Col xs={24} sm={24} md={24} lg={10}>
          <WbsTreePanel
            treeData={treeData}
            defaultExpandedKeys={defaultExpandedKeys}
            selectedWbsId={selectedWbsId}
            onSelect={setSelectedWbsId}
          />
        </Col>
        <Col xs={24} sm={24} md={24} lg={14}>
          <BoqTablePanel
            selectedWbsId={selectedWbsId}
            selectedNodeName={selectedNodeName}
            isOutsourced={isOutsourced}
            boqLoading={boqLoading}
            boqItems={boqItems}
            boqTotalSum={boqTotalSum}
            canCreateBoq={canCreateBoq}
            onOpenCreateBoq={openCreateBoqModal}
          />
        </Col>
      </Row>

      <WbsStatsBar stats={stats} />

      <CreateWbsNodeModal
        open={isCreateModalOpen}
        onCancel={() => setIsCreateModalOpen(false)}
        onOk={handleCreateNode}
        confirmLoading={createWbsNode.isPending}
        form={createForm}
        eligibleParentOptions={eligibleParentOptions}
      />

      {canCreateBoq ? (
        <CreateBoqItemModal
          open={isCreateBoqModalOpen}
          onCancel={() => setIsCreateBoqModalOpen(false)}
          onOk={handleCreateBoqItem}
          confirmLoading={createBoqItem.isPending}
          form={createBoqForm}
        />
      ) : null}
    </div>
  );
}
