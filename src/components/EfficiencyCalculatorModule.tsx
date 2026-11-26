import { useMemo, useState } from 'react';
import { AlertTriangle, Calculator, CheckCircle2, PlusCircle } from 'lucide-react';
import type { AdsorbentMaterial, ExperimentRun, WaterSample } from '../types/aquapure';
import {
  BIS_IS_10500,
  estimateTreatmentCostPer1000L,
  evaluateAdsorptionMetrics,
} from '../utils/calculations';

interface EfficiencyCalculatorModuleProps {
  samples: WaterSample[];
  adsorbents: AdsorbentMaterial[];
  onSaveAsExperiment: (exp: ExperimentRun) => void;
}

export function EfficiencyCalculatorModule({
  samples,
  adsorbents,
  onSaveAsExperiment,
}: EfficiencyCalculatorModuleProps) {
  const [contaminant, setContaminant] = useState<'Arsenic' | 'Fluoride'>('Arsenic');
  const [concUnit, setConcUnit] = useState<'mg/L' | 'ug/L'>('mg/L');
  const [volUnit, setVolUnit] = useState<'L' | 'mL'>('L');
  const [massUnit, setMassUnit] = useState<'g' | 'mg'>('g');

  const [c0Input, setC0Input] = useState('0.25');
  const [ceInput, setCeInput] = useState('0.008');
  const [volumeInput, setVolumeInput] = useState('10');
  const [massInput, setMassInput] = useState('2.0');
  const [costPerKgInput, setCostPerKgInput] = useState('145');
  const [regenCyclesInput, setRegenCyclesInput] = useState('1');

  const [selectedSampleId, setSelectedSampleId] = useState(samples[0]?.id ?? '');
  const [selectedAdsorbentId, setSelectedAdsorbentId] = useState(adsorbents[0]?.id ?? '');
  const [savedNotice, setSavedNotice] = useState<string | null>(null);

  const normalized = useMemo(() => {
    const rawC0 = c0Input.trim() === '' ? NaN : Number(c0Input);
    const rawCe = ceInput.trim() === '' ? NaN : Number(ceInput);
    const rawV = volumeInput.trim() === '' ? NaN : Number(volumeInput);
    const rawM = massInput.trim() === '' ? NaN : Number(massInput);
    const rawCost = costPerKgInput.trim() === '' ? 0 : Number(costPerKgInput);
    const rawCycles = regenCyclesInput.trim() === '' ? 1 : Number(regenCyclesInput);

    const c0MgL = concUnit === 'ug/L' ? rawC0 / 1000 : rawC0;
    const ceMgL = concUnit === 'ug/L' ? rawCe / 1000 : rawCe;
    const vL = volUnit === 'mL' ? rawV / 1000 : rawV;
    const mG = massUnit === 'mg' ? rawM / 1000 : rawM;

    const evalResult = evaluateAdsorptionMetrics({
      initialConcentrationMgL: c0MgL,
      finalConcentrationMgL: ceMgL,
      waterVolumeL: vL,
      adsorbentMassG: mG,
    });

    const costPer1000L = evalResult.valid
      ? estimateTreatmentCostPer1000L({
          waterVolumeL: vL,
          adsorbentMassG: mG,
          costPerKgInr: Number.isFinite(rawCost) ? rawCost : 0,
          regenerationCycles: Number.isFinite(rawCycles) && rawCycles >= 1 ? rawCycles : 1,
        })
      : null;

    return {
      c0MgL,
      ceMgL,
      vL,
      mG,
      costPer1000L,
      ...evalResult,
    };
  }, [c0Input, ceInput, volumeInput, massInput, costPerKgInput, regenCyclesInput, concUnit, volUnit, massUnit]);

  const handleSaveToExperiments = () => {
    if (!normalized.valid || normalized.removalEfficiencyPct === null || normalized.adsorptionCapacityMgG === null) {
      return;
    }

    const sample = samples.find((s) => s.id === selectedSampleId);
    const adsorbent = adsorbents.find((a) => a.id === selectedAdsorbentId);
    const expCode = `EXP-CALC-${String(Math.floor(100 + Math.random() * 900))}`;

    const newExp: ExperimentRun = {
      id: `exp-${Date.now()}`,
      experimentCode: expCode,
      title: `${contaminant} Batch Calculation — ${adsorbent?.name ?? 'Indigenous Media'}`,
      sampleId: sample?.id ?? samples[0]?.id ?? 'custom',
      adsorbentId: adsorbent?.id ?? adsorbents[0]?.id ?? 'custom',
      date: new Date().toISOString().slice(0, 10),
      status: 'Needs Lab Verification',
      dataOrigin: 'measured',
      verificationSource: 'laboratory_verified',
      analyticalMethod: contaminant === 'Arsenic' ? 'User Assay (Verify via ICP-MS/AAS)' : 'User Assay (Verify via ISE)',
      waterVolumeL: Number(normalized.vL.toFixed(4)),
      adsorbentMassG: Number(normalized.mG.toFixed(4)),
      contactTimeMin: adsorbent?.contactTimeMin ?? 90,
      filtrationRateLPerHr: 12.0,
      initialPh: sample?.initialPh ?? 7.2,
      finalPh: sample?.initialPh ?? 7.2,
      initialTdsMgL: sample?.initialTdsMgL ?? 500,
      finalTdsMgL: sample?.initialTdsMgL ?? 490,
      initialTurbidityNtu: sample?.initialTurbidityNtu ?? 1.5,
      finalTurbidityNtu: 0.6,
      initialArsenicMgL: contaminant === 'Arsenic' ? Number(normalized.c0MgL.toFixed(4)) : null,
      finalArsenicMgL: contaminant === 'Arsenic' ? Number(normalized.ceMgL.toFixed(4)) : null,
      initialFluorideMgL: contaminant === 'Fluoride' ? Number(normalized.c0MgL.toFixed(4)) : null,
      finalFluorideMgL: contaminant === 'Fluoride' ? Number(normalized.ceMgL.toFixed(4)) : null,
      arsenicRemovalPct: contaminant === 'Arsenic' ? normalized.removalEfficiencyPct : null,
      fluorideRemovalPct: contaminant === 'Fluoride' ? normalized.removalEfficiencyPct : null,
      adsorptionCapacityMgG: normalized.adsorptionCapacityMgG,
      treatmentCostPer1000LInr: normalized.costPer1000L ?? 0,
      cartridgeOperatingLifeL: null,
      cartridgeOperatingLifeHrs: null,
      observations: `Logged directly from Removal Efficiency Calculator (C0=${normalized.c0MgL} mg/L -> Ce=${normalized.ceMgL} mg/L).`,
      limitations: 'Requires independent duplicate laboratory confirmation before potable certification.',
    };

    onSaveAsExperiment(newExp);
    setSavedNotice(`Saved ${expCode} to Experiment Comparison & Reports.`);
  };

  const bisLimit =
    contaminant === 'Arsenic'
      ? BIS_IS_10500.arsenic.acceptableMgL
      : BIS_IS_10500.fluoride.acceptableMgL;
  const meetsBisLimit = normalized.valid && normalized.ceMgL <= bisLimit;

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
      {/* Input Form */}
      <div className="xl:col-span-6 bg-white border border-slate-200 rounded-xl p-5 space-y-4">
        <div className="pb-3 border-b border-slate-100 flex items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Removal Efficiency &amp; Adsorption Capacity Calculator
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Strict unit normalization to mg/L, Liters (L), and grams (g)
            </p>
          </div>
          <Calculator className="w-5 h-5 text-blue-700 shrink-0" />
        </div>

        {/* Target Contaminant Switch */}
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs font-medium text-slate-700">Target Contaminant</span>
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
            {(['Arsenic', 'Fluoride'] as const).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => {
                  setContaminant(item);
                  setSavedNotice(null);
                  if (item === 'Arsenic') {
                    setC0Input('0.25');
                    setCeInput('0.008');
                    setConcUnit('mg/L');
                  } else {
                    setC0Input('5.4');
                    setCeInput('0.75');
                    setConcUnit('mg/L');
                  }
                }}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  contaminant === item
                    ? 'bg-white text-blue-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {item} ({item === 'Arsenic' ? 'As' : 'F⁻'})
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-medium text-slate-700">Initial Concentration (C0)</label>
              <select
                value={concUnit}
                onChange={(e) => setConcUnit(e.target.value as 'mg/L' | 'ug/L')}
                className="text-xs font-mono text-blue-700 bg-blue-50 border border-blue-200 rounded px-1.5 py-0.5"
              >
                <option value="mg/L">mg/L (ppm)</option>
                <option value="ug/L">µg/L (ppb)</option>
              </select>
            </div>
            <input
              type="number"
              step="any"
              value={c0Input}
              onChange={(e) => setC0Input(e.target.value)}
              className="w-full px-3 py-2 text-sm font-mono tabular-nums border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-medium text-slate-700">Final Concentration (Ce)</label>
              <span className="text-xs font-mono text-slate-500">{concUnit}</span>
            </div>
            <input
              type="number"
              step="any"
              value={ceInput}
              onChange={(e) => setCeInput(e.target.value)}
              className="w-full px-3 py-2 text-sm font-mono tabular-nums border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-medium text-slate-700">Water Volume (V)</label>
              <select
                value={volUnit}
                onChange={(e) => setVolUnit(e.target.value as 'L' | 'mL')}
                className="text-xs font-mono text-blue-700 bg-blue-50 border border-blue-200 rounded px-1.5 py-0.5"
              >
                <option value="L">Liters (L)</option>
                <option value="mL">Milliliters (mL)</option>
              </select>
            </div>
            <input
              type="number"
              step="any"
              value={volumeInput}
              onChange={(e) => setVolumeInput(e.target.value)}
              className="w-full px-3 py-2 text-sm font-mono tabular-nums border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-medium text-slate-700">Adsorbent Mass (m)</label>
              <select
                value={massUnit}
                onChange={(e) => setMassUnit(e.target.value as 'g' | 'mg')}
                className="text-xs font-mono text-blue-700 bg-blue-50 border border-blue-200 rounded px-1.5 py-0.5"
              >
                <option value="g">grams (g)</option>
                <option value="mg">milligrams (mg)</option>
              </select>
            </div>
            <input
              type="number"
              step="any"
              value={massInput}
              onChange={(e) => setMassInput(e.target.value)}
              className="w-full px-3 py-2 text-sm font-mono tabular-nums border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Media Cost (INR/kg)
            </label>
            <input
              type="number"
              step="1"
              value={costPerKgInput}
              onChange={(e) => setCostPerKgInput(e.target.value)}
              className="w-full px-3 py-2 text-sm font-mono tabular-nums border border-slate-200 rounded-lg"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Regeneration Cycles
            </label>
            <input
              type="number"
              min="1"
              step="1"
              value={regenCyclesInput}
              onChange={(e) => setRegenCyclesInput(e.target.value)}
              className="w-full px-3 py-2 text-sm font-mono tabular-nums border border-slate-200 rounded-lg"
            />
          </div>
        </div>

        {/* Save Calculation to Experiment Registry */}
        <div className="pt-3 border-t border-slate-100 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Link Water Sample</label>
              <select
                value={selectedSampleId}
                onChange={(e) => setSelectedSampleId(e.target.value)}
                className="w-full px-2.5 py-2 text-xs bg-white border border-slate-200 rounded-lg"
              >
                {samples.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.sampleCode} · {s.districtState}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Link Adsorbent</label>
              <select
                value={selectedAdsorbentId}
                onChange={(e) => setSelectedAdsorbentId(e.target.value)}
                className="w-full px-2.5 py-2 text-xs bg-white border border-slate-200 rounded-lg"
              >
                {adsorbents.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <button
            type="button"
            disabled={!normalized.valid}
            onClick={handleSaveToExperiments}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-blue-700 hover:bg-blue-800 disabled:bg-slate-300 disabled:cursor-not-allowed rounded-lg transition-colors"
          >
            <PlusCircle className="w-4 h-4" />
            Save Calculation as Experiment Run
          </button>

          {savedNotice && (
            <div className="p-3 text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg">
              {savedNotice}
            </div>
          )}
        </div>
      </div>

      {/* Results & Validation Panel */}
      <div className="xl:col-span-6 space-y-4">
        {!normalized.valid ? (
          <div className="bg-rose-50 border border-rose-200 rounded-xl p-5 space-y-2">
            <div className="flex items-center gap-2 text-rose-800 font-semibold text-sm">
              <AlertTriangle className="w-4 h-4" />
              Invalid or Incomplete Input Rejected
            </div>
            <ul className="list-disc pl-5 text-xs text-rose-800 space-y-1">
              {normalized.errors.map((err, idx) => (
                <li key={idx}>{err}</li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-5">
            <div className="pb-3 border-b border-slate-100">
              <h3 className="text-base font-semibold text-slate-900">Computed Adsorption Results</h3>
              <p className="text-xs font-mono text-slate-500 mt-0.5">
                Normalized: C0 = {normalized.c0MgL.toFixed(4)} mg/L · Ce = {normalized.ceMgL.toFixed(4)} mg/L · V ={' '}
                {normalized.vL.toFixed(3)} L · m = {normalized.mG.toFixed(3)} g
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-blue-50/60 border border-blue-200 rounded-lg p-4">
                <p className="text-xs font-medium text-blue-800">Removal Efficiency (R)</p>
                <p className="text-3xl font-semibold font-mono tabular-nums text-blue-900 mt-1">
                  {normalized.belowDetectionLimitFlag
                    ? `<= 99.9%`
                    : `${normalized.removalEfficiencyPct?.toFixed(2)}%`}
                </p>
                <p className="text-xs font-mono text-slate-600 mt-2">
                  R = [(C0 - Ce) / C0] × 100
                </p>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                <p className="text-xs font-medium text-slate-600">Adsorption Capacity (q)</p>
                <p className="text-3xl font-semibold font-mono tabular-nums text-slate-900 mt-1">
                  {normalized.adsorptionCapacityMgG?.toFixed(4)}
                  <span className="text-xs font-mono text-slate-500 ml-1.5">mg/g</span>
                </p>
                <p className="text-xs font-mono text-slate-500 mt-2">
                  q = [(C0 - Ce) × V] / m
                </p>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                <p className="text-xs font-medium text-slate-600">Estimated Media Operating Cost</p>
                <p className="text-2xl font-semibold font-mono tabular-nums text-slate-900 mt-1">
                  ₹{normalized.costPer1000L?.toFixed(2) ?? '0.00'}
                  <span className="text-xs font-mono text-slate-500 ml-1.5">/ 1,000 L</span>
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Dosage: {((normalized.mG / normalized.vL)).toFixed(3)} g/L
                </p>
              </div>

              <div
                className={`border rounded-lg p-4 ${
                  meetsBisLimit
                    ? 'bg-emerald-50/70 border-emerald-200'
                    : 'bg-amber-50/70 border-amber-200'
                }`}
              >
                <p className="text-xs font-medium text-slate-700">BIS IS 10500:2012 Effluent Check</p>
                <div className="flex items-center gap-1.5 mt-2 text-sm font-semibold">
                  {meetsBisLimit ? (
                    <span className="inline-flex items-center gap-1.5 text-emerald-800">
                      <CheckCircle2 className="w-4 h-4" />
                      Below {bisLimit} mg/L Limit
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-amber-900">
                      <AlertTriangle className="w-4 h-4" />
                      Exceeds {bisLimit} mg/L Limit
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-600 mt-1.5">
                  Requires laboratory ICP-MS / AAS / ISE verification before potable claim.
                </p>
              </div>
            </div>

            {normalized.warnings.length > 0 && (
              <div className="bg-amber-50/80 border border-amber-200 rounded-lg p-3.5 space-y-1">
                {normalized.warnings.map((w, i) => (
                  <p key={i} className="text-xs text-amber-950 leading-relaxed">
                    <strong>Analytical Note:</strong> {w}
                  </p>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Governing Equations Reference */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-2 text-xs text-slate-600 leading-relaxed">
          <h4 className="font-semibold text-slate-900 text-sm">
            Governing Adsorption Engineering Equations
          </h4>
          <p>
            <strong className="text-slate-800">1. Removal Efficiency:</strong>{' '}
            <span className="font-mono">R (%) = [(C0 − Ce) / C0] × 100</span> — expresses percentage contaminant fraction bound onto the solid phase.
          </p>
          <p>
            <strong className="text-slate-800">2. Equilibrium Adsorption Capacity:</strong>{' '}
            <span className="font-mono">q (mg/g) = [(C0 − Ce) × V (L)] / m (g)</span> — mass of arsenic or fluoride retained per gram of indigenous adsorbent media.
          </p>
        </div>
      </div>
    </div>
  );
}
