import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import QRCode from 'qrcode';

export interface CertificatePdfPayload {
  certificateNumber: string;
  verificationToken: string;
  titleText: string;
  bodyTemplate: string;
  signatoryTitle: string;
  studentName: string;
  rollNumber: string;
  hallTicketNo: string;
  program: string;
  sectionCode: string;
  academicYear: string;
  purpose: string;
  issuedDate: string;
}

function wrapText(text: string, maxCharsPerLine: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = '';

  for (const w of words) {
    if ((current + ' ' + w).trim().length <= maxCharsPerLine) {
      current = (current + ' ' + w).trim();
    } else {
      if (current) lines.push(current);
      current = w;
    }
  }
  if (current) lines.push(current);
  return lines;
}

export async function generateCertificatePdfBytes(data: CertificatePdfPayload): Promise<Uint8Array> {
  // A4 Landscape: 841.89 x 595.28 points
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([841.89, 595.28]);
  const { width, height } = page.getSize();

  const fontRegular = await pdfDoc.embedFont(StandardFonts.TimesRoman);
  const fontBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
  const fontSans = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontSansBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const coral = rgb(0.85, 0.47, 0.36); // #D9785D VVITU accent
  const navy = rgb(0.06, 0.09, 0.16);
  const slate = rgb(0.28, 0.33, 0.41);
  const lightBg = rgb(0.99, 0.98, 0.97);

  // Background tint
  page.drawRectangle({ x: 0, y: 0, width, height, color: lightBg });

  // Outer & Inner Institutional Borders
  page.drawRectangle({
    x: 24,
    y: 24,
    width: width - 48,
    height: height - 48,
    borderColor: coral,
    borderWidth: 3,
  });
  page.drawRectangle({
    x: 32,
    y: 32,
    width: width - 64,
    height: height - 64,
    borderColor: navy,
    borderWidth: 1,
  });

  // Top Header: Embed VVIT Logo
  try {
    const logoRes = await fetch('/vvit-logo.png');
    if (logoRes.ok) {
      const logoBytes = await logoRes.arrayBuffer();
      const logoImg = await pdfDoc.embedPng(logoBytes);
      const logoDims = logoImg.scaleToFit(95, 85);
      page.drawImage(logoImg, {
        x: 52,
        y: height - 125,
        width: logoDims.width,
        height: logoDims.height,
      });
    }
  } catch {
    // Fallback if logo fails to fetch
  }

  // University Header Text
  const uniTitle = 'VASIREDDY VENKATADRI INTERNATIONAL TECHNOLOGICAL UNIVERSITY';
  page.drawText(uniTitle, {
    x: 162,
    y: height - 68,
    size: 16.5,
    font: fontBold,
    color: navy,
  });

  page.drawText('Nambur (V), Pedakakani (M), Guntur District, Andhra Pradesh - 522508, India', {
    x: 162,
    y: height - 88,
    size: 10.5,
    font: fontSans,
    color: slate,
  });

  page.drawText('OFFICE OF THE REGISTRAR & STUDENT CERTIFICATE CELL (DIGITAL ISSUANCE)', {
    x: 162,
    y: height - 105,
    size: 9.5,
    font: fontSansBold,
    color: coral,
  });

  // Divider Line
  page.drawLine({
    start: { x: 48, y: height - 135 },
    end: { x: width - 48, y: height - 135 },
    thickness: 1.5,
    color: coral,
  });

  // Certificate ID & Date Bar
  page.drawText(`Certificate No: ${data.certificateNumber}`, {
    x: 52,
    y: height - 155,
    size: 10,
    font: fontSansBold,
    color: navy,
  });

  const dateLabel = `Date of Issue: ${data.issuedDate}`;
  const dateWidth = fontSansBold.widthOfTextAtSize(dateLabel, 10);
  page.drawText(dateLabel, {
    x: width - 52 - dateWidth,
    y: height - 155,
    size: 10,
    font: fontSansBold,
    color: navy,
  });

  // Centered Certificate Title
  const titleUpper = data.titleText.toUpperCase();
  const titleWidth = fontBold.widthOfTextAtSize(titleUpper, 22);
  page.drawText(titleUpper, {
    x: (width - titleWidth) / 2,
    y: height - 195,
    size: 22,
    font: fontBold,
    color: coral,
  });

  page.drawLine({
    start: { x: (width - titleWidth) / 2, y: height - 201 },
    end: { x: (width + titleWidth) / 2, y: height - 201 },
    thickness: 1.2,
    color: navy,
  });

  // Replace Template Placeholders
  const populatedBody = data.bodyTemplate
    .replace(/\{\{student_name\}\}/g, data.studentName)
    .replace(/\{\{roll_number\}\}/g, data.rollNumber)
    .replace(/\{\{hall_ticket_no\}\}/g, data.hallTicketNo || 'N/A')
    .replace(/\{\{program\}\}/g, data.program)
    .replace(/\{\{section_code\}\}/g, data.sectionCode)
    .replace(/\{\{academic_year\}\}/g, data.academicYear || '2025-2026')
    .replace(/\{\{purpose\}\}/g, data.purpose);

  const lines = wrapText(populatedBody, 92);
  let cursorY = height - 240;
  for (const line of lines) {
    page.drawText(line, {
      x: 64,
      y: cursorY,
      size: 13.5,
      font: fontRegular,
      color: navy,
    });
    cursorY -= 22;
  }

  // Generate Live QR Code pointing to deployed verification route
  const verifyUrl = `${window.location.origin}/verify/${data.verificationToken}`;
  const qrDataUrl = await QRCode.toDataURL(verifyUrl, {
    width: 180,
    margin: 1,
    color: { dark: '#0F172A', light: '#FFFFFF' },
  });
  const qrPngBytes = await fetch(qrDataUrl).then((r) => r.arrayBuffer());
  const qrImage = await pdfDoc.embedPng(qrPngBytes);

  // Bottom-Right QR Code & Verification Instructions
  const qrSize = 86;
  const qrX = width - 55 - qrSize;
  const qrY = 55;
  page.drawImage(qrImage, { x: qrX, y: qrY, width: qrSize, height: qrSize });

  page.drawText('Scan QR to verify authenticity online:', {
    x: 52,
    y: 78,
    size: 8.5,
    font: fontSansBold,
    color: slate,
  });
  page.drawText(verifyUrl, {
    x: 52,
    y: 65,
    size: 8,
    font: fontSans,
    color: coral,
  });
  page.drawText(`Verification Ref: ${data.verificationToken}`, {
    x: 52,
    y: 52,
    size: 8,
    font: fontSans,
    color: slate,
  });

  // Signatory Block (Bottom Center-Right before QR)
  const sigX = width - 350;
  page.drawLine({
    start: { x: sigX, y: 92 },
    end: { x: sigX + 180, y: 92 },
    thickness: 1,
    color: navy,
  });
  page.drawText(data.signatoryTitle, {
    x: sigX,
    y: 76,
    size: 9.5,
    font: fontSansBold,
    color: navy,
  });
  page.drawText('VVITU, Nambur (Demo Seal & Signatory)', {
    x: sigX,
    y: 63,
    size: 8,
    font: fontSans,
    color: slate,
  });

  return await pdfDoc.save();
}
