export type DataOrigin = 'simulated' | 'measured';

export type MeasurementSource = 'sensor_field' | 'laboratory_verified';

export type TargetContaminant = 'Arsenic' | 'Fluoride' | 'Dual (As + F)';

export type MaterialCategory =
  | 'Iron-Based Adsorbent'
  | 'Aluminium-Based Adsorbent'
  | 'Hybrid Bio-Mineral Adsorbent';

export type ExperimentStatus = 'Completed' | 'In Progress' | 'Needs Lab Verification';

export type PrototypeStageStatus =
  | 'Bench Validation'
  | 'Column Breakthrough Testing'
  | 'Field Pilot Calibration';

export interface WaterSample {
  id: string;
  sampleCode: string;
  location: string;
  districtState: string;
  collectionDate: string;
  initialPh: number;
  initialTdsMgL: number;
  initialTurbidityNtu: number;
  initialArsenicMgL: number | null; // null if only sensor-checked and lab assay pending
  initialFluorideMgL: number | null; // null if only sensor-checked and lab assay pending
  dataOrigin: DataOrigin;
  arsenicMethod?: string; // e.g. 'ICP-MS', 'GF-AAS', 'Pending Lab Assay'
  fluorideMethod?: string; // e.g. 'Ion-Selective Electrode (ISE)', 'SPADNS Spectrophotometry'
  labReferenceId?: string;
  observations: string;
}

export interface AdsorbentMaterial {
  id: string;
  name: string;
  category: MaterialCategory;
  sourceOfMaterial: string;
  targetContaminant: TargetContaminant;
  adsorbentQuantityG: number;
  contactTimeMin: number;
  experimentalPh: number;
  initialConcentrationMgL: number;
  finalConcentrationMgL: number;
  waterVolumeL: number;
  adsorptionCapacityMgG: number;
  costPerKgInr: number;
  dataOrigin: DataOrigin;
  notes?: string;
}

export interface ExperimentRun {
  id: string;
  experimentCode: string;
  title: string;
  sampleId: string;
  adsorbentId: string;
  secondaryAdsorbentId?: string; // For dual-cartridge sequential runs
  date: string;
  status: ExperimentStatus;
  dataOrigin: DataOrigin;
  verificationSource: MeasurementSource;
  analyticalMethod: string;
  waterVolumeL: number;
  adsorbentMassG: number;
  contactTimeMin: number;
  filtrationRateLPerHr: number;
  initialPh: number;
  finalPh: number;
  initialTdsMgL: number;
  finalTdsMgL: number;
  initialTurbidityNtu: number;
  finalTurbidityNtu: number;
  initialArsenicMgL: number | null;
  finalArsenicMgL: number | null;
  initialFluorideMgL: number | null;
  finalFluorideMgL: number | null;
  arsenicRemovalPct: number | null;
  fluorideRemovalPct: number | null;
  adsorptionCapacityMgG: number | null;
  treatmentCostPer1000LInr: number;
  cartridgeOperatingLifeL: number | null; // null when not yet measured
  cartridgeOperatingLifeHrs: number | null;
  observations: string;
  limitations: string;
}

export interface WaterQualityReading {
  id: string;
  sampleId: string;
  recordedAt: string;
  readingType: MeasurementSource;
  dataOrigin: DataOrigin;
  instrumentOrMethod: string;
  labCertificateId?: string;
  ph?: number;
  tdsMgL?: number;
  turbidityNtu?: number;
  arsenicMgL?: number; // Strictly allowed ONLY when readingType === 'laboratory_verified'
  fluorideMgL?: number; // Strictly allowed ONLY when readingType === 'laboratory_verified'
  stageLabel: 'Raw Influent' | 'Post Stage-1 (Fe-Cartridge)' | 'Post Stage-2 (Al-Cartridge)';
  notes: string;
}

export interface PrototypeCartridgeConfig {
  stage1Name: string;
  stage1Media: string;
  stage1Target: string;
  stage1MassKg: number;
  stage1Status: PrototypeStageStatus;
  stage2Name: string;
  stage2Media: string;
  stage2Target: string;
  stage2MassKg: number;
  stage2Status: PrototypeStageStatus;
  nominalFlowLPerHr: number;
  projectTitle: string;
  programName: string;
}

export interface WorkspaceData {
  samples: WaterSample[];
  adsorbents: AdsorbentMaterial[];
  experiments: ExperimentRun[];
  waterQualityReadings: WaterQualityReading[];
  prototype: PrototypeCartridgeConfig;
  lastUpdated: string;
}

export type ActiveModule =
  | 'dashboard'
  | 'samples'
  | 'adsorbents'
  | 'calculator'
  | 'comparison'
  | 'water-quality'
  | 'ai-assistant'
  | 'reports';
