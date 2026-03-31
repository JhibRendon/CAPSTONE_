export const RCA_CATEGORY_LABELS = {
  academic_performance: 'Academic Performance - Grades, coursework, academic progress',
  administrative_process: 'Administrative Process - Registration, enrollment, policies',
  personnel_conduct: 'Personnel/Conduct - Staff behavior, professionalism',
  harassment_discrimination: 'Harassment/Discrimination - Bullying, sexual harassment, discrimination',
  infrastructure_facilities: 'Infrastructure/Facilities - Buildings, equipment, utilities',
  service_quality: 'Service Quality - Support services, responsiveness',
  policy_enforcement: 'Policy Enforcement - Rule violations, inconsistent application',
  others: 'Others - Any issue not listed above',
};

const RCA_FIELDS = [
  'problemSummary',
  'rootCauseCategory',
  'rootCauseDescription',
  'actionTaken',
  'preventiveAction',
  'responsibleOffice',
  'resolutionDate',
  'rcaStatus',
  'completedAt',
];

const PDF_PAGE = {
  width: 595,
  height: 842,
  marginLeft: 50,
  marginRight: 50,
  top: 88,
  bottom: 62,
  contentWidth: 495,
};

export const hasRcaContent = (source) => {
  const rca = source?.rootCauseAnalysis || source;

  if (!rca || typeof rca !== 'object') {
    return false;
  }

  return RCA_FIELDS.some((field) => {
    const value = rca[field];
    return value !== null && value !== undefined && String(value).trim() !== '';
  });
};

export const getRcaCategoryLabel = (value) => RCA_CATEGORY_LABELS[value] || value || '--';

const formatDateTime = (value) => (value ? new Date(value).toLocaleString() : '--');

const normalizePdfText = (value) =>
  String(value ?? '--')
    .normalize('NFKD')
    .replace(/[^\x20-\x7E\n]/g, '')
    .replace(/\r/g, '');

const escapePdfText = (value) =>
  normalizePdfText(value)
    .replaceAll('\\', '\\\\')
    .replaceAll('(', '\\(')
    .replaceAll(')', '\\)');

const safeFileName = (value) =>
  String(value || 'RCA-Report')
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, '_')
    .replace(/\s+/g, '_')
    .slice(0, 120);

const wrapText = (text, maxChars) => {
  const normalized = normalizePdfText(text);
  const paragraphs = normalized.split('\n');
  const lines = [];

  paragraphs.forEach((paragraph) => {
    const content = paragraph.trim();

    if (!content) {
      lines.push('');
      return;
    }

    const words = content.split(/\s+/);
    let current = '';

    words.forEach((word) => {
      if (!current) {
        current = word;
        return;
      }

      if (`${current} ${word}`.length <= maxChars) {
        current = `${current} ${word}`;
      } else {
        lines.push(current);
        current = word;
      }
    });

    if (current) {
      lines.push(current);
    }
  });

  return lines.length ? lines : ['--'];
};

const textCommand = (x, y, text, font = 'F1', size = 11) =>
  `BT /${font} ${size} Tf 1 0 0 1 ${x} ${y} Tm (${escapePdfText(text)}) Tj ET`;

const lineCommand = (x1, y1, x2, y2) => `${x1} ${y1} m ${x2} ${y2} l S`;

const rectCommand = (x, y, width, height) => `${x} ${y} ${width} ${height} re S`;

const fillRectCommand = (x, y, width, height, color = '0.93 0.97 1') =>
  `q ${color} rg ${x} ${y} ${width} ${height} re f Q`;

const approximateCharLimit = (width, fontSize) => Math.max(20, Math.floor(width / (fontSize * 0.52)));

