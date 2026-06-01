/**
 * PR-19 — Database repository contract tests.
 *
 * Wires PR-18's reusable contract functions against the
 * `DatabaseXxxRepository` impls. Each repo gets a freshly-migrated pglite
 * instance so contract tests run on a clean schema.
 *
 * This proves behavioural equivalence with the InMemory impls without
 * duplicating any contract logic.
 */

import { describe } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';

import * as schema from '@/lib/db/schema';
import { runMigrations } from '@/lib/db/migrate';
import type { Db } from '@/lib/db/client';

import {
  DatabaseAsBuiltDrawingRepository,
  DatabaseAssetRegistrationRepository,
  DatabaseAuditEventRepository,
  DatabaseAwardedContractRepository,
  DatabaseBoqRepository,
  DatabaseChangeRequestRepository,
  DatabaseCommitteeInspectionRepository,
  DatabaseContractAmendmentRepository,
  DatabaseContractorPrequalificationRepository,
  DatabaseDailyReportRepository,
  DatabaseDeliverySlipRepository,
  DatabaseDocumentRepository,
  DatabaseEngineeringEstimateRepository,
  DatabaseEnvironmentalAssessmentRepository,
  DatabaseEvmRepository,
  DatabaseGanttRepository,
  DatabaseHandoverPacketRepository,
  DatabaseIssueRepository,
  DatabaseLandAcquisitionRepository,
  DatabaseMilestoneRepository,
  DatabaseNotificationRepository,
  DatabaseOmManualEntryRepository,
  DatabaseOrgStructureRepository,
  DatabasePaymentVoucherRepository,
  DatabasePermitRepository,
  DatabaseProcurementPackageRepository,
  DatabaseProjectRepository,
  DatabasePublicHearingRepository,
  DatabaseQualityGateRepository,
  DatabaseQualityInspectionRepository,
  DatabaseRiskRepository,
  DatabaseTeamMembershipRepository,
  DatabaseTorDocumentRepository,
  DatabaseUserRepository,
  DatabaseWbsRepository,
  DatabaseWorkPeriodRepository,
  // PR-30a — IT class extensions.
  DatabaseItSprintRepository,
  DatabaseKnowledgeAreaNoteRepository,
  DatabaseVendorSowRepository,
} from '@/lib/db/repositories';

import { runAuditEventRepositoryContract } from '@/lib/repositories/__tests__/contracts/audit-event.contract';
import { runBoqRepositoryContract } from '@/lib/repositories/__tests__/contracts/boq.contract';
import { runChangeRequestRepositoryContract } from '@/lib/repositories/__tests__/contracts/change-request.contract';
import { runCommitteeInspectionRepositoryContract } from '@/lib/repositories/__tests__/contracts/committee-inspection.contract';
import { runDailyReportRepositoryContract } from '@/lib/repositories/__tests__/contracts/daily-report.contract';
import { runDeliverySlipRepositoryContract } from '@/lib/repositories/__tests__/contracts/delivery-slip.contract';
import { runDocumentRepositoryContract } from '@/lib/repositories/__tests__/contracts/document.contract';
import { runEnvironmentalAssessmentRepositoryContract } from '@/lib/repositories/__tests__/contracts/environmental-assessment.contract';
import { runEvmRepositoryContract } from '@/lib/repositories/__tests__/contracts/evm.contract';
import { runGanttRepositoryContract } from '@/lib/repositories/__tests__/contracts/gantt.contract';
import { runIssueRepositoryContract } from '@/lib/repositories/__tests__/contracts/issue.contract';
import { runLandAcquisitionRepositoryContract } from '@/lib/repositories/__tests__/contracts/land-acquisition.contract';
import { runMilestoneRepositoryContract } from '@/lib/repositories/__tests__/contracts/milestone.contract';
import { runNotificationRepositoryContract } from '@/lib/repositories/__tests__/contracts/notification.contract';
import { runOrgStructureRepositoryContract } from '@/lib/repositories/__tests__/contracts/org-structure.contract';
import { runPaymentVoucherRepositoryContract } from '@/lib/repositories/__tests__/contracts/payment-voucher.contract';
import { runPermitRepositoryContract } from '@/lib/repositories/__tests__/contracts/permit.contract';
import { runProjectRepositoryContract } from '@/lib/repositories/__tests__/contracts/project.contract';
import { runPublicHearingRepositoryContract } from '@/lib/repositories/__tests__/contracts/public-hearing.contract';
import { runQualityGateRepositoryContract } from '@/lib/repositories/__tests__/contracts/quality-gate.contract';
import { runQualityInspectionRepositoryContract } from '@/lib/repositories/__tests__/contracts/quality-inspection.contract';
import { runRiskRepositoryContract } from '@/lib/repositories/__tests__/contracts/risk.contract';
import { runTeamMembershipRepositoryContract } from '@/lib/repositories/__tests__/contracts/team-membership.contract';
import { runUserRepositoryContract } from '@/lib/repositories/__tests__/contracts/user.contract';
import { runWbsRepositoryContract } from '@/lib/repositories/__tests__/contracts/wbs.contract';
import { runWorkPeriodRepositoryContract } from '@/lib/repositories/__tests__/contracts/work-period.contract';

