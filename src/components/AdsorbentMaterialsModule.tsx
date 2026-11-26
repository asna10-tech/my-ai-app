import { useState, type FormEvent } from 'react';
import { Plus, ShieldAlert, Trash2 } from 'lucide-react';
import type {
  AdsorbentMaterial,
  DataOrigin,
  MaterialCategory,
  TargetContaminant,
} from '../types/aquapure';
import { evaluateAdsorptionMetrics } from '../utils/calculations';

interface AdsorbentMaterialsModuleProps {
  adsorbents: AdsorbentMaterial[];
  onAddAdsorbent: (material: AdsorbentMaterial) => void;
  onDeleteAdsorbent: (id: string) => void;
}

export function AdsorbentMaterialsModule({
  adsorbents,
  onAddAdsorbent,
  onDeleteAdsorbent,
}: AdsorbentMaterialsModuleProps) {
  const [targetFilter, setTargetFilter] = useState<'All' | 'Arsenic' | 'Fluoride'>('All');
  const [showAddForm, setShowAddForm] = useState(false);

  const [name, setName] = useState('');
  const [category, setCategory] = useState<MaterialCategory>('Iron-Based Adsorbent');
  const [sourceOfMaterial, setSourceOfMaterial] = useState('');
  const [targetContaminant, setTargetContaminant] = useState<TargetContaminant>('Arsenic');
  const [adsorbentQuantityG, setAdsorbentQuantityG] = useState('2.0');
  const [waterVolumeL, setWaterVolumeL] = useState('10.0');
  const [contactTimeMin, setContactTimeMin] = useState('90');
  const [experimentalPh, setExperimentalPh] = useState('7.2');
  const [initialConcentrationMgL, setInitialConcentrationMgL] = useState('0.30');
  const [finalConcentrationMgL, setFinalConcentrationMgL] = useState('0.01');
  const [costPerKgInr, setCostPerKgInr] = useState('130');
  const [dataOrigin, setDataOrigin] = useState<DataOrigin>('measured');
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const filtered = adsorbents.filter((a) => {
    if (targetFilter === 'All') return true;
    return a.targetContaminant === targetFilter || a.targetContaminant === 'Dual (As + F)';
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!name.trim() || !sourceOfMaterial.trim()) {
      setFormError('Material name and source of material are required.');
      return;
    }

    const m = Number(adsorbentQuantityG);
    const v = Number(waterVolumeL);
    const t = Number(contactTimeMin);
    const ph = Number(experimentalPh);
    const c0 = Number(initialConcentrationMgL);
    const ce = Number(finalConcentrationMgL);
    const cost = Number(costPerKgInr);

    if (!Number.isFinite(t) || t <= 0) {
      setFormError('Contact time must be > 0 minutes.');
      return;
    }
    if (!Number.isFinite(ph) || ph < 0 || ph > 14) {
      setFormError('Experimental pH must be between 0 and 14.');
      return;
    }
    if (!Number.isFinite(cost) || cost < 0) {
      setFormError('Cost of material must be >= 0 INR/kg.');
      return;
    }

    const evalResult = evaluateAdsorptionMetrics({
      initialConcentrationMgL: c0,
      finalConcentrationMgL: ce,
      waterVolumeL: v,
      adsorbentMassG: m,
    });

    if (!evalResult.valid || evalResult.adsorptionCapacityMgG === null) {
      setFormError(evalResult.errors.join(' '));
      return;
    }

    const newMaterial: AdsorbentMaterial = {
      id: `ads-${Date.now()}`,
      name: name.trim(),
      category,
      sourceOfMaterial: sourceOfMaterial.trim(),
      targetContaminant,
      adsorbentQuantityG: m,
      waterVolumeL: v,
      contactTimeMin: t,
      experimentalPh: ph,
      initialConcentrationMgL: c0,
      finalConcentrationMgL: ce,
      adsorptionCapacityMgG: evalResult.adsorptionCapacityMgG,
      costPerKgInr: cost,
      dataOrigin,
      notes: notes.trim() || undefined,
    };

    onAddAdsorbent(newMaterial);
    setName('');
    setSourceOfMaterial('');
    setNotes('');
    setShowAddForm(false);
  };

  return (
    <div className="space-y-6">
      {/* Header & Filter Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-slate-900">
            Indigenous Adsorbent Material Research ({filtered.length})
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Separately optimized iron-based media for Arsenic and aluminium-based media for Fluoride
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
            {(['All', 'Arsenic', 'Fluoride'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setTargetFilter(tab)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                  targetFilter === tab
                    ? 'bg-white text-blue-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab === 'All' ? 'All Media' : `${tab} (${tab === 'Arsenic' ? 'Fe-Based' : 'Al-Based'})`}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setShowAddForm((prev) => !prev)}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors whitespace-nowrap shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            {showAddForm ? 'Close Form' : 'Add New Material'}
          </button>
        </div>
      </div>

      {/* Add Material Form */}
      {showAddForm && (
        <form
          onSubmit={handleSubmit}
          className="bg-white border border-blue-200 rounded-xl p-5 space-y-4"
        >
          <div className="pb-3 border-b border-slate-100">
            <h3 className="text-sm font-semibold text-slate-900">
              Add New Indigenous Adsorbent Candidate
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Adsorption capacity q (mg/g) is automatically computed and verified via q = [(C0 - Ce) × V] / m.
            </p>
          </div>

          {formError && (
            <div className="p-3 text-xs text-rose-800 bg-rose-50 border border-rose-200 rounded-lg">
              {formError}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-700 mb-1">Material Name *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Banana-Peel Biochar Fe3O4"
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as MaterialCategory)}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg"
              >
                <option value="Iron-Based Adsorbent">Iron-Based Adsorbent</option>
                <option value="Aluminium-Based Adsorbent">Aluminium-Based Adsorbent</option>
                <option value="Hybrid Bio-Mineral Adsorbent">Hybrid Bio-Mineral Adsorbent</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Target Contaminant</label>
              <select
                value={targetContaminant}
                onChange={(e) => setTargetContaminant(e.target.value as TargetContaminant)}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg"
              >
                <option value="Arsenic">Arsenic (As)</option>
                <option value="Fluoride">Fluoride (F⁻)</option>
                <option value="Dual (As + F)">Dual (As + F)</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-700 mb-1">Source of Material *</label>
              <input
                type="text"
                value={sourceOfMaterial}
                onChange={(e) => setSourceOfMaterial(e.target.value)}
                placeholder="e.g. Local agro-residue + ferric chloride precipitation"
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Adsorbent Mass (g)</label>
              <input
                type="number"
                step="0.01"
                value={adsorbentQuantityG}
                onChange={(e) => setAdsorbentQuantityG(e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono border border-slate-200 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Water Volume V (L)</label>
              <input
                type="number"
                step="0.1"
                value={waterVolumeL}
                onChange={(e) => setWaterVolumeL(e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono border border-slate-200 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Contact Time (min)</label>
              <input
                type="number"
                step="1"
                value={contactTimeMin}
                onChange={(e) => setContactTimeMin(e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono border border-slate-200 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Experimental pH</label>
              <input
                type="number"
                step="0.1"
                value={experimentalPh}
                onChange={(e) => setExperimentalPh(e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono border border-slate-200 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Initial C0 (mg/L)</label>
              <input
                type="number"
                step="0.001"
                value={initialConcentrationMgL}
                onChange={(e) => setInitialConcentrationMgL(e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono border border-slate-200 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Final Ce (mg/L)</label>
              <input
                type="number"
                step="0.001"
                value={finalConcentrationMgL}
                onChange={(e) => setFinalConcentrationMgL(e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono border border-slate-200 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Material Cost (INR/kg)</label>
              <input
                type="number"
                step="1"
                value={costPerKgInr}
                onChange={(e) => setCostPerKgInr(e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono border border-slate-200 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Data Origin</label>
              <select
                value={dataOrigin}
                onChange={(e) => setDataOrigin(e.target.value as DataOrigin)}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg"
              >
                <option value="measured">Measured Lab Data</option>
                <option value="simulated">Simulated Data</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-700 mb-1">Synthesis &amp; Kinetic Notes</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Surface modification notes, particle mesh size, or regeneration remarks"
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-lg"
            >
              Save Adsorbent Material
            </button>
          </div>
        </form>
      )}

      {/* Material Comparison Table */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-slate-200 text-slate-500 font-medium">
              <th className="py-2.5 pr-4">Material &amp; Source</th>
              <th className="py-2.5 px-2">Target</th>
              <th className="py-2.5 px-2 text-right">Mass (g)</th>
              <th className="py-2.5 px-2 text-right">Time (min)</th>
              <th className="py-2.5 px-2 text-right">pH</th>
              <th className="py-2.5 px-2 text-right">C0 (mg/L)</th>
              <th className="py-2.5 px-2 text-right">Ce (mg/L)</th>
              <th className="py-2.5 px-2 text-right">Removal (%)</th>
              <th className="py-2.5 px-2 text-right">Capacity q (mg/g)</th>
              <th className="py-2.5 px-2 text-right">Cost (INR/kg)</th>
              <th className="py-2.5 pl-2 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map((m) => {
              const evalMetric = evaluateAdsorptionMetrics({
                initialConcentrationMgL: m.initialConcentrationMgL,
                finalConcentrationMgL: m.finalConcentrationMgL,
                waterVolumeL: m.waterVolumeL,
                adsorbentMassG: m.adsorbentQuantityG,
              });
              return (
                <tr key={m.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3 pr-4 max-w-xs">
                    <div className="font-semibold text-slate-900">{m.name}</div>
                    <div className="text-slate-600 mt-0.5">{m.category}</div>
                    <div className="text-slate-400 mt-0.5">
                      {m.sourceOfMaterial} ·{' '}
                      <span className={m.dataOrigin === 'measured' ? 'text-blue-700 font-medium' : ''}>
                        {m.dataOrigin === 'simulated' ? 'Simulated' : 'Measured'}
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-2 font-medium text-slate-800 whitespace-nowrap">
                    {m.targetContaminant}
                  </td>
                  <td className="py-3 px-2 text-right font-mono tabular-nums">
                    {m.adsorbentQuantityG.toFixed(2)}
                  </td>
                  <td className="py-3 px-2 text-right font-mono tabular-nums">{m.contactTimeMin}</td>
                  <td className="py-3 px-2 text-right font-mono tabular-nums">
                    {m.experimentalPh.toFixed(1)}
                  </td>
                  <td className="py-3 px-2 text-right font-mono tabular-nums">
                    {m.initialConcentrationMgL.toFixed(3)}
                  </td>
                  <td className="py-3 px-2 text-right font-mono tabular-nums">
                    {m.finalConcentrationMgL.toFixed(3)}
                  </td>
                  <td className="py-3 px-2 text-right font-mono tabular-nums font-semibold text-blue-700">
                    {evalMetric.removalEfficiencyPct !== null
                      ? `${evalMetric.removalEfficiencyPct.toFixed(2)}%`
                      : '—'}
                  </td>
                  <td className="py-3 px-2 text-right font-mono tabular-nums font-semibold text-slate-900">
                    {m.adsorptionCapacityMgG.toFixed(3)}
                  </td>
                  <td className="py-3 px-2 text-right font-mono tabular-nums">
                    ₹{m.costPerKgInr}
                  </td>
                  <td className="py-3 pl-2 text-right">
                    <button
                      type="button"
                      onClick={() => onDeleteAdsorbent(m.id)}
                      title="Delete adsorbent"
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Hazardous Spent Media Disposal & Safety Box */}
      <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
        <ShieldAlert className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
        <div className="text-xs text-amber-950 space-y-1 leading-relaxed">
          <p className="font-semibold">
            Spent Adsorbent Media Safety, Regeneration &amp; Hazardous Disposal Protocol
          </p>
          <p>
            Adsorption concentrates Arsenic and Fluoride onto the solid media rather than destroying them. Exhausted iron-based and aluminium-based cartridges must NEVER be discarded in open soil, agricultural fields, or municipal waste. Perform Toxicity Characteristic Leaching Procedure (TCLP) screening, stabilize spent media in cement/clay-brick matrices or alkaline-regeneration recovery loops, and transfer hazardous concentrates to authorized TSDF (Treatment, Storage, and Disposal Facilities).
          </p>
        </div>
      </div>
    </div>
  );
}
