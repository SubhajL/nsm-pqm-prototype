'use client';

import { useMemo, useState } from 'react';
import {
  Alert,
  Button,
  List,
  Popover,
  Space,
  Tag,
  Tooltip,
  Typography,
} from 'antd';
import {
  CheckCircleFilled,
  LockOutlined,
  PlayCircleFilled,
  RightOutlined,
} from '@ant-design/icons';
import { COLORS } from '@/theme/antd-theme';
import {
  LIFECYCLE_STAGE_ARTIFACTS,
  canEnterStage,
  type StageArtifactRequirement,
} from '@/lib/rid/lifecycle-artifacts';
import type { DocumentFile } from '@/types/document';
import type { Project } from '@/types/project';
import {
  RID_LIFECYCLE_STAGES,
  type RidLifecycleStage,
} from '@/types/rid/vocabulary';

const { Text, Title } = Typography;

/**
 * Display labels for each RID lifecycle stage (Thai-first per CLAUDE.md SHOULD
 * rule on bilingual badge labels).
 */
const STAGE_LABELS: Record<RidLifecycleStage, { th: string; en: string }> = {
  planning: { th: 'วางโครงการ', en: 'Planning' },
  land_acquisition: { th: 'จัดหาที่ดิน', en: 'Land Acquisition' },
  survey_design: { th: 'สำรวจ/ออกแบบ', en: 'Survey / Design' },
  procurement: { th: 'ประกวดราคา', en: 'Procurement' },
  construction: { th: 'ก่อสร้าง', en: 'Construction' },
  handover: { th: 'ส่งมอบ-รับมอบ', en: 'Handover' },
  om: { th: 'O&M', en: 'O&M' },
};

type StageDisplayStatus = 'completed' | 'current' | 'locked';

function deriveStageStatus(
  stage: RidLifecycleStage,
  current: RidLifecycleStage,
): StageDisplayStatus {
  const stageIdx = RID_LIFECYCLE_STAGES.indexOf(stage);
  const currentIdx = RID_LIFECYCLE_STAGES.indexOf(current);

  if (stageIdx < currentIdx) return 'completed';
  if (stageIdx === currentIdx) return 'current';
  return 'locked';
}

function stageColor(status: StageDisplayStatus): string {
  if (status === 'completed') return COLORS.success;
  if (status === 'current') return COLORS.accentTeal;
  return COLORS.neutralGray;
}

interface StageDetailContentProps {
  stage: RidLifecycleStage;
  requirements: StageArtifactRequirement[];
  attachedDocIds: string[];
  documents: DocumentFile[];
}

function StageDetailContent({
  stage,
  requirements,
  attachedDocIds,
  documents,
}: StageDetailContentProps) {
  const fulfilled = useMemo(() => {
    // For MVP we mirror the canEnterStage rule: required slots are
    // satisfied in order by attached + valid docs.
    const docIdSet = new Set(documents.map((d) => d.id));
    const remaining = attachedDocIds.filter((id) => docIdSet.has(id));
    const requiredReqs = requirements.filter((r) => r.required);

    const fulfilledKeys = new Set<string>();
    for (const req of requiredReqs) {
      const consumed = remaining.shift();
      if (consumed) fulfilledKeys.add(req.key);
    }
    return fulfilledKeys;
  }, [attachedDocIds, documents, requirements]);

  return (
    <div style={{ maxWidth: 360 }}>
      <Title level={5} style={{ marginTop: 0 }}>
        {STAGE_LABELS[stage].th} ({STAGE_LABELS[stage].en})
      </Title>
      <Text type="secondary" style={{ fontSize: 12 }}>
        เอกสารประกอบที่ต้องใช้ในการเข้าสู่ขั้นนี้ (Artifacts to enter this stage)
      </Text>
      <List<StageArtifactRequirement>
        size="small"
        style={{ marginTop: 8 }}
        dataSource={requirements}
        renderItem={(req) => {
          const ok = req.required ? fulfilled.has(req.key) : true;
          return (
            <List.Item key={req.key} style={{ padding: '6px 0' }}>
              <Space align="start" size={8} style={{ width: '100%' }}>
                {req.required ? (
                  ok ? (
                    <CheckCircleFilled style={{ color: COLORS.success }} />
                  ) : (
                    <LockOutlined style={{ color: COLORS.error }} />
                  )
                ) : (
                  <RightOutlined style={{ color: COLORS.textMuted, fontSize: 10 }} />
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13 }}>{req.label}</div>
                  {req.sopReference ? (
                    <Text type="secondary" style={{ fontSize: 11 }}>
                      {req.sopReference}
                    </Text>
                  ) : null}
                  <div style={{ marginTop: 2 }}>
                    {req.required ? (
                      <Tag color={ok ? 'success' : 'error'}>
                        จำเป็น (Required)
                      </Tag>
                    ) : (
                      <Tag>แนะนำ (Recommended)</Tag>
                    )}
                  </div>
                </div>
              </Space>
            </List.Item>
          );
        }}
      />
    </div>
  );
}

