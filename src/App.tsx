import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import {
  Activity,
  BarChart3,
  Bot,
  Calculator,
  Download,
  Droplets,
  FileText,
  FlaskConical,
  Layers,
  LayoutDashboard,
  Menu,
  RotateCcw,
  Upload,
  X,
} from 'lucide-react';
import { AdsorbentMaterialsModule } from './components/AdsorbentMaterialsModule';
import { AiAssistantModule } from './components/AiAssistantModule';
import { DashboardOverview } from './components/DashboardOverview';
import { EfficiencyCalculatorModule } from './components/EfficiencyCalculatorModule';
import { ExperimentComparisonModule } from './components/ExperimentComparisonModule';
import { ReportGenerationModule } from './components/ReportGenerationModule';
import { WaterQualityAnalysisModule } from './components/WaterQualityAnalysisModule';
import { WaterSamplesModule } from './components/WaterSamplesModule';
import { SIMULATED_SEED_DATA } from './data/seedData';
import type {
  ActiveModule,
  AdsorbentMaterial,
  ExperimentRun,
  PrototypeStageStatus,
  WaterQualityReading,
  WaterSample,
  WorkspaceData,
} from './types/aquapure';
import {
  exportExperimentsAsCsv,
  exportWorkspaceAsJson,
  loadWorkspaceData,
  persistWorkspaceData,
} from './utils/storage';

const NAV_ITEMS: Array<{
  id: ActiveModule;
  label: string;
  icon: typeof LayoutDashboard;
}> = [
  { id: 'dashboard', label: 'Overview Dashboard', icon: LayoutDashboard },
  { id: 'samples', label: 'Water Samples', icon: Droplets },
  { id: 'adsorbents', label: 'Adsorbent Materials', icon: Layers },
  { id: 'calculator', label: 'Efficiency Calculator', icon: Calculator },
  { id: 'comparison', label: 'Experiment Comparison', icon: BarChart3 },
  { id: 'water-quality', label: 'Water Quality Analysis', icon: Activity },
  { id: 'ai-assistant', label: 'AI Research Assistant', icon: Bot },
  { id: 'reports', label: 'PDF Reports', icon: FileText },
];