// PR-24 — Procurement / contract contracts.
import { runAwardedContractRepositoryContract } from '@/lib/repositories/__tests__/contracts/awarded-contract.contract';
import { runContractAmendmentRepositoryContract } from '@/lib/repositories/__tests__/contracts/contract-amendment.contract';
import { runContractorPrequalificationRepositoryContract } from '@/lib/repositories/__tests__/contracts/contractor-prequalification.contract';
import { runEngineeringEstimateRepositoryContract } from '@/lib/repositories/__tests__/contracts/engineering-estimate.contract';
import { runProcurementPackageRepositoryContract } from '@/lib/repositories/__tests__/contracts/procurement-package.contract';
import { runTorDocumentRepositoryContract } from '@/lib/repositories/__tests__/contracts/tor-document.contract';

// PR-30a — IT class extension contracts.
import { runItSprintRepositoryContract } from '@/lib/repositories/__tests__/contracts/sprint.contract';
import { runKnowledgeAreaNoteRepositoryContract } from '@/lib/repositories/__tests__/contracts/knowledge-area-note.contract';
import { runVendorSowRepositoryContract } from '@/lib/repositories/__tests__/contracts/vendor-sow.contract';
// PR-26 — Handover workflow contracts.
import { runAsBuiltDrawingRepositoryContract } from '@/lib/repositories/__tests__/contracts/as-built-drawing.contract';
import { runAssetRegistrationRepositoryContract } from '@/lib/repositories/__tests__/contracts/asset-registration.contract';
import { runHandoverPacketRepositoryContract } from '@/lib/repositories/__tests__/contracts/handover-packet.contract';
import { runOmManualEntryRepositoryContract } from '@/lib/repositories/__tests__/contracts/om-manual-entry.contract';

/**
 * Build a freshly-migrated pglite-backed Drizzle DB per call. Cheap (sub-100ms);
 * cleaner than truncating tables between tests.
 */
async function freshDb(): Promise<Db> {
  const client = new PGlite();
  const db = drizzle(client, { schema });
  await runMigrations(db);
  return db;
}