const buildPdfDocument = (pages) => {
  const objects = [];
  objects[1] = '<< /Type /Catalog /Pages 2 0 R >>';

  const kids = [];
  let objectId = 6;

  pages.forEach((content) => {
    const pageId = objectId;
    const contentId = objectId + 1;
    kids.push(`${pageId} 0 R`);

    objects[pageId] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PDF_PAGE.width} ${PDF_PAGE.height}] /Resources << /Font << /F1 3 0 R /F2 4 0 R /F3 5 0 R >> >> /Contents ${contentId} 0 R >>`;
    objects[contentId] = `<< /Length ${content.length} >>\nstream\n${content}\nendstream`;

    objectId += 2;
  });

  objects[2] = `<< /Type /Pages /Kids [${kids.join(' ')}] /Count ${pages.length} >>`;
  objects[3] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>';
  objects[4] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>';
  objects[5] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Oblique >>';

  let pdf = '%PDF-1.4\n';
  const offsets = [0];

  for (let i = 1; i < objects.length; i += 1) {
    offsets[i] = pdf.length;
    pdf += `${i} 0 obj\n${objects[i]}\nendobj\n`;
  }

  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length}\n`;
  pdf += '0000000000 65535 f \n';

  for (let i = 1; i < objects.length; i += 1) {
    pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  }

  pdf += `trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return new Blob([pdf], { type: 'application/pdf' });
};

export const downloadRcaPdf = (grievance) => {
  const rca = grievance?.rootCauseAnalysis;

  if (!grievance || !hasRcaContent(rca) || typeof window === 'undefined') {
    return;
  }

  const referenceNumber = grievance.trackingId || grievance.referenceNumber || 'RCA-Report';
  const officeName = rca.responsibleOffice || grievance.office || '--';
  const complainantName = grievance.isAnonymous
    ? 'Anonymous'
    : grievance.complainantName || grievance.complainantId?.name || '--';
  const departmentHeadName = rca.completedBy?.name || grievance.assignedTo?.name || '--';
  const generatedAt = formatDateTime(new Date());
  const completedAt = formatDateTime(rca.completedAt || rca.resolutionDate);

  const sections = [
    ['Problem Summary', rca.problemSummary || '--'],
    ['Root Cause Category', getRcaCategoryLabel(rca.rootCauseCategory)],
    ['Root Cause Description', rca.rootCauseDescription || '--'],
    ['Action Taken', rca.actionTaken || '--'],
    ['Preventive Action', rca.preventiveAction || '--'],
  ];

  const pages = [];
  let commands = [];
  let pageNumber = 1;
  let y = PDF_PAGE.height - PDF_PAGE.top;

  const startPage = () => {
    commands = [
      '0 0 0 RG',
      '0 0 0 rg',
      textCommand(PDF_PAGE.marginLeft, PDF_PAGE.height - 48, 'Root Cause Analysis Report', 'F2', 18),
      textCommand(PDF_PAGE.marginLeft, PDF_PAGE.height - 66, 'i-Serve BukSU Grievance Management System', 'F1', 10),
      textCommand(PDF_PAGE.width - 205, PDF_PAGE.height - 48, `Reference: ${referenceNumber}`, 'F1', 10),
      textCommand(PDF_PAGE.width - 205, PDF_PAGE.height - 64, `Generated: ${generatedAt}`, 'F1', 10),
      lineCommand(PDF_PAGE.marginLeft, PDF_PAGE.height - 76, PDF_PAGE.width - PDF_PAGE.marginRight, PDF_PAGE.height - 76),
    ];
    y = PDF_PAGE.height - 112;
  };

  const finalizePage = () => {
    commands.push(
      lineCommand(PDF_PAGE.marginLeft, 40, PDF_PAGE.width - PDF_PAGE.marginRight, 40),
      textCommand(PDF_PAGE.marginLeft, 24, `Confidential RCA Document - ${officeName}`, 'F1', 9),
      textCommand(PDF_PAGE.width - 110, 24, `Page ${pageNumber}`, 'F1', 9)
    );
    pages.push(commands.join('\n'));
    pageNumber += 1;
  };

  const ensureSpace = (heightNeeded) => {
    if (y - heightNeeded < PDF_PAGE.bottom) {
      finalizePage();
      startPage();
    }
  };

  const addLines = (lines, options = {}) => {
    const {
      x = PDF_PAGE.marginLeft,
      font = 'F1',
      size = 11,
      leading = size + 3,
    } = options;

    ensureSpace(lines.length * leading + 4);

    lines.forEach((line) => {
      commands.push(textCommand(x, y, line, font, size));
      y -= leading;
    });
  };

  startPage();

  commands.push(fillRectCommand(PDF_PAGE.marginLeft, y - 76, PDF_PAGE.contentWidth, 76));
  commands.push(rectCommand(PDF_PAGE.marginLeft, y - 76, PDF_PAGE.contentWidth, 76));
  addLines([
    `Grievance Subject: ${grievance.subject || '--'}`,
    `Complainant: ${complainantName}`,
    `Office / Department: ${officeName}`,
    `RCA Status: ${(rca.rcaStatus || '--').replaceAll('_', ' ').toUpperCase()}`,
    `Department Head / Office User: ${departmentHeadName}`,
    `Completed At: ${completedAt}`,
  ], { x: PDF_PAGE.marginLeft + 12, font: 'F1', size: 10, leading: 12 });

  y -= 12;

  sections.forEach(([label, value]) => {
    const wrappedLines = wrapText(value, approximateCharLimit(PDF_PAGE.contentWidth - 12, 11));
    const blockHeight = 18 + wrappedLines.length * 14 + 16;
    ensureSpace(blockHeight);

    commands.push(textCommand(PDF_PAGE.marginLeft, y, label, 'F2', 12));
    y -= 18;
    commands.push(rectCommand(PDF_PAGE.marginLeft, y - wrappedLines.length * 14 - 10, PDF_PAGE.contentWidth, wrappedLines.length * 14 + 14));
    wrappedLines.forEach((line) => {
      commands.push(textCommand(PDF_PAGE.marginLeft + 8, y - 10, line, 'F1', 11));
      y -= 14;
    });
    y -= 18;
  });

  ensureSpace(130);
  commands.push(textCommand(PDF_PAGE.marginLeft, y, 'Approval and Signatory', 'F2', 12));
  y -= 20;
  commands.push(rectCommand(PDF_PAGE.marginLeft, y - 80, PDF_PAGE.contentWidth, 80));
  commands.push(textCommand(PDF_PAGE.marginLeft + 12, y - 18, `Office / Department: ${officeName}`, 'F1', 11));
  commands.push(textCommand(PDF_PAGE.marginLeft + 12, y - 36, 'Department Head Signature:', 'F1', 11));
  commands.push(textCommand(PDF_PAGE.marginLeft + 240, y - 34, departmentHeadName, 'F3', 20));
  commands.push(lineCommand(PDF_PAGE.marginLeft + 240, y - 44, PDF_PAGE.marginLeft + 430, y - 44));
  commands.push(textCommand(PDF_PAGE.marginLeft + 240, y - 58, departmentHeadName, 'F2', 10));
  commands.push(textCommand(PDF_PAGE.marginLeft + 240, y - 72, 'Signature over printed name', 'F1', 9));

  finalizePage();

  const blob = buildPdfDocument(pages);
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${safeFileName(referenceNumber)}_RCA.pdf`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};
