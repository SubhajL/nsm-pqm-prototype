export const INSPECTION_TYPE_MAP: Record<string, { label: string; color: string }> = {
  H: { label: 'Hold Point (H)', color: 'red' },
  W: { label: 'Witness Point (W)', color: 'blue' },
  RS: { label: 'Review (R/S)', color: 'green' },
};

export const ITP_STATUS_MAP: Record<string, { label: string; color: string }> = {
  passed: { label: 'ผ่าน (PASSED)', color: 'green' },
  conditional: { label: 'ไม่ผ่านเงื่อนไข (CONDITIONAL)', color: 'red' },
  pending: { label: 'รอตรวจ (PENDING)', color: 'gold' },
  awaiting: { label: 'รอผล (AWAITING)', color: 'blue' },
};
