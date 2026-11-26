import { useMemo, useState, type FormEvent } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from 'recharts';
import { AlertTriangle, CheckCircle2, FileCheck2, Gauge, Plus, ShieldAlert } from 'lucide-react';
import type {
  DataOrigin,
  MeasurementSource,
  WaterQualityReading,
  WaterSample,
} from '../types/aquapure';
import { BIS_IS_10500 } from '../utils/calculations';

interface WaterQualityAnalysisModuleProps {
  samples: WaterSample[];
  readings: WaterQualityReading[];
  onAddReading: (reading: WaterQualityReading) => void;
}

export function WaterQualityAnalysisModule({
  samples,
  readings,
  onAddReading,
}: WaterQualityAnalysisModuleProps) {
  const [entryMode, setEntryMode] = useState<MeasurementSource>('laboratory_verified');
  const [sampleId, setSampleId] = useState(samples[0]?.id ?? '');
  const [stageLabel, setStageLabel] = useState<WaterQualityReading['stageLabel']>(
    'Post Stage-2 (Al-Cartridge)'
  );
  const [instrumentOrMethod, setInstrumentOrMethod] = useState('ICP-MS & Ion-Selective Electrode');
  const [labCertificateId, setLabCertificateId] = useState('');
  const [phInput, setPhInput] = useState('7.35');
  const [tdsInput, setTdsInput] = useState('510');
  const [turbidityInput, setTurbidityInput] = useState('0.55');
  const [arsenicInput, setArsenicInput] = useState('0.008');
  const [fluorideInput, setFluorideInput] = useState('0.72');
  const [dataOrigin, setDataOrigin] = useState<DataOrigin>('measured');
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  const sensorReadings = useMemo(
    () => readings.filter((r) => r.readingType === 'sensor_field'),
    [readings]
  );

  const labReadings = useMemo(
    () => readings.filter((r) => r.readingType === 'laboratory_verified'),
    [readings]
  );

  const sampleChartData = useMemo(
    () =>
      samples
        .filter((s) => s.initialArsenicMgL !== null || s.initialFluorideMgL !== null)
        .map((s) => ({
          code: s.sampleCode,
          arsenic: s.initialArsenicMgL ?? 0,
          fluoride: s.initialFluorideMgL ?? 0,
          tds: s.initialTdsMgL,
        })),
    [samples]
  );

  const handleModeSwitch = (mode: MeasurementSource) => {
    setEntryMode(mode);
    setFormError(null);
    setFormSuccess(null);
    if (mode === 'sensor_field') {
      setInstrumentOrMethod('Multiparameter Field Probe (pH/EC/NTU)');
    } else {
      setInstrumentOrMethod('ICP-MS & Ion-Selective Electrode');
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    const ph = phInput.trim() ? Number(phInput) : undefined;
    const tds = tdsInput.trim() ? Number(tdsInput) : undefined;
    const turb = turbidityInput.trim() ? Number(turbidityInput) : undefined;

    if (ph !== undefined && (!Number.isFinite(ph) || ph < 0 || ph > 14)) {
      setFormError('pH must be between 0 and 14.');
      return;
    }
    if (tds !== undefined && (!Number.isFinite(tds) || tds < 0)) {
      setFormError('TDS must be >= 0 mg/L.');
      return;
    }
    if (turb !== undefined && (!Number.isFinite(turb) || turb < 0)) {
      setFormError('Turbidity must be >= 0 NTU.');
      return;
    }

    let asVal: number | undefined = undefined;
    let fVal: number | undefined = undefined;

    if (entryMode === 'laboratory_verified') {
      if (!labCertificateId.trim()) {
        setFormError('Laboratory Report / Certificate ID is required for lab-verified entries.');
        return;
      }
      asVal = arsenicInput.trim() ? Number(arsenicInput) : undefined;
      fVal = fluorideInput.trim() ? Number(fluorideInput) : undefined;

      if (asVal === undefined && fVal === undefined) {
        setFormError('Enter at least one laboratory-verified Arsenic or Fluoride value.');
        return;
      }
      if (asVal !== undefined && (!Number.isFinite(asVal) || asVal < 0)) {
        setFormError('Arsenic concentration must be >= 0 mg/L.');
        return;
      }
      if (fVal !== undefined && (!Number.isFinite(fVal) || fVal < 0)) {
        setFormError('Fluoride concentration must be >= 0 mg/L.');
        return;
      }
    }

    const newReading: WaterQualityReading = {
      id: `wq-${Date.now()}`,
      sampleId,
      recordedAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
      readingType: entryMode,
      dataOrigin,
      instrumentOrMethod: instrumentOrMethod.trim() || 'Standard Protocol',
      labCertificateId: entryMode === 'laboratory_verified' ? labCertificateId.trim() : undefined,
      ph,
      tdsMgL: tds,
      turbidityNtu: turb,
      arsenicMgL: entryMode === 'laboratory_verified' ? asVal : undefined,
      fluorideMgL: entryMode === 'laboratory_verified' ? fVal : undefined,
      stageLabel,
      notes: notes.trim() || 'Recorded via Water Quality Analysis module.',
    };

    onAddReading(newReading);
    setFormSuccess(
      entryMode === 'laboratory_verified'
        ? `Laboratory-verified result (${labCertificateId}) logged.`
        : 'Field sensor telemetry logged (contaminant assays remain laboratory-dependent).'
    );
    setLabCertificateId('');
    setNotes('');
  };

  return (
    <div className="space-y-6">
      {/* Strict Scientific Rule Callout */}
      <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
        <ShieldAlert className="w-5 h-5 text-blue-700 shrink-0 mt-0.5" />
        <div className="text-xs text-slate-800 space-y-1 leading-relaxed">
          <p className="font-semibold text-slate-900">
            Strict Analytical Separation: Field Sensors vs. Laboratory Contaminant Assays
          </p>
          <p>
            Field electrodes (pH, TDS/EC, Turbidity) CANNOT detect or estimate trace Arsenic (0.01 mg/L) or Fluoride (1.0 mg/L). Never infer As or F⁻ levels from TDS drops, turbidity clarity, or visual photographs. Arsenic and Fluoride fields are strictly locked to <strong>Laboratory-Verified</strong> entries (ICP-MS, GF-AAS, SDDC, ISE, or SPADNS).
          </p>
        </div>
      </div>

      {/* BIS IS 10500 Parameter Reference Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {[
          {
            label: 'pH Range',
            limit: `${BIS_IS_10500.ph.min} – ${BIS_IS_10500.ph.max}`,
            unit: 'pH units',
            source: 'Field Sensor / Lab',
          },
          {
            label: 'TDS Limit',
            limit: `<= ${BIS_IS_10500.tds.acceptableMgL}`,
            unit: `mg/L (Perm. ${BIS_IS_10500.tds.permissibleMgL})`,
            source: 'Field Sensor / Lab',
          },
          {
            label: 'Turbidity Limit',
            limit: `<= ${BIS_IS_10500.turbidity.acceptableNtu}`,
            unit: `NTU (Perm. ${BIS_IS_10500.turbidity.permissibleNtu})`,
            source: 'Field Sensor / Lab',
          },
          {
            label: 'Arsenic (As)',
            limit: `<= ${BIS_IS_10500.arsenic.acceptableMgL}`,
            unit: 'mg/L (No relaxation)',
            source: 'Lab Assay Only',
          },
          {
            label: 'Fluoride (F⁻)',
            limit: `<= ${BIS_IS_10500.fluoride.acceptableMgL}`,
            unit: `mg/L (Perm. ${BIS_IS_10500.fluoride.permissibleMgL})`,
            source: 'Lab Assay Only',
          },
        ].map((item) => (
          <div key={item.label} className="bg-white border border-slate-200 rounded-xl p-4">
            <p className="text-xs text-slate-500">{item.label}</p>
            <p className="text-lg font-semibold font-mono tabular-nums text-slate-900 mt-1">
              {item.limit}
            </p>
            <p className="text-xs font-mono text-slate-500">{item.unit}</p>
            <p className="text-[11px] text-blue-700 font-medium mt-2">{item.source}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* Upload / Enter Water Quality Measurement Form */}
        <form
          onSubmit={handleSubmit}
          className="xl:col-span-5 bg-white border border-slate-200 rounded-xl p-5 space-y-4"
        >
          <div className="pb-3 border-b border-slate-100">
            <h2 className="text-base font-semibold text-slate-900">
              Log Water-Quality Test Result
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Select measurement tier before entering values
            </p>
          </div>

          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
            <button
              type="button"
              onClick={() => handleModeSwitch('laboratory_verified')}
              className={`flex-1 px-3 py-2 text-xs font-medium rounded-md transition-colors ${
                entryMode === 'laboratory_verified'
                  ? 'bg-white text-blue-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Laboratory-Verified Assay
            </button>
            <button
              type="button"
              onClick={() => handleModeSwitch('sensor_field')}
              className={`flex-1 px-3 py-2 text-xs font-medium rounded-md transition-colors ${
                entryMode === 'sensor_field'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Field Sensor Telemetry
            </button>
          </div>

          {formError && (
            <div className="p-3 text-xs text-rose-800 bg-rose-50 border border-rose-200 rounded-lg">
              {formError}
            </div>
          )}
          {formSuccess && (
            <div className="p-3 text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg">
              {formSuccess}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Water Sample</label>
              <select
                value={sampleId}
                onChange={(e) => setSampleId(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg"
              >
                {samples.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.sampleCode} · {s.districtState}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Treatment Stage</label>
              <select
                value={stageLabel}
                onChange={(e) =>
                  setStageLabel(e.target.value as WaterQualityReading['stageLabel'])
                }
                className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg"
              >
                <option value="Raw Influent">Raw Influent</option>
                <option value="Post Stage-1 (Fe-Cartridge)">Post Stage-1 (Fe-Cartridge)</option>
                <option value="Post Stage-2 (Al-Cartridge)">Post Stage-2 (Al-Cartridge)</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-700 mb-1">
                {entryMode === 'laboratory_verified'
                  ? 'Analytical Instrument / Method *'
                  : 'Field Sensor Probe Model *'}
              </label>
              <input
                type="text"
                value={instrumentOrMethod}
                onChange={(e) => setInstrumentOrMethod(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg"
              />
            </div>

            {entryMode === 'laboratory_verified' && (
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Lab Report / Certificate ID *
                </label>
                <input
                  type="text"
                  value={labCertificateId}
                  onChange={(e) => setLabCertificateId(e.target.value)}
                  placeholder="e.g. IITR-WQ-2026-104"
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg"
                />
              </div>
            )}
          </div>

          <div className="grid grid-cols-3 gap-3 pt-2 border-t border-slate-100">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">pH</label>
              <input
                type="number"
                step="0.01"
                value={phInput}
                onChange={(e) => setPhInput(e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono border border-slate-200 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">TDS (mg/L)</label>
              <input
                type="number"
                step="1"
                value={tdsInput}
                onChange={(e) => setTdsInput(e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono border border-slate-200 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Turbidity (NTU)</label>
              <input
                type="number"
                step="0.01"
                value={turbidityInput}
                onChange={(e) => setTurbidityInput(e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono border border-slate-200 rounded-lg"
              />
            </div>
          </div>

          {entryMode === 'laboratory_verified' ? (
            <div className="grid grid-cols-2 gap-3 p-3 bg-blue-50/50 border border-blue-200 rounded-lg">
              <div>
                <label className="block text-xs font-medium text-blue-900 mb-1">
                  Lab Arsenic (mg/L)
                </label>
                <input
                  type="number"
                  step="0.001"
                  value={arsenicInput}
                  onChange={(e) => setArsenicInput(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono bg-white border border-blue-200 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-blue-900 mb-1">
                  Lab Fluoride (mg/L)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={fluorideInput}
                  onChange={(e) => setFluorideInput(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono bg-white border border-blue-200 rounded-lg"
                />
              </div>
            </div>
          ) : (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600">
              Arsenic &amp; Fluoride inputs are disabled in Field Sensor Telemetry mode to prevent unverified sensor extrapolation.
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Data Origin</label>
              <select
                value={dataOrigin}
                onChange={(e) => setDataOrigin(e.target.value as DataOrigin)}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg"
              >
                <option value="measured">Measured Data</option>
                <option value="simulated">Simulated Data</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Notes</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Calibration / QA remarks"
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            Save Water-Quality Record
          </button>
        </form>

        {/* Charts + Separated Tables */}
        <div className="xl:col-span-7 space-y-6">
          {/* Raw Baseline Contaminant Distribution */}
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-slate-900">
              Lab-Assayed Raw Groundwater Contaminant Profile
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Samples with verified baseline Arsenic &amp; Fluoride values vs. BIS IS 10500 threshold (F⁻ 1.0 mg/L dashed)
            </p>
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={sampleChartData} margin={{ top: 8, right: 12, left: -12, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="code" tick={{ fontSize: 11, fill: '#475569' }} />
                  <YAxis yAxisId="left" tick={{ fontSize: 11, fill: '#1d4ed8' }} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: '#0284c7' }} />
                  <Tooltip />
                  <ReferenceLine yAxisId="right" y={1.0} stroke="#dc2626" strokeDasharray="4 4" />
                  <Bar yAxisId="left" dataKey="arsenic" name="Arsenic (mg/L)" fill="#1d4ed8" radius={[4, 4, 0, 0]} />
                  <Bar yAxisId="right" dataKey="fluoride" name="Fluoride (mg/L)" fill="#0284c7" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Panel A: Laboratory-Verified Contaminant Assays */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3 overflow-x-auto">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <FileCheck2 className="w-4 h-4 text-blue-700" />
                <h3 className="text-sm font-semibold text-slate-900">
                  Laboratory-Verified Contaminant Measurements ({labReadings.length})
                </h3>
              </div>
              <span className="text-xs font-mono text-slate-500">ICP-MS / GF-AAS / ISE</span>
            </div>
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 font-medium">
                  <th className="py-2 pr-3">Sample &amp; Cert ID</th>
                  <th className="py-2 px-2 text-right">pH</th>
                  <th className="py-2 px-2 text-right">TDS</th>
                  <th className="py-2 px-2 text-right">As (mg/L)</th>
                  <th className="py-2 px-2 text-right">F⁻ (mg/L)</th>
                  <th className="py-2 pl-3">Compliance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {labReadings.map((r) => {
                  const smp = samples.find((s) => s.id === r.sampleId);
                  const asPass =
                    r.arsenicMgL === undefined || r.arsenicMgL <= BIS_IS_10500.arsenic.acceptableMgL;
                  const fPass =
                    r.fluorideMgL === undefined || r.fluorideMgL <= BIS_IS_10500.fluoride.acceptableMgL;
                  const compliant = asPass && fPass;
                  return (
                    <tr key={r.id} className="hover:bg-slate-50/80">
                      <td className="py-2.5 pr-3">
                        <div className="font-mono font-semibold text-slate-900">
                          {smp?.sampleCode ?? r.sampleId} · {r.stageLabel}
                        </div>
                        <div className="text-slate-500">
                          Cert: {r.labCertificateId} · {r.instrumentOrMethod} ·{' '}
                          {r.dataOrigin === 'simulated' ? 'Simulated' : 'Measured'}
                        </div>
                      </td>
                      <td className="py-2.5 px-2 text-right font-mono tabular-nums">
                        {r.ph?.toFixed(2) ?? '—'}
                      </td>
                      <td className="py-2.5 px-2 text-right font-mono tabular-nums">
                        {r.tdsMgL ?? '—'}
                      </td>
                      <td
                        className={`py-2.5 px-2 text-right font-mono tabular-nums font-semibold ${
                          !asPass ? 'text-rose-700' : 'text-slate-900'
                        }`}
                      >
                        {r.arsenicMgL !== undefined ? r.arsenicMgL.toFixed(4) : '—'}
                      </td>
                      <td
                        className={`py-2.5 px-2 text-right font-mono tabular-nums font-semibold ${
                          !fPass ? 'text-rose-700' : 'text-slate-900'
                        }`}
                      >
                        {r.fluorideMgL !== undefined ? r.fluorideMgL.toFixed(2) : '—'}
                      </td>
                      <td className="py-2.5 pl-3">
                        {compliant ? (
                          <span className="inline-flex items-center gap-1 text-emerald-700 font-medium whitespace-nowrap">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Meets BIS
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-rose-700 font-medium whitespace-nowrap">
                            <AlertTriangle className="w-3.5 h-3.5" /> Exceeds BIS
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Panel B: Field Sensor Telemetry */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3 overflow-x-auto">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Gauge className="w-4 h-4 text-slate-700" />
                <h3 className="text-sm font-semibold text-slate-900">
                  Field Sensor Telemetry ({sensorReadings.length})
                </h3>
              </div>
              <span className="text-xs font-mono text-amber-800">As/F⁻ Not Estimated</span>
            </div>
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 font-medium">
                  <th className="py-2 pr-3">Sample &amp; Probe</th>
                  <th className="py-2 px-2 text-right">pH</th>
                  <th className="py-2 px-2 text-right">TDS (mg/L)</th>
                  <th className="py-2 px-2 text-right">Turbidity (NTU)</th>
                  <th className="py-2 pl-3">Verification Flag</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sensorReadings.map((r) => {
                  const smp = samples.find((s) => s.id === r.sampleId);
                  return (
                    <tr key={r.id} className="hover:bg-slate-50/80">
                      <td className="py-2.5 pr-3">
                        <div className="font-mono font-semibold text-slate-900">
                          {smp?.sampleCode ?? r.sampleId} · {r.stageLabel}
                        </div>
                        <div className="text-slate-500">
                          {r.instrumentOrMethod} · {r.recordedAt}
                        </div>
                      </td>
                      <td className="py-2.5 px-2 text-right font-mono tabular-nums">
                        {r.ph?.toFixed(2) ?? '—'}
                      </td>
                      <td className="py-2.5 px-2 text-right font-mono tabular-nums">
                        {r.tdsMgL ?? '—'}
                      </td>
                      <td className="py-2.5 px-2 text-right font-mono tabular-nums">
                        {r.turbidityNtu?.toFixed(2) ?? '—'}
                      </td>
                      <td className="py-2.5 pl-3 text-amber-800 font-medium">
                        Requires Lab As/F⁻ Assay
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
