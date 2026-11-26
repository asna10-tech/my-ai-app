import { jsPDF } from 'jspdf';
import type { AdsorbentMaterial, ExperimentRun, PrototypeCartridgeConfig, WaterSample } from '../types/aquapure';
import { BIS_IS_10500, evaluateExperimentVerification } from './calculations';

export function generateExperimentPdfReport(params: {
  experiment: ExperimentRun;
  sample: WaterSample | undefined;
  adsorbent: AdsorbentMaterial | undefined;
  secondaryAdsorbent?: AdsorbentMaterial | undefined;
  prototype: PrototypeCartridgeConfig;
}): void {
  const { experiment, sample, adsorbent, secondaryAdsorbent, prototype } = params;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;
  let y = 16;

  const ensureSpace = (neededMm: number) => {
    if (y + neededMm > pageHeight - 18) {
      doc.addPage();
      y = 18;
    }
  };

  const drawSectionHeading = (title: string) => {
    ensureSpace(14);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text(title, margin, y);
    y += 2;
    doc.setDrawColor(37, 99, 235);
    doc.setLineWidth(0.5);
    doc.line(margin, y, margin + contentWidth, y);
    y += 5;
  };

  const drawKeyValueRow = (label: string, value: string, xOffset = 0, colWidth = contentWidth) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);
    doc.text(label, margin + xOffset, y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(15, 23, 42);
    const wrapped = doc.splitTextToSize(value, colWidth - 42);
    doc.text(wrapped, margin + xOffset + 42, y);
    y += Math.max(5, wrapped.length * 4.2);
  };

  // Header Banner
  doc.setFillColor(29, 78, 216);
  doc.rect(0, 0, pageWidth, 28, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text('AQUAPURE INDIGENOUS — RESEARCH EXPERIMENT REPORT', margin, 12);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`${prototype.programName}  |  ${prototype.projectTitle}`, margin, 18.5);
  doc.text(
    `Experiment ID: ${experiment.experimentCode}  |  Date: ${experiment.date}  |  Origin: ${
      experiment.dataOrigin === 'simulated' ? 'SIMULATED DEMONSTRATION DATA' : 'MEASURED LAB DATA'
    }`,
    margin,
    24
  );

  y = 36;

  // Verification Notice Box
  const verification = evaluateExperimentVerification(experiment);
  doc.setFillColor(verification.requiresAdditionalVerification ? 254 : 240, verification.requiresAdditionalVerification ? 243 : 249, verification.requiresAdditionalVerification ? 199 : 255);
  doc.setDrawColor(verification.requiresAdditionalVerification ? 217 : 37, verification.requiresAdditionalVerification ? 119 : 99, verification.requiresAdditionalVerification ? 6 : 235);
  doc.rect(margin, y, contentWidth, 12, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  const statusText = verification.requiresAdditionalVerification
    ? `VERIFICATION FLAG: ${verification.flagReason}`
    : `LABORATORY VERIFIED (${experiment.analyticalMethod}) — Results reported against BIS IS 10500:2012 limits.`;
  const statusLines = doc.splitTextToSize(statusText, contentWidth - 6);
  doc.text(statusLines, margin + 3, y + 5);
  y += 17;

  // Section 1: Experiment & Sample Information
  drawSectionHeading('1. Experiment & Sample Information');
  drawKeyValueRow('Experiment Title:', experiment.title);
  drawKeyValueRow('Sample ID / Location:', sample ? `${sample.sampleCode} — ${sample.location} (${sample.districtState})` : experiment.sampleId);
  drawKeyValueRow('Collection Date:', sample?.collectionDate ?? 'Not recorded');
  drawKeyValueRow('Analytical Method:', `${experiment.analyticalMethod} (${experiment.verificationSource === 'laboratory_verified' ? 'Laboratory-Verified' : 'Field Sensor Only'})`);
  y += 2;

  // Section 2: Adsorbent Details
  drawSectionHeading('2. Adsorbent Material Details');
  drawKeyValueRow('Primary Media:', adsorbent ? `${adsorbent.name} (${adsorbent.category})` : experiment.adsorbentId);
  drawKeyValueRow('Material Source:', adsorbent?.sourceOfMaterial ?? 'Not specified');
  if (secondaryAdsorbent) {
    drawKeyValueRow('Secondary Stage:', `${secondaryAdsorbent.name} (${secondaryAdsorbent.category})`);
  }
  drawKeyValueRow(
    'Operating Params:',
    `Mass = ${experiment.adsorbentMassG} g  |  Volume = ${experiment.waterVolumeL} L  |  Contact Time = ${experiment.contactTimeMin} min  |  Flow Rate = ${experiment.filtrationRateLPerHr} L/h`
  );
  y += 2;

  // Section 3: Water-Quality Measurements vs BIS IS 10500
  drawSectionHeading('3. Initial & Final Water-Quality Measurements (BIS IS 10500:2012)');
  const tableTop = y;
  const cols = [margin, margin + 42, margin + 74, margin + 106, margin + 142];
  doc.setFillColor(241, 245, 249);
  doc.rect(margin, tableTop, contentWidth, 7, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(30, 41, 59);
  doc.text('Parameter', cols[0] + 2, tableTop + 4.8);
  doc.text('Initial', cols[1] + 2, tableTop + 4.8);
  doc.text('Final', cols[2] + 2, tableTop + 4.8);
  doc.text('BIS IS 10500 Limit', cols[3] + 2, tableTop + 4.8);
  doc.text('Status', cols[4] + 2, tableTop + 4.8);
  y = tableTop + 7;

  const rows: Array<[string, string, string, string, string]> = [
    [
      'pH',
      experiment.initialPh.toFixed(2),
      experiment.finalPh.toFixed(2),
      `${BIS_IS_10500.ph.min} – ${BIS_IS_10500.ph.max}`,
      experiment.finalPh >= 6.5 && experiment.finalPh <= 8.5 ? 'Within Limit' : 'Out of Range',
    ],
    [
      'TDS (mg/L)',
      String(experiment.initialTdsMgL),
      String(experiment.finalTdsMgL),
      `<= ${BIS_IS_10500.tds.acceptableMgL} (Perm. 2000)`,
      experiment.finalTdsMgL <= 500 ? 'Acceptable' : experiment.finalTdsMgL <= 2000 ? 'Permissible' : 'Exceeded',
    ],
    [
      'Turbidity (NTU)',
      experiment.initialTurbidityNtu.toFixed(2),
      experiment.finalTurbidityNtu.toFixed(2),
      `<= ${BIS_IS_10500.turbidity.acceptableNtu} (Perm. 5.0)`,
      experiment.finalTurbidityNtu <= 1 ? 'Acceptable' : experiment.finalTurbidityNtu <= 5 ? 'Permissible' : 'Exceeded',
    ],
    [
      'Arsenic (mg/L)',
      experiment.initialArsenicMgL !== null ? experiment.initialArsenicMgL.toFixed(4) : 'Not assayed',
      experiment.finalArsenicMgL !== null ? experiment.finalArsenicMgL.toFixed(4) : 'Pending Lab',
      `<= ${BIS_IS_10500.arsenic.acceptableMgL} (No relax.)`,
      experiment.finalArsenicMgL === null
        ? 'Lab Required'
        : experiment.finalArsenicMgL <= 0.01
        ? 'Meets BIS'
        : 'Exceeds Limit',
    ],
    [
      'Fluoride (mg/L)',
      experiment.initialFluorideMgL !== null ? experiment.initialFluorideMgL.toFixed(2) : 'Not assayed',
      experiment.finalFluorideMgL !== null ? experiment.finalFluorideMgL.toFixed(2) : 'Pending Lab',
      `<= ${BIS_IS_10500.fluoride.acceptableMgL} (Perm. 1.5)`,
      experiment.finalFluorideMgL === null
        ? 'Lab Required'
        : experiment.finalFluorideMgL <= 1.0
        ? 'Acceptable'
        : experiment.finalFluorideMgL <= 1.5
        ? 'Permissible'
        : 'Exceeds Limit',
    ],
  ];

  doc.setFont('helvetica', 'normal');
  rows.forEach((row, idx) => {
    if (idx % 2 === 1) {
      doc.setFillColor(248, 250, 252);
      doc.rect(margin, y, contentWidth, 6.5, 'F');
    }
    doc.setDrawColor(226, 232, 240);
    doc.line(margin, y + 6.5, margin + contentWidth, y + 6.5);
    doc.setTextColor(15, 23, 42);
    doc.text(row[0], cols[0] + 2, y + 4.4);
    doc.text(row[1], cols[1] + 2, y + 4.4);
    doc.text(row[2], cols[2] + 2, y + 4.4);
    doc.text(row[3], cols[3] + 2, y + 4.4);
    doc.text(row[4], cols[4] + 2, y + 4.4);
    y += 6.5;
  });
  y += 6;

  // Section 4: Removal Efficiency & Performance Graph
  drawSectionHeading('4. Removal Efficiency, Capacity & Performance Visualization');
  drawKeyValueRow(
    'Formulas Applied:',
    'R (%) = [(C0 - Ce) / C0] x 100   |   q (mg/g) = [(C0 - Ce) x V (L)] / m (g)'
  );
  drawKeyValueRow(
    'Arsenic Removal:',
    experiment.arsenicRemovalPct !== null ? `${experiment.arsenicRemovalPct.toFixed(2)}%` : 'Pending laboratory assay'
  );
  drawKeyValueRow(
    'Fluoride Removal:',
    experiment.fluorideRemovalPct !== null ? `${experiment.fluorideRemovalPct.toFixed(2)}%` : 'Pending laboratory assay'
  );
  drawKeyValueRow(
    'Adsorption Capacity (q):',
    experiment.adsorptionCapacityMgG !== null ? `${experiment.adsorptionCapacityMgG.toFixed(4)} mg/g` : 'Not computed (assay pending)'
  );

  // Embedded Vector Performance Chart in PDF
  ensureSpace(44);
  const chartX = margin;
  const chartY = y + 2;
  const chartW = contentWidth;
  const chartH = 34;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.rect(chartX, chartY, chartW, chartH, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(51, 65, 85);
  doc.text('Contaminant Removal Efficiency (%) — Performance Profile (Capped < 100% Analytical Rule)', chartX + 4, chartY + 5.5);

  const metrics: Array<{ label: string; pct: number | null; r: number; g: number; b: number }> = [
    { label: 'Arsenic (As) Removal', pct: experiment.arsenicRemovalPct, r: 37, g: 99, b: 235 },
    { label: 'Fluoride (F⁻) Removal', pct: experiment.fluorideRemovalPct, r: 2, g: 132, b: 199 },
  ];

  metrics.forEach((m, i) => {
    const barY = chartY + 12 + i * 10;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42);
    doc.text(m.label, chartX + 4, barY + 4);
    const barTrackX = chartX + 44;
    const barTrackW = chartW - 72;
    doc.setFillColor(226, 232, 240);
    doc.rect(barTrackX, barY, barTrackW, 5.5, 'F');
    if (m.pct !== null && m.pct > 0) {
      const fillW = Math.min(barTrackW, (m.pct / 100) * barTrackW);
      doc.setFillColor(m.r, m.g, m.b);
      doc.rect(barTrackX, barY, fillW, 5.5, 'F');
      doc.setFont('helvetica', 'bold');
      doc.text(`${m.pct.toFixed(2)}%`, barTrackX + barTrackW + 3, barY + 4.2);
    } else {
      doc.setTextColor(100, 116, 139);
      doc.text('N/A (Pending)', barTrackX + barTrackW + 3, barY + 4.2);
    }
  });
  y = chartY + chartH + 6;

  // Section 5: Cost Analysis
  drawSectionHeading('5. Cost Analysis & Cartridge Operating Life');
  drawKeyValueRow('Estimated Media Cost:', `INR ${experiment.treatmentCostPer1000LInr.toFixed(2)} per 1,000 L treated water`);
  drawKeyValueRow(
    'Cartridge Operating Life:',
    experiment.cartridgeOperatingLifeL !== null
      ? `${experiment.cartridgeOperatingLifeL} L (${experiment.cartridgeOperatingLifeHrs ?? '—'} hrs at ${experiment.filtrationRateLPerHr} L/h)`
      : 'Not yet measured in breakthrough column run'
  );
  y += 2;

  // Section 6: Research Observations, Limitations & Safety Conclusions
  drawSectionHeading('6. Observations, Limitations & Safety Conclusions');
  drawKeyValueRow('Research Observations:', experiment.observations);
  drawKeyValueRow('Limitations:', experiment.limitations);
  drawKeyValueRow(
    'Safety & Disposal Notice:',
    'TDS reduction does NOT indicate arsenic or fluoride removal. Water must NOT be certified safe for drinking without accredited laboratory verification (ICP-MS/AAS for As, ISE/SPADNS for F⁻) against BIS IS 10500:2012. Spent adsorbent media concentrates toxic contaminants and requires TCLP testing, stabilization, and regulated hazardous disposal.'
  );

  // Footer
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text(
    `Generated by AquaPure Indigenous (${prototype.programName}) · ${new Date().toISOString().slice(0, 16).replace('T', ' ')} UTC`,
    margin,
    pageHeight - 8
  );

  doc.save(`AquaPure_Report_${experiment.experimentCode}.pdf`);
}
