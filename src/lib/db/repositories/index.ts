/**
 * PR-19 — DatabaseXxxRepository barrel.
 *
 * Every InMemoryXxxRepository in `src/lib/repositories/` has a matching
 * Drizzle-backed implementation here. The contract test runner
 * (`__tests__/database-contract.test.ts`) wires PR-18's reusable contract
 * functions against these impls to prove behavioural equivalence.
 *
 * These impls are NOT wired into API routes by this PR — that happens in
 * PR-20 (dual-write) and PR-21 (cutover). The repository registry continues
 * to return InMemory impls until then.
 */

export { DatabaseAuditEventRepository } from './audit-event.repository';
export { DatabaseBoqRepository } from './boq.repository';
export { DatabaseChangeRequestRepository } from './change-request.repository';
export { DatabaseDailyReportRepository } from './daily-report.repository';
export { DatabaseDocumentRepository } from './document.repository';
export { DatabaseEvmRepository } from './evm.repository';
export { DatabaseGanttRepository } from './gantt.repository';
export { DatabaseIssueRepository } from './issue.repository';
export { DatabaseMilestoneRepository } from './milestone.repository';
export { DatabaseNotificationRepository } from './notification.repository';
export { DatabaseOrgStructureRepository } from './org-structure.repository';
export { DatabaseProjectRepository } from './project.repository';
export { DatabaseQualityGateRepository } from './quality-gate.repository';
export { DatabaseQualityInspectionRepository } from './quality-inspection.repository';
export { DatabaseRiskRepository } from './risk.repository';
export { DatabaseTeamMembershipRepository } from './team-membership.repository';
export { DatabaseUserRepository } from './user.repository';
export { DatabaseWbsRepository } from './wbs.repository';
export { DatabasePermitRepository } from './permit.repository';
export { DatabaseEnvironmentalAssessmentRepository } from './environmental-assessment.repository';
export { DatabasePublicHearingRepository } from './public-hearing.repository';
export { DatabaseLandAcquisitionRepository } from './land-acquisition.repository';
// PR-27 — Project approval workflow.
export { DatabaseProjectApprovalRequestRepository } from './project-approval-request.repository';
// PR-24 — Procurement / contract domain.
export { DatabaseProcurementPackageRepository } from './procurement-package.repository';
export { DatabaseTorDocumentRepository } from './tor-document.repository';
export { DatabaseEngineeringEstimateRepository } from './engineering-estimate.repository';
export { DatabaseAwardedContractRepository } from './awarded-contract.repository';
export { DatabaseContractAmendmentRepository } from './contract-amendment.repository';
export { DatabaseContractorPrequalificationRepository } from './contractor-prequalification.repository';
// PR-23 — งวดงาน-driven payment flow.
export { DatabaseWorkPeriodRepository } from './work-period.repository';
export { DatabaseDeliverySlipRepository } from './delivery-slip.repository';
export { DatabaseCommitteeInspectionRepository } from './committee-inspection.repository';
export { DatabasePaymentVoucherRepository } from './payment-voucher.repository';
// PR-30a — IT class extensions.
export { DatabaseVendorSowRepository } from './vendor-sow.repository';
export { DatabaseItSprintRepository } from './sprint.repository';
export { DatabaseKnowledgeAreaNoteRepository } from './knowledge-area-note.repository';