describe('Database repository contracts (pglite)', () => {
  runProjectRepositoryContract(async () => {
    return new DatabaseProjectRepository(await freshDb());
  });

  runWbsRepositoryContract(async () => {
    const db = await freshDb();
    // WBS has a FK to projects.id — seed a synthetic project so contract
    // tests that create wbs nodes referencing 'proj-x' / 'proj-a' / etc.
    // don't trip the FK. The contracts themselves don't check the projects
    // table, so adding rows is safe.
    await db.insert(schema.projects).values(
      ['proj-x', 'proj-a', 'proj-b'].map((id) => ({
        id,
        code: `CODE-${id}`,
        name: id,
        nameEn: id,
        projectClass: 'construction' as const,
        deliveryMethod: 'in_house' as const,
        contractingModel: null,
        sizeTier: 'medium' as const,
        status: 'planning',
        budget: 1,
        progress: 0,
        scheduleHealth: null,
        startDate: '2026-01-01',
        endDate: '2026-12-31',
        duration: 1,
        spiValue: 1,
        cpiValue: 1,
        managerId: 'u',
        managerName: 'u',
        departmentId: 'd',
        departmentName: 'd',
        openIssues: 0,
        highRisks: 0,
        currentMilestone: 0,
        totalMilestones: 0,
        currentLifecycleStage: 'planning' as const,
        lifecycleStageHistory: [],
      })),
    );
    return new DatabaseWbsRepository(db);
  });

  runBoqRepositoryContract(async () => {
    return new DatabaseBoqRepository(await freshDb());
  });

  runMilestoneRepositoryContract(async () => {
    return new DatabaseMilestoneRepository(await freshDb());
  });

  runGanttRepositoryContract(async () => {
    return new DatabaseGanttRepository(await freshDb());
  });

  runDailyReportRepositoryContract(async () => {
    return new DatabaseDailyReportRepository(await freshDb());
  });

  runQualityInspectionRepositoryContract(async () => {
    return new DatabaseQualityInspectionRepository(await freshDb());
  });

  runQualityGateRepositoryContract(async () => {
    return new DatabaseQualityGateRepository(await freshDb());
  });

  runRiskRepositoryContract(async () => {
    return new DatabaseRiskRepository(await freshDb());
  });

  runIssueRepositoryContract(async () => {
    return new DatabaseIssueRepository(await freshDb());
  });

  runDocumentRepositoryContract(async () => {
    return new DatabaseDocumentRepository(await freshDb());
  });

  runChangeRequestRepositoryContract(async () => {
    return new DatabaseChangeRequestRepository(await freshDb());
  });

  runTeamMembershipRepositoryContract(async () => {
    return new DatabaseTeamMembershipRepository(await freshDb());
  });

  runEvmRepositoryContract(async () => {
    return new DatabaseEvmRepository(await freshDb());
  });

  runUserRepositoryContract(async () => {
    return new DatabaseUserRepository(await freshDb());
  });

  runOrgStructureRepositoryContract(async () => {
    return new DatabaseOrgStructureRepository(await freshDb());
  });

  runAuditEventRepositoryContract(async () => {
    return new DatabaseAuditEventRepository(await freshDb());
  });

  runNotificationRepositoryContract(async () => {
    return new DatabaseNotificationRepository(await freshDb());
  });

  // PR-25 — compliance registers.
  runPermitRepositoryContract(async () => {
    return new DatabasePermitRepository(await freshDb());
  });

  runEnvironmentalAssessmentRepositoryContract(async () => {
    return new DatabaseEnvironmentalAssessmentRepository(await freshDb());
  });

  runPublicHearingRepositoryContract(async () => {
    return new DatabasePublicHearingRepository(await freshDb());
  });

  runLandAcquisitionRepositoryContract(async () => {
    return new DatabaseLandAcquisitionRepository(await freshDb());
  });

  // PR-24 — procurement / contract domain.
  runProcurementPackageRepositoryContract(async () => {
    return new DatabaseProcurementPackageRepository(await freshDb());
  });

  runTorDocumentRepositoryContract(async () => {
    return new DatabaseTorDocumentRepository(await freshDb());
  });

  runEngineeringEstimateRepositoryContract(async () => {
    return new DatabaseEngineeringEstimateRepository(await freshDb());
  });

  runAwardedContractRepositoryContract(async () => {
    return new DatabaseAwardedContractRepository(await freshDb());
  });

  runContractAmendmentRepositoryContract(async () => {
    return new DatabaseContractAmendmentRepository(await freshDb());
  });

  runContractorPrequalificationRepositoryContract(async () => {
    return new DatabaseContractorPrequalificationRepository(await freshDb());
  });

  // PR-23 — งวดงาน-driven payment flow.
  runWorkPeriodRepositoryContract(async () => {
    return new DatabaseWorkPeriodRepository(await freshDb());
  });

  runDeliverySlipRepositoryContract(async () => {
    return new DatabaseDeliverySlipRepository(await freshDb());
  });

  runCommitteeInspectionRepositoryContract(async () => {
    return new DatabaseCommitteeInspectionRepository(await freshDb());
  });

  runPaymentVoucherRepositoryContract(async () => {
    return new DatabasePaymentVoucherRepository(await freshDb());
  });

  // PR-30a — IT class extensions.
  runVendorSowRepositoryContract(async () => {
    return new DatabaseVendorSowRepository(await freshDb());
  });

  runItSprintRepositoryContract(async () => {
    return new DatabaseItSprintRepository(await freshDb());
  });

  runKnowledgeAreaNoteRepositoryContract(async () => {
    return new DatabaseKnowledgeAreaNoteRepository(await freshDb());
  });

  // PR-26 — handover workflow.
  runHandoverPacketRepositoryContract(async () => {
    return new DatabaseHandoverPacketRepository(await freshDb());
  });

  runAsBuiltDrawingRepositoryContract(async () => {
    return new DatabaseAsBuiltDrawingRepository(await freshDb());
  });

  runOmManualEntryRepositoryContract(async () => {
    return new DatabaseOmManualEntryRepository(await freshDb());
  });

  runAssetRegistrationRepositoryContract(async () => {
    return new DatabaseAssetRegistrationRepository(await freshDb());
  });
});
