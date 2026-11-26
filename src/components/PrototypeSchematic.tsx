import { useState } from 'react';
import { AlertTriangle, CheckCircle2, Droplets, ShieldAlert } from 'lucide-react';
import type { PrototypeCartridgeConfig, PrototypeStageStatus } from '../types/aquapure';

interface PrototypeSchematicProps {
  prototype: PrototypeCartridgeConfig;
  onUpdateStageStatus: (stage: 'stage1' | 'stage2', status: PrototypeStageStatus) => void;
}

const STAGE_STATUSES: PrototypeStageStatus[] = [
  'Bench Validation',
  'Column Breakthrough Testing',
  'Field Pilot Calibration',
];

export function PrototypeSchematic({ prototype, onUpdateStageStatus }: PrototypeSchematicProps) {
  const [selectedStage, setSelectedStage] = useState<'stage1' | 'stage2'>('stage1');

  const activeStage =
    selectedStage === 'stage1'
      ? {
          title: prototype.stage1Name,
          media: prototype.stage1Media,
          target: prototype.stage1Target,
          massKg: prototype.stage1MassKg,
          status: prototype.stage1Status,
          chemistry: 'Inner-sphere surface complexation (Fe–O–As) on ferric oxyhydroxide sites.',
          disposal:
            'Spent Fe-media concentrates Arsenic; stabilize with cement/lime matrix and perform TCLP leachability test before hazardous disposal.',
        }
      : {
          title: prototype.stage2Name,
          media: prototype.stage2Media,
          target: prototype.stage2Target,
          massKg: prototype.stage2MassKg,
          status: prototype.stage2Status,
          chemistry: 'Ligand exchange (Al–OH + F⁻ -> Al–F + OH⁻) in bio-templated alumina pores.',
          disposal:
            'Spent Al-media concentrates Fluoride; regenerate under controlled pH or encapsulate as hazardous solid residue.',
        };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-5 border-b border-slate-100">
        <div>
          <p className="text-xs font-medium text-blue-700 tracking-wide">
            Dual-Stage Prototype Architecture · {prototype.programName}
          </p>
          <h2 className="text-lg font-semibold text-slate-900 mt-1">
            Separately Optimized Indigenous Cartridge Assembly
          </h2>
        </div>
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg self-start">
          <button
            type="button"
            onClick={() => setSelectedStage('stage1')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
              selectedStage === 'stage1'
                ? 'bg-white text-blue-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Stage 1 · Arsenic (Fe)
          </button>
          <button
            type="button"
            onClick={() => setSelectedStage('stage2')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
              selectedStage === 'stage2'
                ? 'bg-white text-sky-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Stage 2 · Fluoride (Al)
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-5 items-stretch">
        {/* Technical SVG Schematic */}
        <div className="lg:col-span-7 bg-slate-50 border border-slate-200 rounded-lg p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-500 pb-2">
            <span>Hydraulic Flow Path · Nominal {prototype.nominalFlowLPerHr} L/h</span>
            <span className="font-mono tabular-nums">Series Configuration</span>
          </div>

          <svg
            viewBox="0 0 680 230"
            className="w-full h-auto"
            role="img"
            aria-label="Dual-stage arsenic and fluoride adsorption cartridge schematic"
          >
            <defs>
              <pattern id="feGranules" width="12" height="12" patternUnits="userSpaceOnUse">
                <circle cx="4" cy="4" r="2.2" fill="#9a3412" opacity="0.65" />
                <circle cx="10" cy="9" r="1.8" fill="#c2410c" opacity="0.55" />
              </pattern>
              <pattern id="alGranules" width="12" height="12" patternUnits="userSpaceOnUse">
                <circle cx="4" cy="5" r="2.1" fill="#0369a1" opacity="0.35" />
                <circle cx="9" cy="9" r="1.9" fill="#0284c7" opacity="0.5" />
              </pattern>
              <marker id="flowArrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M 0 1 L 10 5 L 0 9 z" fill="#2563eb" />
              </marker>
            </defs>

            {/* Raw Intake */}
            <rect x="14" y="88" width="96" height="54" rx="6" fill="#ffffff" stroke="#cbd5e1" strokeWidth="1.5" />
            <text x="62" y="110" textAnchor="middle" fontSize="10" fontWeight="600" fill="#0f172a">
              RAW INTAKE
            </text>
            <text x="62" y="126" textAnchor="middle" fontSize="9" fill="#64748b">
              Pre-Mesh (50 um)
            </text>

            {/* Pipe 1 -> Stage 1 */}
            <line x1="110" y1="115" x2="156" y2="115" stroke="#2563eb" strokeWidth="2.5" markerEnd="url(#flowArrow)" />

            {/* Stage 1 Column */}
            <g onClick={() => setSelectedStage('stage1')} className="cursor-pointer">
              <rect
                x="164"
                y="34"
                width="136"
                height="162"
                rx="10"
                fill="#ffffff"
                stroke={selectedStage === 'stage1' ? '#1d4ed8' : '#94a3b8'}
                strokeWidth={selectedStage === 'stage1' ? '2.5' : '1.5'}
              />
              <rect x="174" y="64" width="116" height="104" rx="4" fill="#fff7ed" stroke="#fed7aa" strokeWidth="1" />
              <rect x="174" y="64" width="116" height="104" rx="4" fill="url(#feGranules)" />
              <text x="232" y="52" textAnchor="middle" fontSize="10.5" fontWeight="700" fill="#1e293b">
                STAGE 1 · Fe-MEDIA
              </text>
              <text x="232" y="184" textAnchor="middle" fontSize="9" fontFamily="monospace" fill="#475569">
                As(III/V) Target
              </text>
            </g>

            {/* Pipe Stage 1 -> Stage 2 with Inter-stage Port */}
            <line x1="300" y1="115" x2="366" y2="115" stroke="#2563eb" strokeWidth="2.5" markerEnd="url(#flowArrow)" />
            <circle cx="333" cy="115" r="5" fill="#ffffff" stroke="#2563eb" strokeWidth="2" />
            <line x1="333" y1="115" x2="333" y2="164" stroke="#94a3b8" strokeWidth="1.2" strokeDasharray="3 2" />
            <text x="333" y="178" textAnchor="middle" fontSize="8.5" fill="#475569">
              Port S1
            </text>

            {/* Stage 2 Column */}
            <g onClick={() => setSelectedStage('stage2')} className="cursor-pointer">
              <rect
                x="374"
                y="34"
                width="136"
                height="162"
                rx="10"
                fill="#ffffff"
                stroke={selectedStage === 'stage2' ? '#0284c7' : '#94a3b8'}
                strokeWidth={selectedStage === 'stage2' ? '2.5' : '1.5'}
              />
              <rect x="384" y="64" width="116" height="104" rx="4" fill="#f0f9ff" stroke="#bae6fd" strokeWidth="1" />
              <rect x="384" y="64" width="116" height="104" rx="4" fill="url(#alGranules)" />
              <text x="442" y="52" textAnchor="middle" fontSize="10.5" fontWeight="700" fill="#1e293b">
                STAGE 2 · Al-MEDIA
              </text>
              <text x="442" y="184" textAnchor="middle" fontSize="9" fontFamily="monospace" fill="#475569">
                F⁻ Ligand Target
              </text>
            </g>

            {/* Pipe Stage 2 -> Effluent Lab Port */}
            <line x1="510" y1="115" x2="554" y2="115" stroke="#2563eb" strokeWidth="2.5" markerEnd="url(#flowArrow)" />

            {/* Treated Effluent Sampling */}
            <rect x="562" y="84" width="104" height="62" rx="6" fill="#eff6ff" stroke="#93c5fd" strokeWidth="1.5" />
            <text x="614" y="108" textAnchor="middle" fontSize="10" fontWeight="700" fill="#1e3a8a">
              LAB ASSAY
            </text>
            <text x="614" y="123" textAnchor="middle" fontSize="8.5" fill="#1d4ed8">
              ICP-MS / ISE Check
            </text>
            <text x="614" y="136" textAnchor="middle" fontSize="8" fill="#475569">
              Before Potable Use
            </text>
          </svg>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 text-xs text-slate-600 border-t border-slate-200">
            <span className="inline-flex items-center gap-1.5">
              <Droplets className="w-3.5 h-3.5 text-blue-600" />
              Click either cartridge column to inspect media chemistry & status
            </span>
            <span className="font-mono tabular-nums text-slate-700">
              Total Bed Mass: {(prototype.stage1MassKg + prototype.stage2MassKg).toFixed(2)} kg
            </span>
          </div>
        </div>

        {/* Active Stage Inspector */}
        <div className="lg:col-span-5 flex flex-col justify-between gap-4">
          <div className="border border-slate-200 rounded-lg p-4 bg-white space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-xs font-medium text-slate-500">Selected Cartridge</p>
                <h3 className="text-base font-semibold text-slate-900 mt-0.5">{activeStage.title}</h3>
              </div>
              <span className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 shrink-0">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {activeStage.status}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100 text-xs">
              <div>
                <p className="text-slate-500">Active Media</p>
                <p className="font-medium text-slate-900 mt-0.5">{activeStage.media}</p>
              </div>
              <div>
                <p className="text-slate-500">Cartridge Load</p>
                <p className="font-mono tabular-nums font-medium text-slate-900 mt-0.5">
                  {activeStage.massKg.toFixed(2)} kg
                </p>
              </div>
              <div className="col-span-2">
                <p className="text-slate-500">Target BIS IS 10500 Threshold</p>
                <p className="font-mono tabular-nums font-medium text-slate-900 mt-0.5">
                  {activeStage.target}
                </p>
              </div>
              <div className="col-span-2">
                <p className="text-slate-500">Adsorption Mechanism</p>
                <p className="text-slate-700 mt-0.5 leading-relaxed">{activeStage.chemistry}</p>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100">
              <label className="block text-xs font-medium text-slate-600 mb-1.5">
                Update Prototype Testing Stage
              </label>
              <select
                value={activeStage.status}
                onChange={(e) =>
                  onUpdateStageStatus(selectedStage, e.target.value as PrototypeStageStatus)
                }
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600"
              >
                {STAGE_STATUSES.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="border border-amber-200 bg-amber-50/70 rounded-lg p-3.5 flex items-start gap-2.5">
            <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-950 leading-relaxed">
              <span className="font-semibold">Spent Media Handling:</span> {activeStage.disposal}
            </div>
          </div>

          <div className="border border-slate-200 bg-slate-50 rounded-lg p-3.5 flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
            <p className="text-xs text-slate-700 leading-relaxed">
              Effluent from both stages must pass laboratory ICP-MS/GF-AAS (As) and ISE/SPADNS (F⁻) verification prior to any potable water clearance.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
