import { NextResponse } from 'next/server';

interface EvaluationCategory {
  name: string;
  nameEn: string;
  score: number;
  note: string;
}

interface EvaluationData {
  projectId: string;
  projectName: string;
  overallScore: number;
  maxScore: number;
  level: string;
  percentage: number;
  evaluatedBy: string;
  evaluatedAt: string;
  categories: EvaluationCategory[];
  recommendation: string;
}

const evaluationStore: Record<string, EvaluationData> = {
  'proj-005': {
    projectId: 'proj-005',
    projectName: 'โครงการวิจัยความพึงพอใจผู้เข้าชม 2569',
    overallScore: 4.2,
    maxScore: 5,
    level: 'ดีมาก (Very Good)',
    percentage: 84,
    evaluatedBy: 'สมชาย ก.',
    evaluatedAt: '2026-09-15',
    categories: [
      { name: 'ความสำเร็จตามเป้าหมาย', nameEn: 'Goal Achievement', score: 5, note: 'บรรลุวัตถุประสงค์ทั้ง 3' },
      { name: 'งบประมาณ', nameEn: 'Budget', score: 4, note: 'ใช้จ่าย 95% ของงบ' },
      { name: 'การบริหารความเสี่ยง', nameEn: 'Risk Management', score: 3, note: 'ล่าช้า 2 สัปดาห์' },
      { name: 'ความร่วมมือของทีมงาน', nameEn: 'Team Collaboration', score: 5, note: 'ประสานงานดี' },
      { name: 'ปัญหาอุปสรรค', nameEn: 'Issues & Obstacles', score: 4, note: 'ปัญหาน้อย แก้ไขทัน' },
    ],
    recommendation: 'ควรวางแผนจัดซื้อล่วงหน้า',
  },
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const { projectId } = await params;
  const evaluation = evaluationStore[projectId];

  if (!evaluation) {
    return NextResponse.json(
      { status: 'error', error: { code: 'NOT_FOUND', message: 'Evaluation not found' } },
      { status: 404 },
    );
  }

  return NextResponse.json({ status: 'success', data: evaluation });
}
