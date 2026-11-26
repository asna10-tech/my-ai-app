import { useMemo, useState, type FormEvent } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { AlertTriangle, CheckCircle2, Plus } from 'lucide-react';
import type {
  AdsorbentMaterial,
  DataOrigin,
  ExperimentRun,
  ExperimentStatus,
  MeasurementSource,
  WaterSample,
} from '../types/aquapure';
import {
  estimateTreatmentCostPer1000L,
  evaluateAdsorptionMetrics,
  evaluateExperimentVerification,
} from '../utils/calculations';

interface ExperimentComparisonModuleProps {
  experiments: ExperimentRun[];
  samples: WaterSample[];
  adsorbents: AdsorbentMaterial[];
  onAddExperiment: (exp: ExperimentRun) => void;
}

export function ExperimentComparisonModule({
  experiments,
  samples,
  adsorbents,
  onAddExperiment,
}: ExperimentComparisonModuleProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>(() =>
    experiments.slice(0, 4).map((e) => e.id)
  );
  const [showAddForm, setShowAddForm] = useState(false);

  // Add Experiment Form State
  const [title, setTitle] = useState('');
  const [sampleId, setSampleId] = useState(samples[0]?.id ?? '');
  const [adsorbentId, setAdsorbentId] = useState(adsorbents[0]?.id ?? '');
  const [waterVolumeL, setWaterVolumeL] = useState('10');
  const [adsorbentMassG, setAdsorbentMassG] = useState('2.0');
  const [filtrationRateLPerHr, setFiltrationRateLPerHr] = useState('12.0');
  const [initialAs, setInitialAs] = useState('0.24');
  const [finalAs, setFinalAs] = useState('0.008');
  const [initialF, setInitialF] = useState('1.8');
  const [finalF, setFinalF] = useState('0.65');
  const [cartridgeLifeL, setCartridgeLifeL] = useState('');
  const [verificationSource, setVerificationSource] = useState<MeasurementSource>('laboratory_verified');
  const [analyticalMethod, setAnalyticalMethod] = useState('ICP-MS + ISE');
  const [dataOrigin, setDataOrigin] = useState<DataOrigin>('measured');
  const [observations, setObservations] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const toggleSelection = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const comparedRuns = useMemo(
    () => experiments.filter((e) => selectedIds.includes(e.id)),
    [experiments, selectedIds]
  );

  const chartData = useMemo(
    () =>
      comparedRuns.map((e) => {
        const ads = adsorbents.find((a) => a.id === e.adsorbentId);
        return {
          code: e.experimentCode,
          adsorbent: ads?.name ?? e.adsorbentId,
          arsenicRemoval: e.arsenicRemovalPct ?? 0,
          fluorideRemoval: e.fluorideRemovalPct ?? 0,
          flowRate: e.filtrationRateLPerHr,
          costPer1000L: e.treatmentCostPer1000LInr,
          capacity: e.adsorptionCapacityMgG ?? 0,
        };
      }),
    [comparedRuns, adsorbents]
  );

  const handleAddExperiment = (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!title.trim()) {
      setFormError('Experiment title is required.');
      return;
    }

    const v = Number(waterVolumeL);
    const m = Number(adsorbentMassG);
    const flow = Number(filtrationRateLPerHr);
    if (!Number.isFinite(v) || v <= 0 || !Number.isFinite(m) || m <= 0 || !Number.isFinite(flow) || flow <= 0) {
      setFormError('Volume, mass, and filtration rate must be positive numbers.');
      return;
    }

    const c0As = initialAs.trim() ? Number(initialAs) : null;
    const ceAs = finalAs.trim() ? Number(finalAs) : null;
    const c0F = initialF.trim() ? Number(initialF) : null;
    const ceF = finalF.trim() ? Number(finalF) : null;

    let asRemoval: number | null = null;
    let fRemoval: number | null = null;
    let qCapacity: number | null = null;

    if (c0As !== null && ceAs !== null) {
      const asEval = evaluateAdsorptionMetrics({
        initialConcentrationMgL: c0As,
        finalConcentrationMgL: ceAs,
        waterVolumeL: v,
        adsorbentMassG: m,
      });
      if (!asEval.valid) {
        setFormError(`Arsenic values invalid: ${asEval.errors.join(' ')}`);
        return;
      }
      asRemoval = asEval.removalEfficiencyPct;
      qCapacity = asEval.adsorptionCapacityMgG;
    }

    if (c0F !== null && ceF !== null) {
      const fEval = evaluateAdsorptionMetrics({
        initialConcentrationMgL: c0F,
        finalConcentrationMgL: ceF,
        waterVolumeL: v,
        adsorbentMassG: m,
      });
      if (!fEval.valid) {
        setFormError(`Fluoride values invalid: ${fEval.errors.join(' ')}`);
        return;
      }
      fRemoval = fEval.removalEfficiencyPct;
      if (qCapacity === null || (fEval.adsorptionCapacityMgG ?? 0) > qCapacity) {
        qCapacity = fEval.adsorptionCapacityMgG;
      }
    }

    const ads = adsorbents.find((a) => a.id === adsorbentId);
    const sample = samples.find((s) => s.id === sampleId);
    const cost =
      estimateTreatmentCostPer1000L({
        waterVolumeL: v,
        adsorbentMassG: m,
        costPerKgInr: ads?.costPerKgInr ?? 150,
      }) ?? 0;

    const lifeL = cartridgeLifeL.trim() ? Number(cartridgeLifeL) : null;
    const status: ExperimentStatus =
      verificationSource === 'laboratory_verified' ? 'Completed' : 'Needs Lab Verification';

    const newExp: ExperimentRun = {
      id: `exp-${Date.now()}`,
      experimentCode: `EXP-26-${String(experiments.length + 1).padStart(2, '0')}`,
      title: title.trim(),
      sampleId,
      adsorbentId,
      date: new Date().toISOString().slice(0, 10),
      status,
      dataOrigin,
      verificationSource,
      analyticalMethod,
      waterVolumeL: v,
      adsorbentMassG: m,
      contactTimeMin: ads?.contactTimeMin ?? 90,
      filtrationRateLPerHr: flow,
      initialPh: sample?.initialPh ?? 7.3,
      finalPh: sample?.initialPh ?? 7.3,
      initialTdsMgL: sample?.initialTdsMgL ?? 550,
      finalTdsMgL: sample?.initialTdsMgL ?? 530,
      initialTurbidityNtu: sample?.initialTurbidityNtu ?? 1.5,
      finalTurbidityNtu: 0.5,
      initialArsenicMgL: c0As,
      finalArsenicMgL: ceAs,
      initialFluorideMgL: c0F,
      finalFluorideMgL: ceF,
      arsenicRemovalPct: asRemoval,
      fluorideRemovalPct: fRemoval,
      adsorptionCapacityMgG: qCapacity,
      treatmentCostPer1000LInr: cost,
      cartridgeOperatingLifeL: lifeL,
      cartridgeOperatingLifeHrs: lifeL !== null ? Number((lifeL / flow).toFixed(1)) : null,
      observations: observations.trim() || 'Experiment recorded via AquaPure workbench.',
      limitations:
        verificationSource === 'sensor_field'
          ? 'Laboratory contaminant assay pending.'
          : 'Single batch/column run; replicate testing recommended.',
    };

    onAddExperiment(newExp);
    setSelectedIds((prev) => [...prev, newExp.id]);
    setTitle('');
    setObservations('');
    setShowAddForm(false);
  };

  return (
    <div className="space-y-6">
      {/* Header & Experiment Selector */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Multi-Experiment Performance Comparison ({comparedRuns.length} selected)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Select experiments below to compare removal %, filtration rate, treatment cost, capacity, and cartridge operating life
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowAddForm((prev) => !prev)}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors whitespace-nowrap shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            {showAddForm ? 'Close Form' : 'Log Experiment Run'}
          </button>
        </div>

        {/* Selectable Experiment Checkboxes */}
        <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100">
          {experiments.map((exp) => {
            const active = selectedIds.includes(exp.id);
            return (
              <button
                key={exp.id}
                type="button"
                onClick={() => toggleSelection(exp.id)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                  active
                    ? 'bg-blue-50 border-blue-300 text-blue-800'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-900'
                }`}
              >
                <span className="font-mono">{exp.experimentCode}</span> · {exp.status}
              </button>
            );
          })}
        </div>
      </div>

      {/* Add Experiment Form */}
      {showAddForm && (
        <form
          onSubmit={handleAddExperiment}
          className="bg-white border border-blue-200 rounded-xl p-5 space-y-4"
        >
          <h3 className="text-sm font-semibold text-slate-900">Log New Filtration / Adsorption Experiment</h3>
          {formError && (
            <div className="p-3 text-xs text-rose-800 bg-rose-50 border border-rose-200 rounded-lg">
              {formError}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-700 mb-1">Experiment Title *</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Ropar Column Breakthrough Run #3"
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg"
              />
            </div>
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
              <label className="block text-xs font-medium text-slate-700 mb-1">Adsorbent Material</label>
              <select
                value={adsorbentId}
                onChange={(e) => setAdsorbentId(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg"
              >
                {adsorbents.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Volume Treated (L)</label>
              <input
                type="number"
                step="0.1"
                value={waterVolumeL}
                onChange={(e) => setWaterVolumeL(e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono border border-slate-200 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Media Mass (g)</label>
              <input
                type="number"
                step="0.1"
                value={adsorbentMassG}
                onChange={(e) => setAdsorbentMassG(e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono border border-slate-200 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Filtration Rate (L/h)</label>
              <input
                type="number"
                step="0.1"
                value={filtrationRateLPerHr}
                onChange={(e) => setFiltrationRateLPerHr(e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono border border-slate-200 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Cartridge Life (L, optional)
              </label>
              <input
                type="number"
                step="1"
                value={cartridgeLifeL}
                onChange={(e) => setCartridgeLifeL(e.target.value)}
                placeholder="Leave blank if unmeasured"
                className="w-full px-3 py-2 text-xs font-mono border border-slate-200 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Initial As (mg/L)</label>
              <input
                type="number"
                step="0.001"
                value={initialAs}
                onChange={(e) => setInitialAs(e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono border border-slate-200 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Final As (mg/L)</label>
              <input
                type="number"
                step="0.001"
                value={finalAs}
                onChange={(e) => setFinalAs(e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono border border-slate-200 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Initial F⁻ (mg/L)</label>
              <input
                type="number"
                step="0.01"
                value={initialF}
                onChange={(e) => setInitialF(e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono border border-slate-200 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Final F⁻ (mg/L)</label>
              <input
                type="number"
                step="0.01"
                value={finalF}
                onChange={(e) => setFinalF(e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono border border-slate-200 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Verification Source</label>
              <select
                value={verificationSource}
                onChange={(e) => setVerificationSource(e.target.value as MeasurementSource)}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg"
              >
                <option value="laboratory_verified">Laboratory-Verified Assay</option>
                <option value="sensor_field">Field Sensor Only (Pending Lab)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Analytical Method</label>
              <input
                type="text"
                value={analyticalMethod}
                onChange={(e) => setAnalyticalMethod(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Data Classification</label>
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
              <label className="block text-xs font-medium text-slate-700 mb-1">Observations</label>
              <input
                type="text"
                value={observations}
                onChange={(e) => setObservations(e.target.value)}
                placeholder="Key findings or hydraulic notes"
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-lg"
            >
              Save Experiment
            </button>
          </div>
        </form>
      )}

      {/* Comparative Bar Charts */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-slate-900 mb-1">
            Contaminant Removal Comparison (%)
          </h3>
          <p className="text-xs text-slate-500 mb-4">
            Arsenic vs. Fluoride removal across selected runs
          </p>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 8, right: 12, left: -12, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="code" tick={{ fontSize: 11, fill: '#475569' }} />
                <YAxis domain={[0, 100]} unit="%" tick={{ fontSize: 11, fill: '#475569' }} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Bar dataKey="arsenicRemoval" name="Arsenic Removal (%)" fill="#1d4ed8" radius={[4, 4, 0, 0]} />
                <Bar dataKey="fluorideRemoval" name="Fluoride Removal (%)" fill="#0284c7" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-slate-900 mb-1">
            Treatment Cost (INR/1000L) &amp; Filtration Rate (L/h)
          </h3>
          <p className="text-xs text-slate-500 mb-4">
            Operational cost-efficiency vs. hydraulic throughput
          </p>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 8, right: 12, left: -12, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="code" tick={{ fontSize: 11, fill: '#475569' }} />
                <YAxis yAxisId="left" tick={{ fontSize: 11, fill: '#1e293b' }} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: '#0284c7' }} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Bar yAxisId="left" dataKey="costPer1000L" name="Cost (INR/1000 L)" fill="#334155" radius={[4, 4, 0, 0]} />
                <Bar yAxisId="right" dataKey="flowRate" name="Flow Rate (L/h)" fill="#38bdf8" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Comparison Matrix Table */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-slate-200 text-slate-500 font-medium">
              <th className="py-2.5 pr-4">Experiment &amp; Adsorbent</th>
              <th className="py-2.5 px-2 text-right">As Removal</th>
              <th className="py-2.5 px-2 text-right">F⁻ Removal</th>
              <th className="py-2.5 px-2 text-right">Capacity q</th>
              <th className="py-2.5 px-2 text-right">Flow Rate</th>
              <th className="py-2.5 px-2 text-right">Cost / 1000 L</th>
              <th className="py-2.5 px-2 text-right">Cartridge Life</th>
              <th className="py-2.5 pl-3">Lab Verification</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {comparedRuns.map((e) => {
              const ads = adsorbents.find((a) => a.id === e.adsorbentId);
              const ver = evaluateExperimentVerification(e);
              return (
                <tr key={e.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3 pr-4">
                    <div className="font-mono font-semibold text-slate-900">{e.experimentCode}</div>
                    <div className="text-slate-700">{ads?.name ?? e.adsorbentId}</div>
                    <div className="text-slate-400">
                      {e.date} · {e.dataOrigin === 'simulated' ? 'Simulated' : 'Measured'}
                    </div>
                  </td>
                  <td className="py-3 px-2 text-right font-mono tabular-nums font-semibold text-blue-700">
                    {e.arsenicRemovalPct !== null ? `${e.arsenicRemovalPct.toFixed(2)}%` : 'Pending'}
                  </td>
                  <td className="py-3 px-2 text-right font-mono tabular-nums font-semibold text-sky-700">
                    {e.fluorideRemovalPct !== null ? `${e.fluorideRemovalPct.toFixed(2)}%` : 'Pending'}
                  </td>
                  <td className="py-3 px-2 text-right font-mono tabular-nums text-slate-900">
                    {e.adsorptionCapacityMgG !== null ? `${e.adsorptionCapacityMgG.toFixed(3)} mg/g` : '—'}
                  </td>
                  <td className="py-3 px-2 text-right font-mono tabular-nums text-slate-800">
                    {e.filtrationRateLPerHr.toFixed(1)} L/h
                  </td>
                  <td className="py-3 px-2 text-right font-mono tabular-nums text-slate-800">
                    ₹{e.treatmentCostPer1000LInr.toFixed(2)}
                  </td>
                  <td className="py-3 px-2 text-right font-mono tabular-nums text-slate-600">
                    {e.cartridgeOperatingLifeL !== null
                      ? `${e.cartridgeOperatingLifeL} L (${e.cartridgeOperatingLifeHrs ?? '—'} h)`
                      : 'Not measured'}
                  </td>
                  <td className="py-3 pl-3">
                    {ver.requiresAdditionalVerification ? (
                      <span className="inline-flex items-center gap-1 text-amber-800 font-medium">
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                        <span className="max-w-[200px] truncate" title={ver.flagReason ?? ''}>
                          {ver.flagReason}
                        </span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-emerald-700 font-medium whitespace-nowrap">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Verified ({e.analyticalMethod})
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
            {comparedRuns.length === 0 && (
              <tr>
                <td colSpan={8} className="py-8 text-center text-slate-500">
                  Select at least one experiment above to compare metrics.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