interface RidLifecycleGatesProps {
  project: Pick<Project, 'id' | 'currentLifecycleStage' | 'lifecycleStageHistory'>;
  /**
   * All documents available for the project — fed to `canEnterStage()` to
   * decide whether the "Enter next stage" CTA is enabled.
   *
   * Defaults to empty; callers wanting strict artifact gating should pass
   * the project's documents from `useDocuments(projectId)`.
   */
  documents?: DocumentFile[];
  /**
   * IDs of documents the caller is citing as evidence for the next-stage
   * transition. The MVP component does not implement a doc-picker UI yet,
   * so this defaults to empty and the "Enter next stage" CTA stays
   * disabled for `construction` until the host page supplies cited ids.
   */
  citedDocIdsForNextStage?: string[];
  /**
   * Triggered when the user clicks "Enter next stage" and the gate passes.
   * Wires to the `/api/projects/[id]/lifecycle` PATCH route. Defaults to a
   * no-op so the component is trivially renderable in tests.
   */
  onAdvance?: (targetStage: RidLifecycleStage, citedDocIds: string[]) => void;
}

/**
 * `<RidLifecycleGates>` — separate horizontal pipeline for the 7-stage RID
 * construction lifecycle (PR-16).
 *
 * Distinct from `<QualityGatePipeline>`: lifecycle gates model SOP-driven
 * stage entry (e.g. SOP 8.2 → construction), whereas quality gates model
 * ITP/inspection-level pass criteria. The two render side-by-side on the
 * project detail page; merging would conflate two distinct domain concepts
 * per the senior team-lead review.
 */
