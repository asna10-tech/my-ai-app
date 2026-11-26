import { useState, type FormEvent } from 'react';
import { AlertTriangle, CheckCircle2, Plus, Search, Trash2 } from 'lucide-react';
import type { DataOrigin, WaterSample } from '../types/aquapure';
import { BIS_IS_10500, evaluateSampleAgainstBIS } from '../utils/calculations';

interface WaterSamplesModuleProps {
  samples: WaterSample[];
  onAddSample: (sample: WaterSample) => void;
  onDeleteSample: (id: string) => void;
}

export function WaterSamplesModule({
  samples,
  onAddSample,
  onDeleteSample,
}: WaterSamplesModuleProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [originFilter, setOriginFilter] = useState<'all' | DataOrigin>('all');

  const [sampleCode, setSampleCode] = useState(`GW-LAB-${String(samples.length + 1).padStart(2, '0')}`);
  const [location, setLocation] = useState('');
  const [districtState, setDistrictState] = useState('');
  const [collectionDate, setCollectionDate] = useState(new Date().toISOString().slice(0, 10));
  const [initialPh, setInitialPh] = useState('7.4');
  const [initialTdsMgL, setInitialTdsMgL] = useState('520');
  const [initialTurbidityNtu, setInitialTurbidityNtu] = useState('1.8');
  const [hasLabContaminantAssay, setHasLabContaminantAssay] = useState(true);
  const [initialArsenicMgL, setInitialArsenicMgL] = useState('0.18');
  const [initialFluorideMgL, setInitialFluorideMgL] = useState('2.1');
  const [arsenicMethod, setArsenicMethod] = useState('ICP-MS');
  const [fluorideMethod, setFluorideMethod] = useState('Ion-Selective Electrode (ISE)');
  const [labReferenceId, setLabReferenceId] = useState('');
  const [dataOrigin, setDataOrigin] = useState<DataOrigin>('measured');
  const [observations, setObservations] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    if (!sampleCode.trim() || !location.trim() || !districtState.trim() || !collectionDate) {
      setFormError('Sample ID, Location, District/State, and Collection Date are required.');
      return;
    }

    const ph = Number(initialPh);
    const tds = Number(initialTdsMgL);
    const turb = Number(initialTurbidityNtu);

    if (!Number.isFinite(ph) || ph < 0 || ph > 14) {
      setFormError('Initial pH must be between 0 and 14.');
      return;
    }
    if (!Number.isFinite(tds) || tds < 0) {
      setFormError('Initial TDS must be 0 or a positive number (mg/L).');
      return;
    }
    if (!Number.isFinite(turb) || turb < 0) {
      setFormError('Initial turbidity must be 0 or a positive number (NTU).');
      return;
    }

    let asVal: number | null = null;
    let fVal: number | null = null;

    if (hasLabContaminantAssay) {
      asVal = initialArsenicMgL.trim() === '' ? null : Number(initialArsenicMgL);
      fVal = initialFluorideMgL.trim() === '' ? null : Number(initialFluorideMgL);
      if (asVal !== null && (!Number.isFinite(asVal) || asVal < 0)) {
        setFormError('Initial Arsenic concentration must be >= 0 mg/L.');
        return;
      }
      if (fVal !== null && (!Number.isFinite(fVal) || fVal < 0)) {
        setFormError('Initial Fluoride concentration must be >= 0 mg/L.');
        return;
      }
    }

    const newSample: WaterSample = {
      id: `smp-${Date.now()}`,
      sampleCode: sampleCode.trim(),
      location: location.trim(),
      districtState: districtState.trim(),
      collectionDate,
      initialPh: ph,
      initialTdsMgL: tds,
      initialTurbidityNtu: turb,
      initialArsenicMgL: asVal,
      initialFluorideMgL: fVal,
      dataOrigin,
      arsenicMethod: hasLabContaminantAssay && asVal !== null ? arsenicMethod : 'Pending Lab Assay',
      fluorideMethod: hasLabContaminantAssay && fVal !== null ? fluorideMethod : 'Pending Lab Assay',
      labReferenceId: labReferenceId.trim() || undefined,
      observations: observations.trim() || 'No additional field observations recorded.',
    };

    onAddSample(newSample);
    setFormSuccess(`Registered water sample ${newSample.sampleCode}.`);
    setSampleCode(`GW-LAB-${String(samples.length + 2).padStart(2, '0')}`);
    setLocation('');
    setDistrictState('');
    setLabReferenceId('');
    setObservations('');
  };

  const filteredSamples = samples.filter((s) => {
    const matchesOrigin = originFilter === 'all' || s.dataOrigin === originFilter;
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      !q ||
      s.sampleCode.toLowerCase().includes(q) ||
      s.location.toLowerCase().includes(q) ||
      s.districtState.toLowerCase().includes(q);
    return matchesOrigin && matchesSearch;
  });

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* Sample Registration Form */}
        <form
          onSubmit={handleSubmit}
          className="xl:col-span-5 bg-white border border-slate-200 rounded-xl p-5 space-y-4"
        >
          <div className="pb-3 border-b border-slate-100">
            <h2 className="text-base font-semibold text-slate-900">Register Groundwater Sample</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Enter raw water quality parameters. Arsenic &amp; Fluoride require laboratory assay values—never estimate from TDS or pH.
            </p>
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
              <label className="block text-xs font-medium text-slate-700 mb-1">Sample ID *</label>
              <input
                type="text"
                value={sampleCode}
                onChange={(e) => setSampleCode(e.target.value)}
                placeholder="e.g. GW-RUP-07"
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Collection Date *</label>
              <input
                type="date"
                value={collectionDate}
                onChange={(e) => setCollectionDate(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-700 mb-1">Sampling Site / Source *</label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Handpump #2, Village Nangal"
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-700 mb-1">District &amp; State *</label>
              <input
                type="text"
                value={districtState}
                onChange={(e) => setDistrictState(e.target.value)}
                placeholder="e.g. Rupnagar, Punjab"
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 pt-2 border-t border-slate-100">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Initial pH</label>
              <input
                type="number"
                step="0.01"
                value={initialPh}
                onChange={(e) => setInitialPh(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono tabular-nums border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">TDS (mg/L)</label>
              <input
                type="number"
                step="1"
                value={initialTdsMgL}
                onChange={(e) => setInitialTdsMgL(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono tabular-nums border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Turbidity (NTU)</label>
              <input
                type="number"
                step="0.1"
                value={initialTurbidityNtu}
                onChange={(e) => setInitialTurbidityNtu(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono tabular-nums border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 space-y-3">
            <label className="flex items-center gap-2 text-xs font-medium text-slate-800 cursor-pointer">
              <input
                type="checkbox"
                checked={hasLabContaminantAssay}
                onChange={(e) => setHasLabContaminantAssay(e.target.checked)}
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-600"
              />
              Laboratory-verified Arsenic &amp; Fluoride test results available
            </label>

            {hasLabContaminantAssay ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 border border-slate-200 rounded-lg p-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Initial Arsenic (mg/L)
                  </label>
                  <input
                    type="number"
                    step="0.001"
                    value={initialArsenicMgL}
                    onChange={(e) => setInitialArsenicMgL(e.target.value)}
                    className="w-full px-3 py-1.5 text-sm font-mono tabular-nums bg-white border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Initial Fluoride (mg/L)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={initialFluorideMgL}
                    onChange={(e) => setInitialFluorideMgL(e.target.value)}
                    className="w-full px-3 py-1.5 text-sm font-mono tabular-nums bg-white border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">As Method</label>
                  <select
                    value={arsenicMethod}
                    onChange={(e) => setArsenicMethod(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg"
                  >
                    <option value="ICP-MS">ICP-MS</option>
                    <option value="GF-AAS">GF-AAS</option>
                    <option value="SDDC Spectrophotometry">SDDC Spectrophotometry</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">F⁻ Method</label>
                  <select
                    value={fluorideMethod}
                    onChange={(e) => setFluorideMethod(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg"
                  >
                    <option value="Ion-Selective Electrode (ISE)">Ion-Selective Electrode (ISE)</option>
                    <option value="SPADNS Spectrophotometry">SPADNS Spectrophotometry</option>
                    <option value="Ion Chromatography">Ion Chromatography</option>
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Lab Report / Assay Reference ID
                  </label>
                  <input
                    type="text"
                    value={labReferenceId}
                    onChange={(e) => setLabReferenceId(e.target.value)}
                    placeholder="e.g. IITR-LAB-2026-204"
                    className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg"
                  />
                </div>
              </div>
            ) : (
              <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-lg text-xs text-amber-950">
                Sample will be flagged as <strong>Pending Lab Assay</strong>. Field TDS/pH probes cannot determine Arsenic or Fluoride levels.
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Data Classification</label>
              <select
                value={dataOrigin}
                onChange={(e) => setDataOrigin(e.target.value as DataOrigin)}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg"
              >
                <option value="measured">Measured Lab / Field Data</option>
                <option value="simulated">Simulated Demonstration Data</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">BIS Limits Reference</label>
              <div className="px-3 py-2 text-xs font-mono text-slate-600 bg-slate-50 border border-slate-200 rounded-lg">
                As ≤ {BIS_IS_10500.arsenic.acceptableMgL} · F⁻ ≤ {BIS_IS_10500.fluoride.acceptableMgL} mg/L
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Water-Quality Observations
            </label>
            <textarea
              rows={2}
              value={observations}
              onChange={(e) => setObservations(e.target.value)}
              placeholder="Odor, iron precipitation, co-ions, borewell depth, or seasonal context..."
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>

          <button
            type="submit"
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            Save Water Sample
          </button>
        </form>

        {/* Registered Samples Table */}
        <div className="xl:col-span-7 bg-white border border-slate-200 rounded-xl p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Registered Water Samples ({filteredSamples.length})
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Automatic BIS IS 10500:2012 limit evaluation on raw influent water quality
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search ID or region..."
                  className="pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
              <div className="flex items-center gap-1 p-0.5 bg-slate-100 rounded-lg">
                {(['all', 'measured', 'simulated'] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setOriginFilter(mode)}
                    className={`px-2.5 py-1 text-xs font-medium rounded-md capitalize transition-colors ${
                      originFilter === mode
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 font-medium">
                  <th className="py-2.5 pr-3">Sample</th>
                  <th className="py-2.5 px-2 text-right">pH</th>
                  <th className="py-2.5 px-2 text-right">TDS (mg/L)</th>
                  <th className="py-2.5 px-2 text-right">Turb (NTU)</th>
                  <th className="py-2.5 px-2 text-right">As (mg/L)</th>
                  <th className="py-2.5 px-2 text-right">F⁻ (mg/L)</th>
                  <th className="py-2.5 pl-3">BIS Status</th>
                  <th className="py-2.5 pl-2 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredSamples.map((s) => {
                  const bis = evaluateSampleAgainstBIS(s);
                  return (
                    <tr key={s.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 pr-3">
                        <div className="font-semibold text-slate-900 font-mono">{s.sampleCode}</div>
                        <div className="text-slate-700">{s.location}</div>
                        <div className="text-slate-400">
                          {s.districtState} · {s.collectionDate} ·{' '}
                          <span className={s.dataOrigin === 'measured' ? 'text-blue-700 font-medium' : ''}>
                            {s.dataOrigin === 'simulated' ? 'Simulated' : 'Measured'}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-2 text-right font-mono tabular-nums text-slate-800">
                        {s.initialPh.toFixed(2)}
                      </td>
                      <td className="py-3 px-2 text-right font-mono tabular-nums text-slate-800">
                        {s.initialTdsMgL}
                      </td>
                      <td className="py-3 px-2 text-right font-mono tabular-nums text-slate-800">
                        {s.initialTurbidityNtu.toFixed(1)}
                      </td>
                      <td
                        className={`py-3 px-2 text-right font-mono tabular-nums ${
                          bis.arsenicExceeded ? 'text-rose-700 font-semibold' : 'text-slate-800'
                        }`}
                      >
                        {s.initialArsenicMgL !== null ? s.initialArsenicMgL.toFixed(3) : 'Pending'}
                      </td>
                      <td
                        className={`py-3 px-2 text-right font-mono tabular-nums ${
                          bis.fluorideExceeded ? 'text-rose-700 font-semibold' : 'text-slate-800'
                        }`}
                      >
                        {s.initialFluorideMgL !== null ? s.initialFluorideMgL.toFixed(2) : 'Pending'}
                      </td>
                      <td className="py-3 pl-3">
                        {bis.summaryStatus === 'Exceeds BIS Limit' && (
                          <span className="inline-flex items-center gap-1 text-rose-700 font-medium whitespace-nowrap">
                            <AlertTriangle className="w-3.5 h-3.5" /> Exceeds BIS
                          </span>
                        )}
                        {bis.summaryStatus === 'Lab Assay Pending' && (
                          <span className="inline-flex items-center gap-1 text-amber-700 font-medium whitespace-nowrap">
                            <AlertTriangle className="w-3.5 h-3.5" /> Lab Pending
                          </span>
                        )}
                        {bis.summaryStatus === 'Within BIS Acceptable' && (
                          <span className="inline-flex items-center gap-1 text-emerald-700 font-medium whitespace-nowrap">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Acceptable
                          </span>
                        )}
                      </td>
                      <td className="py-3 pl-2 text-right">
                        <button
                          type="button"
                          onClick={() => onDeleteSample(s.id)}
                          title="Delete sample"
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {filteredSamples.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-500">
                      No water samples match the current search or filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
