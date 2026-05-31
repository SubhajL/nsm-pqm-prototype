/**
 * PMQA Category 2 — Strategic Planning indicators (PR-28).
 *
 * Two indicators rolled up here:
 *
 *   1. `strategy_alignment_percent` — % of projects whose registration
 *      includes an English title (proxy for "linked to org strategy" until
 *      the org-strategy registry lands post-MVP). The bilingual-title
 *      requirement is RID's standing rule for any project that wants to
 *      appear in the cross-bureau strategy book, so it's a reasonable MVP
 *      stand-in for the alignment audit trail.
 *
 *   2. `portfolio_balance` — % of projects that have moved past the
 *      initial `planning` lifecycle stage. A high value indicates the
 *      portfolio is actively executing (not stuck at intake); a low
 *      value flags an over-planned / under-executed posture.
 *
 * Both indicators use the same 5/4/3/2/1 banding at 90/80/70/60.
 */

import type { Project } from '@/types/project';
import type { PmqaIndicator, PmqaMaturityScore } from './pmqa-types';

/**
 * Standard PMQA score band for percent-typed indicators.
 *   ≥ 90  → 5
 *   ≥ 80  → 4
 *   ≥ 70  → 3
 *   ≥ 60  → 2
 *   < 60  → 1
 *
 * Empty portfolio (`value === 0` with no underlying population) is the
 * caller's responsibility to label as score 1 — we just band the value.
 */
export function scorePercentBand(percent: number): PmqaMaturityScore {
  if (percent >= 90) return 5;
  if (percent >= 80) return 4;
  if (percent >= 70) return 3;
  if (percent >= 60) return 2;
  return 1;
}

function isAlignedWithStrategy(project: Project): boolean {
  // Proxy: a project with a non-empty English name has been registered in
  // the bilingual RID strategy book. Trim because some fixtures use blank
  // whitespace as a placeholder.
  return project.nameEn.trim().length > 0;
}

export function computeStrategyAlignment(projects: Project[]): PmqaIndicator[] {
  const total = projects.length;
  const aligned = projects.filter(isAlignedWithStrategy).length;
  const pastPlanning = projects.filter((p) => p.currentLifecycleStage !== 'planning').length;

  const alignmentPercent = total === 0 ? 0 : (aligned / total) * 100;
  const balancePercent = total === 0 ? 0 : (pastPlanning / total) * 100;

  return [
    {
      key: 'strategy_alignment_percent',
      category: 'category_2_strategy',
      label: 'การจัดวางยุทธศาสตร์ (Strategy Alignment %)',
      value: alignmentPercent,
      unit: 'percent',
      score: total === 0 ? 1 : scorePercentBand(alignmentPercent),
      benchmark: 90,
      rationale:
        total === 0
          ? 'ไม่มีโครงการในขอบเขตที่ผู้ใช้สามารถเข้าถึง — ไม่สามารถประเมินการจัดวางยุทธศาสตร์ได้'
          : `${aligned} จาก ${total} โครงการมีชื่อภาษาอังกฤษและถูกบันทึกในระบบยุทธศาสตร์`,
    },
    {
      key: 'portfolio_balance',
      category: 'category_2_strategy',
      label: 'ความสมดุลของพอร์ตโฟลิโอ (Portfolio Balance)',
      value: balancePercent,
      unit: 'percent',
      score: total === 0 ? 1 : scorePercentBand(balancePercent),
      benchmark: 80,
      rationale:
        total === 0
          ? 'ไม่มีโครงการในพอร์ตโฟลิโอ'
          : `${pastPlanning} จาก ${total} โครงการเข้าสู่ขั้นตอนปฏิบัติแล้ว (พ้นระยะวางแผน)`,
    },
  ];
}
