export interface EVMDataPoint {
  id: string;
  projectId: string;
  month: string;
  monthThai: string;
  pv: number;
  ev: number;
  ac: number;
  paidToDate?: number;
  spi: number;
  cpi: number;
}