export default function App() {
  const [activeModule, setActiveModule] = useState<ActiveModule>('dashboard');
  const [workspace, setWorkspace] = useState<WorkspaceData>(SIMULATED_SEED_DATA);
  const [isLoaded, setIsLoaded] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [dataNotice, setDataNotice] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    let mounted = true;
    loadWorkspaceData().then((loaded) => {
      if (mounted) {
        setWorkspace(loaded);
        setIsLoaded(true);
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  const updateWorkspace = (updater: (prev: WorkspaceData) => WorkspaceData) => {
    setWorkspace((prev) => {
      const next = updater(prev);
      void persistWorkspaceData(next);
      return next;
    });
  };

  const handleAddSample = (sample: WaterSample) => {
    updateWorkspace((prev) => ({
      ...prev,
      samples: [sample, ...prev.samples],
    }));
  };

  const handleDeleteSample = (id: string) => {
    updateWorkspace((prev) => ({
      ...prev,
      samples: prev.samples.filter((s) => s.id !== id),
    }));
  };

  const handleAddAdsorbent = (material: AdsorbentMaterial) => {
    updateWorkspace((prev) => ({
      ...prev,
      adsorbents: [material, ...prev.adsorbents],
    }));
  };

  const handleDeleteAdsorbent = (id: string) => {
    updateWorkspace((prev) => ({
      ...prev,
      adsorbents: prev.adsorbents.filter((a) => a.id !== id),
    }));
  };

  const handleAddExperiment = (exp: ExperimentRun) => {
    updateWorkspace((prev) => ({
      ...prev,
      experiments: [exp, ...prev.experiments],
    }));
  };

  const handleAddReading = (reading: WaterQualityReading) => {
    updateWorkspace((prev) => ({
      ...prev,
      waterQualityReadings: [reading, ...prev.waterQualityReadings],
    }));
  };

  const handleUpdateStageStatus = (stage: 'stage1' | 'stage2', status: PrototypeStageStatus) => {
    updateWorkspace((prev) => ({
      ...prev,
      prototype: {
        ...prev.prototype,
        stage1Status: stage === 'stage1' ? status : prev.prototype.stage1Status,
        stage2Status: stage === 'stage2' ? status : prev.prototype.stage2Status,
      },
    }));
  };

  const handleImportJson = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result)) as WorkspaceData;
        if (
          !parsed ||
          !Array.isArray(parsed.samples) ||
          !Array.isArray(parsed.adsorbents) ||
          !Array.isArray(parsed.experiments)
        ) {
          setDataNotice('Invalid JSON schema: expected samples, adsorbents, and experiments arrays.');
          return;
        }
        updateWorkspace(() => ({
          ...SIMULATED_SEED_DATA,
          ...parsed,
          waterQualityReadings: Array.isArray(parsed.waterQualityReadings)
            ? parsed.waterQualityReadings
            : [],
          prototype: parsed.prototype ?? SIMULATED_SEED_DATA.prototype,
        }));
        setDataNotice(`Imported dataset from ${file.name}.`);
      } catch {
        setDataNotice('Unable to parse JSON file. Ensure valid UTF-8 JSON export format.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleResetDemo = () => {
    updateWorkspace(() => SIMULATED_SEED_DATA);
    setDataNotice('Workspace restored to simulated PI-RAHI IGNITE 2.0 demonstration dataset.');
  };

  const currentNav = NAV_ITEMS.find((n) => n.id === activeModule);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col lg:flex-row">
      {/* Mobile Drawer Backdrop */}
      {mobileNavOpen && (
        <div
          className="fixed inset-0 bg-slate-900/40 z-30 lg:hidden"
          onClick={() => setMobileNavOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Left Sidebar Navigation */}
      <aside
        className={`fixed lg:sticky top-0 left-0 z-40 h-screen w-64 bg-white border-r border-slate-200 flex flex-col justify-between transition-transform duration-200 ${
          mobileNavOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div>
          <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-blue-700 text-white flex items-center justify-center shrink-0">
                <FlaskConical className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-bold text-slate-900 truncate">AquaPure Indigenous</div>
                <div className="text-[11px] text-slate-500 truncate">IIT Ropar PI-RAHI IGNITE 2.0</div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setMobileNavOpen(false)}
              className="lg:hidden p-1 text-slate-500 hover:text-slate-900"
              aria-label="Close navigation"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <nav className="p-3 space-y-1" aria-label="Primary Modules">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = activeModule === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setActiveModule(item.id);
                    setMobileNavOpen(false);
                  }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
                    isActive
                      ? 'bg-blue-50 text-blue-800'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-blue-700' : 'text-slate-400'}`} />
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Data Portability & Safety Summary */}
        <div className="p-4 border-t border-slate-200 space-y-2.5">
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Data Management
          </p>
          <div className="grid grid-cols-2 gap-1.5">
            <button
              type="button"
              onClick={() => exportWorkspaceAsJson(workspace)}
              className="inline-flex items-center justify-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors"
            >
              <Download className="w-3 h-3" /> JSON
            </button>
            <button
              type="button"
              onClick={() => exportExperimentsAsCsv(workspace)}
              className="inline-flex items-center justify-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors"
            >
              <Download className="w-3 h-3" /> CSV
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center justify-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors"
            >
              <Upload className="w-3 h-3" /> Import
            </button>
            <button
              type="button"
              onClick={handleResetDemo}
              className="inline-flex items-center justify-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors"
            >
              <RotateCcw className="w-3 h-3" /> Reset
            </button>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            onChange={handleImportJson}
            className="hidden"
          />
          <p className="text-[11px] text-slate-400 leading-snug">
            BIS IS 10500:2012 limits: As ≤ 0.01 mg/L · F⁻ ≤ 1.0 mg/L
          </p>
        </div>
      </aside>

      {/* Main Content Workspace */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar */}
        <header className="sticky top-0 z-20 bg-white/95 backdrop-blur-sm border-b border-slate-200 px-4 sm:px-6 py-3.5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileNavOpen(true)}
              className="lg:hidden p-2 text-slate-600 hover:text-slate-900 bg-slate-100 rounded-lg"
              aria-label="Open menu"
            >
              <Menu className="w-4 h-4" />
            </button>
            <div className="min-w-0">
              <div className="text-xs text-slate-500 truncate">
                AquaPure Indigenous / {currentNav?.label}
              </div>
              <h1 className="text-base sm:text-lg font-semibold text-slate-900 truncate">
                {currentNav?.label}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => setActiveModule('reports')}
              className="px-3.5 py-2 text-xs font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              Export PDF Report
            </button>
          </div>
        </header>

        {/* Main Viewport */}
        <main className="flex-1 p-4 sm:p-6 max-w-[1400px] w-full mx-auto space-y-5">
          {dataNotice && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-2.5 flex items-center justify-between gap-3 text-xs text-blue-900">
              <span>{dataNotice}</span>
              <button
                type="button"
                onClick={() => setDataNotice(null)}
                className="text-blue-700 hover:text-blue-900 font-medium"
              >
                Dismiss
              </button>
            </div>
          )}

          {!isLoaded ? (
            <div className="bg-white border border-slate-200 rounded-xl p-8 text-sm text-slate-500">
              Loading AquaPure Indigenous workspace…
            </div>
          ) : (
            <>
              {activeModule === 'dashboard' && (
                <DashboardOverview
                  data={workspace}
                  onNavigate={setActiveModule}
                  onUpdateStageStatus={handleUpdateStageStatus}
                />
              )}
              {activeModule === 'samples' && (
                <WaterSamplesModule
                  samples={workspace.samples}
                  onAddSample={handleAddSample}
                  onDeleteSample={handleDeleteSample}
                />
              )}
              {activeModule === 'adsorbents' && (
                <AdsorbentMaterialsModule
                  adsorbents={workspace.adsorbents}
                  onAddAdsorbent={handleAddAdsorbent}
                  onDeleteAdsorbent={handleDeleteAdsorbent}
                />
              )}
              {activeModule === 'calculator' && (
                <EfficiencyCalculatorModule
                  samples={workspace.samples}
                  adsorbents={workspace.adsorbents}
                  onSaveAsExperiment={(exp) => {
                    handleAddExperiment(exp);
                  }}
                />
              )}
              {activeModule === 'comparison' && (
                <ExperimentComparisonModule
                  experiments={workspace.experiments}
                  samples={workspace.samples}
                  adsorbents={workspace.adsorbents}
                  onAddExperiment={handleAddExperiment}
                />
              )}
              {activeModule === 'water-quality' && (
                <WaterQualityAnalysisModule
                  samples={workspace.samples}
                  readings={workspace.waterQualityReadings}
                  onAddReading={handleAddReading}
                />
              )}
              {activeModule === 'ai-assistant' && <AiAssistantModule data={workspace} />}
              {activeModule === 'reports' && <ReportGenerationModule data={workspace} />}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
