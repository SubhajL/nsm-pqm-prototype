import type { Metadata } from 'next';
import { getAgencyBrand } from '@/lib/branding';
import { Providers } from './providers';
import './globals.css';

const brand = getAgencyBrand();

export const metadata: Metadata = {
  title: `PQM System — ${brand.name}`,
  description: 'ระบบบริหารจัดการโครงการงาน และการควบคุมคุณภาพ',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th">
      <body className="font-sans antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
