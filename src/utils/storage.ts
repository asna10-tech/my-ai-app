import { SIMULATED_SEED_DATA } from '../data/seedData';
import type { WorkspaceData } from '../types/aquapure';

const LOCAL_STORAGE_KEY = 'aquapure_indigenous_workspace_v1';

export async function loadWorkspaceData(): Promise<WorkspaceData> {
  // Try server persistence first, fallback to browser localStorage, then seed data
  try {
    const res = await fetch('/api/workspace');
    if (res.ok) {
      const payload = (await res.json()) as { exists: boolean; data: WorkspaceData | null };
      if (payload.exists && payload.data && Array.isArray(payload.data.samples)) {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(payload.data));
        return payload.data;
      }
    }
  } catch {
    // Server storage fallback handled below
  }

  try {
    const cached = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached) as WorkspaceData;
      if (parsed && Array.isArray(parsed.samples)) {
        return parsed;
      }
    }
  } catch {
    // Corrupt localStorage ignored
  }

  return SIMULATED_SEED_DATA;
}

export async function persistWorkspaceData(data: WorkspaceData): Promise<void> {
  const updated: WorkspaceData = {
    ...data,
    lastUpdated: new Date().toISOString(),
  };

  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // Ignore storage quota warnings
  }

  try {
    await fetch('/api/workspace', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated),
    });
  } catch {
    // Offline/dev fallback already cached in localStorage
  }
}

export function exportWorkspaceAsJson(data: WorkspaceData): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `aquapure-indigenous-dataset-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function exportExperimentsAsCsv(data: WorkspaceData): void {
  const headers = [
    'Experiment Code',
    'Title',
    'Date',
    'Status',
    'Data Origin',
    'Verification Source',
    'Sample ID',
    'Adsorbent ID',
    'Initial As (mg/L)',
    'Final As (mg/L)',
    'As Removal (%)',
    'Initial F (mg/L)',
    'Final F (mg/L)',
    'F Removal (%)',
    'q (mg/g)',
    'Flow Rate (L/h)',
    'Cost (INR/1000L)',
    'Cartridge Life (L)',
  ];

  const escapeCsv = (val: string | number | null | undefined): string => {
    if (val === null || val === undefined) return '';
    const str = String(val);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const rows = data.experiments.map((e) =>
    [
      e.experimentCode,
      e.title,
      e.date,
      e.status,
      e.dataOrigin,
      e.verificationSource,
      e.sampleId,
      e.adsorbentId,
      e.initialArsenicMgL,
      e.finalArsenicMgL,
      e.arsenicRemovalPct,
      e.initialFluorideMgL,
      e.finalFluorideMgL,
      e.fluorideRemovalPct,
      e.adsorptionCapacityMgG,
      e.filtrationRateLPerHr,
      e.treatmentCostPer1000LInr,
      e.cartridgeOperatingLifeL,
    ]
      .map(escapeCsv)
      .join(',')
  );

  const csv = [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `aquapure-experiments-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