export function RidLifecycleGates({
  project,
  documents = [],
  citedDocIdsForNextStage = [],
  onAdvance,
}: RidLifecycleGatesProps) {
  const [openStageKey, setOpenStageKey] = useState<RidLifecycleStage | null>(null);

  const currentIdx = RID_LIFECYCLE_STAGES.indexOf(project.currentLifecycleStage);
  const nextStage =
    currentIdx >= 0 && currentIdx < RID_LIFECYCLE_STAGES.length - 1
      ? RID_LIFECYCLE_STAGES[currentIdx + 1]
      : null;

  const nextDecision = nextStage
    ? canEnterStage(nextStage, citedDocIdsForNextStage, documents)
    : null;
  const advanceEnabled = nextDecision?.ok === true;

  const missingLabels =
    nextDecision && !nextDecision.ok
      ? nextDecision.missing.map((m) => m.label).join(', ')
      : '';

  return (
    <div data-testid="rid-lifecycle-gates">
      <div style={{ marginBottom: 12 }}>
        <Text strong style={{ fontSize: 14 }}>
          วงจรชีวิตโครงการ (RID Project Lifecycle)
        </Text>
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          overflowX: 'auto',
          padding: '16px 0',
          gap: 0,
        }}
      >
        {RID_LIFECYCLE_STAGES.map((stage, index) => {
          const status = deriveStageStatus(stage, project.currentLifecycleStage);
          const color = stageColor(status);
          const isLast = index === RID_LIFECYCLE_STAGES.length - 1;
          const requirements = LIFECYCLE_STAGE_ARTIFACTS[stage];

          const node = (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                minWidth: 88,
                flexShrink: 0,
                cursor: 'pointer',
              }}
              role="button"
              aria-label={`Stage ${STAGE_LABELS[stage].en}`}
              data-testid={`lifecycle-stage-${stage}`}
              data-status={status}
              onClick={() => setOpenStageKey(stage)}
            >
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: '50%',
                  backgroundColor: status === 'locked' ? COLORS.surfaceMuted : color,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border:
                    status === 'locked'
                      ? `2px dashed ${COLORS.textDisabled}`
                      : `2px solid ${color}`,
                }}
              >
                {status === 'completed' ? (
                  <CheckCircleFilled style={{ color: COLORS.white, fontSize: 22 }} />
                ) : status === 'current' ? (
                  <PlayCircleFilled style={{ color: COLORS.white, fontSize: 22 }} />
                ) : (
                  <LockOutlined style={{ color: COLORS.textDisabled, fontSize: 18 }} />
                )}
              </div>
              <div
                style={{
                  marginTop: 8,
                  textAlign: 'center',
                  fontSize: 12,
                  fontWeight: status === 'current' ? 700 : 600,
                  color: status === 'current' ? COLORS.accentTeal : COLORS.textDark,
                  lineHeight: 1.3,
                  maxWidth: 90,
                }}
              >
                {STAGE_LABELS[stage].th}
              </div>
              <div
                style={{
                  textAlign: 'center',
                  fontSize: 10,
                  color: COLORS.textMuted,
                  lineHeight: 1.2,
                  maxWidth: 90,
                }}
              >
                {STAGE_LABELS[stage].en}
              </div>
            </div>
          );

          return (
            <div
              key={stage}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                flex: isLast ? '0 0 auto' : '1 1 0',
                minWidth: 0,
              }}
            >
              <Popover
                open={openStageKey === stage}
                onOpenChange={(open) => setOpenStageKey(open ? stage : null)}
                trigger="click"
                placement="bottom"
                content={
                  <StageDetailContent
                    stage={stage}
                    requirements={requirements}
                    attachedDocIds={citedDocIdsForNextStage}
                    documents={documents}
                  />
                }
              >
                {node}
              </Popover>

              {!isLast && (
                <div
                  style={{
                    flex: 1,
                    height: 3,
                    backgroundColor: status === 'completed' ? COLORS.success : COLORS.neutralGray,
                    marginTop: 22,
                    minWidth: 20,
                    borderRadius: 2,
                  }}
                />
              )}
            </div>
          );
        })}
      </div>

      {nextStage ? (
        <div style={{ marginTop: 12 }}>
          <Space wrap>
            <Tooltip
              title={
                advanceEnabled
                  ? undefined
                  : `ขาดเอกสารประกอบ (Missing artifacts): ${missingLabels}`
              }
            >
              <Button
                type="primary"
                disabled={!advanceEnabled}
                icon={advanceEnabled ? <RightOutlined /> : <LockOutlined />}
                onClick={() => {
                  if (advanceEnabled && onAdvance) {
                    onAdvance(nextStage, citedDocIdsForNextStage);
                  }
                }}
                data-testid="lifecycle-advance-cta"
                style={
                  advanceEnabled
                    ? {
                        backgroundColor: COLORS.accentTeal,
                        borderColor: COLORS.accentTeal,
                      }
                    : {
                        backgroundColor: COLORS.neutralGray,
                        borderColor: COLORS.neutralGray,
                        color: COLORS.textMuted,
                      }
                }
              >
                เข้าสู่ขั้น {STAGE_LABELS[nextStage].th} (Enter {STAGE_LABELS[nextStage].en})
              </Button>
            </Tooltip>
          </Space>
        </div>
      ) : (
        <Alert
          type="success"
          showIcon
          message="โครงการอยู่ในขั้น O&M แล้ว (Project is in the O&M stage)"
          style={{ marginTop: 12 }}
        />
      )}
    </div>
  );
}
