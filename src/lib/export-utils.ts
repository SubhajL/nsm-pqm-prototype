import { formatBaht, formatThaiDate, formatThaiDateShort } from '@/lib/date-utils';

export type ExportOrientation = 'portrait' | 'landscape';
export type ExportTone = 'neutral' | 'success' | 'warning' | 'danger';

export interface ExportMetadataItem {
  label: string;
  value: string;
}

export interface ExportSummaryCard {
  label: string;
  value: string;
  tone?: ExportTone;
}

export interface ExportTable {
  title: string;
  columns: string[];
  rows: string[][];
  emptyMessage?: string;
}

export interface ExportDocument {
  title: string;
  subtitle?: string;
  filename: string;
  orientation?: ExportOrientation;
  metadata?: ExportMetadataItem[];
  summaries?: ExportSummaryCard[];
  tables?: ExportTable[];
  notes?: string[];
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function toneColor(tone: ExportTone | undefined) {
  switch (tone) {
    case 'success':
      return '#f6ffed';
    case 'warning':
      return '#fffbe6';
    case 'danger':
      return '#fff2f0';
    default:
      return '#f5f5f5';
  }
}

function formatGeneratedAt() {
  const now = new Date();
  const isoDate = now.toISOString().slice(0, 10);
  const time = now.toLocaleTimeString('th-TH', {
    hour: '2-digit',
    minute: '2-digit',
  });
  return `${formatThaiDate(isoDate)} ${time}`;
}

function buildSummaryCardsHtml(cards: ExportSummaryCard[] | undefined) {
  if (!cards || cards.length === 0) {
    return '';
  }

  return `
    <section class="summary-grid">
      ${cards
        .map(
          (card) => `
            <article class="summary-card" style="background:${toneColor(card.tone)};">
              <div class="summary-label">${escapeHtml(card.label)}</div>
              <div class="summary-value">${escapeHtml(card.value)}</div>
            </article>
          `,
        )
        .join('')}
    </section>
  `;
}

function buildMetadataHtml(items: ExportMetadataItem[] | undefined) {
  const rows = [
    ...(items ?? []),
    { label: 'วันที่สร้างเอกสาร', value: formatGeneratedAt() },
  ];

  return `
    <table class="meta-table">
      <tbody>
        ${rows
          .map(
            (item) => `
              <tr>
                <th>${escapeHtml(item.label)}</th>
                <td>${escapeHtml(item.value)}</td>
              </tr>
            `,
          )
          .join('')}
      </tbody>
    </table>
  `;
}

function buildTablesHtml(tables: ExportTable[] | undefined) {
  if (!tables || tables.length === 0) {
    return '';
  }

  return tables
    .map((table) => {
      const hasRows = table.rows.length > 0;
      return `
        <section class="section">
          <h2>${escapeHtml(table.title)}</h2>
          ${
            hasRows
              ? `
                <table class="data-table">
                  <thead>
                    <tr>${table.columns.map((column) => `<th>${escapeHtml(column)}</th>`).join('')}</tr>
                  </thead>
                  <tbody>
                    ${table.rows
                      .map(
                        (row) => `
                          <tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join('')}</tr>
                        `,
                      )
                      .join('')}
                  </tbody>
                </table>
              `
              : `<div class="empty-state">${escapeHtml(table.emptyMessage ?? 'ไม่มีข้อมูล')}</div>`
          }
        </section>
      `;
    })
    .join('');
}

function buildNotesHtml(notes: string[] | undefined) {
  if (!notes || notes.length === 0) {
    return '';
  }

  return `
    <section class="section">
      <h2>หมายเหตุ</h2>
      <ul class="notes-list">
        ${notes.map((note) => `<li>${escapeHtml(note)}</li>`).join('')}
      </ul>
    </section>
  `;
}

function renderDocumentHtml(document: ExportDocument) {
  const orientation = document.orientation ?? 'portrait';

  return `<!DOCTYPE html>
  <html lang="th">
    <head>
      <meta charset="utf-8" />
      <title>${escapeHtml(document.title)}</title>
      <style>
        @page { size: A4 ${orientation}; margin: 16mm; }
        body {
          margin: 0;
          color: #202124;
          font-family: "Noto Sans Thai", "Sarabun", Tahoma, sans-serif;
          background: #ffffff;
        }
        .report {
          padding: 24px;
        }
        .report-header {
          margin-bottom: 20px;
          border-bottom: 2px solid #d9e2ef;
          padding-bottom: 12px;
        }
        .report-title {
          margin: 0 0 6px;
          font-size: 28px;
          font-weight: 700;
        }
        .report-subtitle {
          color: #5f6368;
          font-size: 14px;
        }
        .meta-table, .data-table {
          width: 100%;
          border-collapse: collapse;
        }
        .meta-table {
          margin: 0 0 20px;
        }
        .meta-table th,
        .meta-table td {
          border: 1px solid #d9e2ef;
          padding: 8px 10px;
          text-align: left;
          vertical-align: top;
          font-size: 13px;
        }
        .meta-table th {
          width: 180px;
          background: #f8fafc;
        }
        .summary-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          gap: 12px;
          margin-bottom: 20px;
        }
        .summary-card {
          border: 1px solid #e5e7eb;
          border-radius: 10px;
          padding: 12px 14px;
        }
        .summary-label {
          color: #5f6368;
          font-size: 12px;
          margin-bottom: 4px;
        }
        .summary-value {
          font-size: 22px;
          font-weight: 700;
        }
        .section {
          margin-bottom: 22px;
        }
        .section h2 {
          margin: 0 0 10px;
          font-size: 18px;
        }
        .data-table th,
        .data-table td {
          border: 1px solid #d9e2ef;
          padding: 8px 10px;
          text-align: left;
          font-size: 12px;
          vertical-align: top;
        }
        .data-table th {
          background: #f0f4f8;
          font-weight: 700;
        }
        .notes-list {
          margin: 0;
          padding-left: 18px;
          font-size: 13px;
        }
        .empty-state {
          border: 1px dashed #d9d9d9;
          color: #8c8c8c;
          padding: 16px;
          border-radius: 8px;
          font-size: 13px;
        }
      </style>
    </head>
    <body>
      <main class="report">
        <header class="report-header">
          <h1 class="report-title">${escapeHtml(document.title)}</h1>
          ${document.subtitle ? `<div class="report-subtitle">${escapeHtml(document.subtitle)}</div>` : ''}
        </header>
        ${buildMetadataHtml(document.metadata)}
        ${buildSummaryCardsHtml(document.summaries)}
        ${buildTablesHtml(document.tables)}
        ${buildNotesHtml(document.notes)}
      </main>
    </body>
  </html>`;
}

function downloadBlob(filename: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.setTimeout(() => window.URL.revokeObjectURL(url), 1000);
}

export function openPrintableReport(document: ExportDocument) {
  if (typeof window === 'undefined') {
    return false;
  }

  const popup = window.open('', '_blank');
  if (!popup) {
    return false;
  }

  popup.document.open();
  popup.document.write(renderDocumentHtml(document));
  popup.document.close();

  if (popup.document.title !== document.title) {
    popup.document.title = document.title;
  }

  if (navigator.webdriver !== true) {
    popup.addEventListener('load', () => {
      window.setTimeout(() => {
        popup.focus();
        popup.print();
      }, 200);
    });
  }

  return true;
}

export function downloadSpreadsheetReport(document: ExportDocument) {
  if (typeof window === 'undefined') {
    return false;
  }

  downloadBlob(
    document.filename,
    renderDocumentHtml(document),
    'application/vnd.ms-excel;charset=utf-8',
  );
  return true;
}

export function formatExportBaht(value: number) {
  return `${formatBaht(value)} ฿`;
}

export function formatExportPercent(value: number) {
  return `${value.toFixed(1)}%`;
}

export function formatExportProgress(progress: number) {
  return `${Math.round(progress * 100)}%`;
}

export function formatExportShortDate(date: string) {
  return formatThaiDateShort(date);
}

