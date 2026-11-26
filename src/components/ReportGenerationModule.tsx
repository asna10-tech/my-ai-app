import { useMemo, useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { AlertTriangle, CheckCircle2, Download, FileText } from 'lucide-react';
import type { WorkspaceData } from '../types/aquapure';
import { BIS_IS_10500, evaluateExperimentVerification } from '../utils/calculations';
import { generateExperimentPdfReport } from '../utils/pdfReport';

interface ReportGenerationModuleProps {
  data: WorkspaceData;
}

export function ReportGenerationModule({ data }: ReportGenerationModuleProps) {
  const [selectedExpId, setSelectedExpId] = useState(data.experiments[0]?.id ?? '');

  const experiment = useMemo(
    () => data.experiments.find((e) => e.id === selectedExpId) ?? data.experiments[0],
    [data.experiments, selectedExpId]
  );

  const sample = useMemo(
    () => data.samples.find((s) => s.id === experiment?.sampleId),
    [data.samples, experiment]
  );

  const adsorbent = useMemo(
    () => data.adsorbents.find((a) => a.id === experiment?.adsorbentId),
    [data.adsorbents, experiment]
  );

  const secondaryAdsorbent = useMemo(
    () =>
      experiment?.secondaryAdsorbentId
        ? data.adsorbents.find((a) => a.id === experiment.secondaryAdsorbentId)
        : undefined,
    [data.adsorbents, experiment]
  );

  if (!experiment) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-sm text-slate-600">
        Log at least one experiment to generate a downloadable PDF research report.
      </div>
    );
  }

  const verification = evaluateExperimentVerification(experiment);

  const previewChartData = [
    {
      contaminant: 'Arsenic Removal',
      efficiency: experiment.arsenicRemovalPct ?? 0,
    },
    {
      contaminant: 'Fluoride Removal',
      efficiency: experiment.fluorideRemovalPct ?? 0,
    },
  ];

  const handleDownloadPdf = () => {
    generateExperimentPdfReport({
      experiment,
      sample,
      adsorbent,
      secondaryAdsorbent,
      prototype: data.prototype,
    });
  };

  return (
    <div className="space-y-6">
      {/* Selector & Download Toolbar */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex-1 max-w-xl">
          <label className="block text-xs font-medium text-slate-700 mb-1.5">
            Select Experiment Run for Report Generation
          </label>
          <select
            value={experiment.id}
            onChange={(e) => setSelectedExpId(e.target.value)}
            className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg"
          >
            {data.experiments.map((exp) => (
              <option key={exp.id} value={exp.id}>
                {exp.experimentCode} — {exp.title} ({exp.dataOrigin === 'simulated' ? 'Simulated' : 'Measured'})
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          onClick={handleDownloadPdf}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors whitespace-nowrap shrink-0"
        >
          <Download className="w-4 h-4" />
          Download PDF Report
        </button>
      </div>

      {/* Live Report Sheet Preview */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="bg-blue-700 text-white p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <p className="text-xs font-medium text-blue-100">{data.prototype.programName}</p>
              <h2 className="text-xl font-semibold mt-1">{data.prototype.projectTitle}</h2>
            </div>
            <div className="text-xs font-mono text-blue-100 sm:text-right">
              <div>Experiment ID: {experiment.experimentCode}</div>
              <div>
                Date: {experiment.date} ·{' '}
                {experiment.dataOrigin === 'simulated' ? 'Simulated Demo' : 'Measured Data'}
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6 text-sm">
          {/* Verification Banner */}
          <div
            className={`p-3.5 rounded-lg border flex items-start gap-2.5 text-xs ${
              verification.requiresAdditionalVerification
                ? 'bg-amber-50 border-amber-200 text-amber-950'
                : 'bg-blue-50 border-blue-200 text-slate-800'
            }`}
          >
            {verification.requiresAdditionalVerification ? (
              <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
            )}
            <div>
              {verification.requiresAdditionalVerification
                ? `Verification Flag: ${verification.flagReason}`
                : `Laboratory Verified (${experiment.analyticalMethod}) — Evaluated against BIS IS 10500:2012 limits.`}
            </div>
          </div>

          {/* Sample & Adsorbent Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="border border-slate-200 rounded-lg p-4 space-y-2 text-xs">
              <div className="flex items-center gap-1.5 font-semibold text-slate-900 text-sm">
                <FileText className="w-4 h-4 text-blue-700" />
                Sample Information
              </div>
              <div className="grid grid-cols-2 gap-y-1.5 pt-1">
                <span className="text-slate-500">Sample Code:</span>
                <span className="font-mono font-medium text-slate-900">
                  {sample?.sampleCode ?? experiment.sampleId}
                </span>
                <span className="text-slate-500">Location:</span>
                <span className="text-slate-900">
                  {sample ? `${sample.location}, ${sample.districtState}` : '—'}
                </span>
                <span className="text-slate-500">Collection Date:</span>
                <span className="font-mono text-slate-900">{sample?.collectionDate ?? '—'}</span>
                <span className="text-slate-500">Analytical Method:</span>
                <span className="text-slate-900">{experiment.analyticalMethod}</span>
              </div>
            </div>

            <div className="border border-slate-200 rounded-lg p-4 space-y-2 text-xs">
              <div className="font-semibold text-slate-900 text-sm">Adsorbent &amp; Operating Details</div>
              <div className="grid grid-cols-2 gap-y-1.5 pt-1">
                <span className="text-slate-500">Primary Adsorbent:</span>
                <span className="font-medium text-slate-900">
                  {adsorbent?.name ?? experiment.adsorbentId}
                </span>
                {secondaryAdsorbent && (
                  <>
                    <span className="text-slate-500">Secondary Stage:</span>
                    <span className="font-medium text-slate-900">{secondaryAdsorbent.name}</span>
                  </>
                )}
                <span className="text-slate-500">Media Mass / Volume:</span>
                <span className="font-mono text-slate-900">
                  {experiment.adsorbentMassG} g / {experiment.waterVolumeL} L
                </span>
                <span className="text-slate-500">Contact Time / Flow:</span>
                <span className="font-mono text-slate-900">
                  {experiment.contactTimeMin} min / {experiment.filtrationRateLPerHr} L/h
                </span>
              </div>
            </div>
          </div>

          {/* Initial vs Final Water-Quality Table */}
          <div>
            <h3 className="text-sm font-semibold text-slate-900 mb-2">
              Initial &amp; Final Water-Quality Measurements (BIS IS 10500:2012)
            </h3>
            <div className="overflow-x-auto border border-slate-200 rounded-lg">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                  <tr>
                    <th className="py-2.5 px-3">Parameter</th>
                    <th className="py-2.5 px-3 text-right">Initial</th>
                    <th className="py-2.5 px-3 text-right">Final</th>
                    <th className="py-2.5 px-3 text-right">BIS IS 10500 Limit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono tabular-nums">
                  <tr>
                    <td className="py-2 px-3 font-sans font-medium text-slate-800">pH</td>
                    <td className="py-2 px-3 text-right">{experiment.initialPh.toFixed(2)}</td>
                    <td className="py-2 px-3 text-right">{experiment.finalPh.toFixed(2)}</td>
                    <td className="py-2 px-3 text-right">
                      {BIS_IS_10500.ph.min} – {BIS_IS_10500.ph.max}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 font-sans font-medium text-slate-800">TDS (mg/L)</td>
                    <td className="py-2 px-3 text-right">{experiment.initialTdsMgL}</td>
                    <td className="py-2 px-3 text-right">{experiment.finalTdsMgL}</td>
                    <td className="py-2 px-3 text-right">&lt;= 500 (Perm. 2000)</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 font-sans font-medium text-slate-800">Turbidity (NTU)</td>
                    <td className="py-2 px-3 text-right">{experiment.initialTurbidityNtu.toFixed(2)}</td>
                    <td className="py-2 px-3 text-right">{experiment.finalTurbidityNtu.toFixed(2)}</td>
                    <td className="py-2 px-3 text-right">&lt;= 1.0 (Perm. 5.0)</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 font-sans font-medium text-slate-800">Arsenic (mg/L)</td>
                    <td className="py-2 px-3 text-right">
                      {experiment.initialArsenicMgL !== null ? experiment.initialArsenicMgL.toFixed(4) : 'Not assayed'}
                    </td>
                    <td className="py-2 px-3 text-right">
                      {experiment.finalArsenicMgL !== null ? experiment.finalArsenicMgL.toFixed(4) : 'Pending Lab'}
                    </td>
                    <td className="py-2 px-3 text-right">&lt;= 0.01 (No relaxation)</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 font-sans font-medium text-slate-800">Fluoride (mg/L)</td>
                    <td className="py-2 px-3 text-right">
                      {experiment.initialFluorideMgL !== null ? experiment.initialFluorideMgL.toFixed(2) : 'Not assayed'}
                    </td>
                    <td className="py-2 px-3 text-right">
                      {experiment.finalFluorideMgL !== null ? experiment.finalFluorideMgL.toFixed(2) : 'Pending Lab'}
                    </td>
                    <td className="py-2 px-3 text-right">&lt;= 1.0 (Perm. 1.5)</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Calculations, Performance Graph & Cost */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            <div className="lg:col-span-5 space-y-2 text-xs">
              <h3 className="text-sm font-semibold text-slate-900">
                Calculations &amp; Cost Analysis
              </h3>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1.5 font-mono">
                <div className="flex justify-between">
                  <span className="text-slate-600">As Removal (%):</span>
                  <span className="font-semibold text-blue-700">
                    {experiment.arsenicRemovalPct !== null ? `${experiment.arsenicRemovalPct.toFixed(2)}%` : 'Pending'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">F⁻ Removal (%):</span>
                  <span className="font-semibold text-sky-700">
                    {experiment.fluorideRemovalPct !== null ? `${experiment.fluorideRemovalPct.toFixed(2)}%` : 'Pending'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Capacity q:</span>
                  <span className="font-semibold text-slate-900">
                    {experiment.adsorptionCapacityMgG !== null
                      ? `${experiment.adsorptionCapacityMgG.toFixed(4)} mg/g`
                      : '—'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Media Cost:</span>
                  <span className="font-semibold text-slate-900">
                    INR {experiment.treatmentCostPer1000LInr.toFixed(2)} / 1,000 L
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Cartridge Life:</span>
                  <span className="font-semibold text-slate-900">
                    {experiment.cartridgeOperatingLifeL !== null
                      ? `${experiment.cartridgeOperatingLifeL} L`
                      : 'Not yet measured'}
                  </span>
                </div>
              </div>
            </div>

            <div className="lg:col-span-7 border border-slate-200 rounded-lg p-3">
              <p className="text-xs font-medium text-slate-600 mb-2">
                Performance Graph (Embedded in PDF Export)
              </p>
              <div className="h-44 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={previewChartData} layout="vertical" margin={{ top: 4, right: 24, left: 20, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis type="number" domain={[0, 100]} unit="%" tick={{ fontSize: 11 }} />
                    <YAxis type="category" dataKey="contaminant" width={110} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="efficiency" name="Removal (%)" fill="#1d4ed8" radius={[0, 4, 4, 0]} barSize={22} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Observations, Limitations & Conclusions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs leading-relaxed">
            <div className="border border-slate-200 rounded-lg p-4">
              <p className="font-semibold text-slate-900 mb-1">Research Observations</p>
              <p className="text-slate-700">{experiment.observations}</p>
            </div>
            <div className="border border-slate-200 rounded-lg p-4">
              <p className="font-semibold text-slate-900 mb-1">Limitations, Safety &amp; Conclusions</p>
              <p className="text-slate-700">{experiment.limitations}</p>
              <p className="text-amber-900 mt-2 font-medium">
                Spent media concentrates toxic As/F⁻ ions and requires TCLP verification and regulated hazardous disposal. Water requires accredited lab certification before drinking use.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
