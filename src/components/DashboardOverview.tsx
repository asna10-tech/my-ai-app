import { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { AlertCircle, ArrowUpRight, FlaskConical, ShieldCheck } from 'lucide-react';
import type {
  ActiveModule,
  PrototypeStageStatus,
  WorkspaceData,
} from '../types/aquapure';
import { BIS_IS_10500 } from '../utils/calculations';
import { PrototypeSchematic } from './PrototypeSchematic';

interface DashboardOverviewProps {
  data: WorkspaceData;
  onNavigate: (module: ActiveModule) => void;
  onUpdateStageStatus: (stage: 'stage1' | 'stage2', status: PrototypeStageStatus) => void;
}

export function DashboardOverview({
  data,
  onNavigate,
  onUpdateStageStatus,
}: DashboardOverviewProps) {
  const stats = useMemo(() => {
    const totalSamples = data.samples.length;
    const totalExperiments = data.experiments.length;
    const completedExperiments = data.experiments.filter((e) => e.status === 'Completed').length;

    const arsenicRuns = data.experiments.filter(
      (e) =>
        e.arsenicRemovalPct !== null &&
        e.initialArsenicMgL !== null &&
        e.initialArsenicMgL > BIS_IS_10500.arsenic.acceptableMgL
    );
    const avgArsenicRemoval =
      arsenicRuns.length > 0
        ? arsenicRuns.reduce((acc, r) => acc + (r.arsenicRemovalPct ?? 0), 0) / arsenicRuns.length
        : null;

    const fluorideRuns = data.experiments.filter(
      (e) =>
        e.fluorideRemovalPct !== null &&
        e.initialFluorideMgL !== null &&
        e.initialFluorideMgL > BIS_IS_10500.fluoride.acceptableMgL
    );
    const avgFluorideRemoval =
      fluorideRuns.length > 0
        ? fluorideRuns.reduce((acc, r) => acc + (r.fluorideRemovalPct ?? 0), 0) / fluorideRuns.length
        : null;

    // Best performing adsorbent by adsorption capacity (q) or removal on target contaminant
    const bestArsenicAdsorbent = [...data.adsorbents]
      .filter((a) => a.targetContaminant === 'Arsenic' || a.targetContaminant === 'Dual (As + F)')
      .sort((a, b) => b.adsorptionCapacityMgG - a.adsorptionCapacityMgG)[0];

    const bestFluorideAdsorbent = [...data.adsorbents]
      .filter((a) => a.targetContaminant === 'Fluoride' || a.targetContaminant === 'Dual (As + F)')
      .sort((a, b) => b.adsorptionCapacityMgG - a.adsorptionCapacityMgG)[0];

    const simulatedCount = data.experiments.filter((e) => e.dataOrigin === 'simulated').length;
    const measuredCount = data.experiments.filter((e) => e.dataOrigin === 'measured').length;
    const pendingVerificationCount = data.experiments.filter(
      (e) => e.verificationSource !== 'laboratory_verified' || e.status === 'Needs Lab Verification'
    ).length;

    return {
      totalSamples,
      totalExperiments,
      completedExperiments,
      avgArsenicRemoval,
      avgFluorideRemoval,
      bestArsenicAdsorbent,
      bestFluorideAdsorbent,
      simulatedCount,
      measuredCount,
      pendingVerificationCount,
    };
  }, [data]);

  const experimentChartData = useMemo(
    () =>
      data.experiments
        .filter((e) => e.arsenicRemovalPct !== null || e.fluorideRemovalPct !== null)
        .map((e) => ({
          code: e.experimentCode,
          arsenicPct: e.arsenicRemovalPct ?? 0,
          fluoridePct: e.fluorideRemovalPct ?? 0,
          capacity: e.adsorptionCapacityMgG ?? 0,
        })),
    [data.experiments]
  );

  const adsorbentChartData = useMemo(
    () =>
      data.adsorbents.map((a) => ({
        name: a.name.length > 20 ? `${a.name.slice(0, 18)}…` : a.name,
        fullName: a.name,
        capacity: a.adsorptionCapacityMgG,
        cost: a.costPerKgInr,
        target: a.targetContaminant,
      })),
    [data.adsorbents]
  );

  return (
    <div className="space-y-6">
      {/* Dataset Provenance & Scientific Safety Banner */}
      <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-blue-700 shrink-0 mt-0.5" />
          <div className="text-xs sm:text-sm text-slate-700 leading-relaxed">
            <span className="font-semibold text-slate-900">
              Dataset Transparency ({stats.simulatedCount} simulated demo · {stats.measuredCount} lab-measured runs):
            </span>{' '}
            Pre-loaded baseline trials are clearly marked as simulated demonstration data for IIT Ropar PI-RAHI IGNITE 2.0. Never certify water potable without ICP-MS/GF-AAS (As) and ISE/SPADNS (F⁻) laboratory confirmation.
          </div>
        </div>
        {stats.pendingVerificationCount > 0 && (
          <button
            type="button"
            onClick={() => onNavigate('water-quality')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-amber-900 bg-amber-100 hover:bg-amber-200 rounded-lg transition-colors whitespace-nowrap shrink-0"
          >
            <AlertCircle className="w-3.5 h-3.5" />
            {stats.pendingVerificationCount} Pending Lab Check
          </button>
        )}
      </div>

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <p className="text-xs font-medium text-slate-500">Total Water Samples Tested</p>
          <div className="flex items-baseline justify-between mt-2">
            <div>
              <span className="text-3xl font-semibold font-mono tabular-nums text-slate-900">
                {stats.totalSamples}
              </span>
              <span className="text-xs font-mono text-slate-500 ml-1.5">samples</span>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('samples')}
              className="text-xs font-medium text-blue-700 hover:text-blue-800 inline-flex items-center gap-1 whitespace-nowrap"
            >
              Manage <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <p className="text-xs text-slate-500 mt-2">
            Covers Punjab, Assam, Bihar, Telangana, Rajasthan & West Bengal matrices
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <p className="text-xs font-medium text-slate-500">Experiments & Completed Trials</p>
          <div className="flex items-baseline justify-between mt-2">
            <div>
              <span className="text-3xl font-semibold font-mono tabular-nums text-slate-900">
                {stats.completedExperiments}
              </span>
              <span className="text-xs font-mono text-slate-500 ml-1.5">
                / {stats.totalExperiments} total runs
              </span>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('comparison')}
              className="text-xs font-medium text-blue-700 hover:text-blue-800 inline-flex items-center gap-1 whitespace-nowrap"
            >
              Compare <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <p className="text-xs text-slate-500 mt-2">
            {stats.pendingVerificationCount} run flagged for laboratory contaminant verification
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <p className="text-xs font-medium text-slate-500">Average Arsenic Removal Efficiency</p>
          <div className="flex items-baseline justify-between mt-2">
            <div>
              <span className="text-3xl font-semibold font-mono tabular-nums text-blue-700">
                {stats.avgArsenicRemoval !== null ? stats.avgArsenicRemoval.toFixed(1) : '—'}
              </span>
              <span className="text-xs font-mono text-slate-500 ml-1.5">% (As &gt; 0.01 mg/L runs)</span>
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-2">
            BIS IS 10500 limit: <span className="font-mono">0.01 mg/L</span> (no relaxation)
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <p className="text-xs font-medium text-slate-500">Average Fluoride Removal Efficiency</p>
          <div className="flex items-baseline justify-between mt-2">
            <div>
              <span className="text-3xl font-semibold font-mono tabular-nums text-sky-700">
                {stats.avgFluorideRemoval !== null ? stats.avgFluorideRemoval.toFixed(1) : '—'}
              </span>
              <span className="text-xs font-mono text-slate-500 ml-1.5">% (F⁻ &gt; 1.0 mg/L runs)</span>
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-2">
            BIS IS 10500 acceptable: <span className="font-mono">1.0 mg/L</span> · permissible:{' '}
            <span className="font-mono">1.5 mg/L</span>
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <p className="text-xs font-medium text-slate-500">Top-Capacity Adsorbents (Fe &amp; Al)</p>
          <div className="mt-2 space-y-1.5">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-slate-900 truncate pr-2">
                {stats.bestArsenicAdsorbent?.name ?? 'N/A'}
              </span>
              <span className="font-mono tabular-nums text-xs text-blue-700 shrink-0">
                {stats.bestArsenicAdsorbent?.adsorptionCapacityMgG.toFixed(2)} mg/g (As)
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-slate-900 truncate pr-2">
                {stats.bestFluorideAdsorbent?.name ?? 'N/A'}
              </span>
              <span className="font-mono tabular-nums text-xs text-sky-700 shrink-0">
                {stats.bestFluorideAdsorbent?.adsorptionCapacityMgG.toFixed(2)} mg/g (F⁻)
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('adsorbents')}
            className="text-xs font-medium text-blue-700 hover:text-blue-800 inline-flex items-center gap-1 mt-2"
          >
            Inspect Adsorbent Matrix <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <p className="text-xs font-medium text-slate-500">Prototype Testing Status</p>
          <div className="mt-2 space-y-1.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-600">Stage 1 (As):</span>
              <span className="font-medium text-slate-900">{data.prototype.stage1Status}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-600">Stage 2 (F⁻):</span>
              <span className="font-medium text-slate-900">{data.prototype.stage2Status}</span>
            </div>
            <div className="flex items-center justify-between pt-1 border-t border-slate-100">
              <span className="text-slate-600">Nominal Flow Rate:</span>
              <span className="font-mono tabular-nums font-medium text-blue-700">
                {data.prototype.nominalFlowLPerHr} L/h
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Dual-Stage Prototype Schematic */}
      <PrototypeSchematic prototype={data.prototype} onUpdateStageStatus={onUpdateStageStatus} />

      {/* Interactive Performance Charts */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-semibold text-slate-900">
                Experiment Removal Efficiency (%)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Arsenic vs. Fluoride removal across completed prototype &amp; bench trials
              </p>
            </div>
            <FlaskConical className="w-4 h-4 text-blue-700 shrink-0" />
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={experimentChartData} margin={{ top: 8, right: 12, left: -12, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="code" tick={{ fontSize: 11, fill: '#475569' }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#475569' }} unit="%" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    borderColor: '#cbd5e1',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <ReferenceLine y={90} stroke="#94a3b8" strokeDasharray="4 4" />
                <Bar dataKey="arsenicPct" name="Arsenic Removal (%)" fill="#1d4ed8" radius={[4, 4, 0, 0]} />
                <Bar dataKey="fluoridePct" name="Fluoride Removal (%)" fill="#0284c7" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-semibold text-slate-900">
                Indigenous Adsorbent Capacity (mg/g) vs. Media Cost (INR/kg)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Compare uptake capacity (q) against raw synthesis cost across iron &amp; aluminium media
              </p>
            </div>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={adsorbentChartData} margin={{ top: 8, right: 12, left: -12, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 10, fill: '#475569' }}
                  interval={0}
                  angle={-15}
                  textAnchor="end"
                />
                <YAxis yAxisId="left" tick={{ fontSize: 11, fill: '#1d4ed8' }} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: '#475569' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    borderColor: '#cbd5e1',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Bar
                  yAxisId="left"
                  dataKey="capacity"
                  name="Capacity q (mg/g)"
                  fill="#2563eb"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  yAxisId="right"
                  dataKey="cost"
                  name="Media Cost (INR/kg)"
                  fill="#94a3b8"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
