import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { GoogleGenAI, ThinkingLevel } from '@google/genai';
import { createServer as createViteServer } from 'vite';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'aquapure-db.json');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    throw new Error('GEMINI_API_KEY is not configured in the server environment.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

const SYSTEM_INSTRUCTION = `You are the AquaPure Indigenous AI Research Assistant for the IIT Ropar PI-RAHI IGNITE 2.0 innovation project (low-cost indigenous dual-cartridge adsorption system using separately optimized iron-based media for arsenic and aluminium-based media for fluoride).

STRICT SCIENTIFIC & SAFETY RULES (NON-NEGOTIABLE):
1. NEVER fabricate experimental findings, laboratory reports, sample IDs, concentrations, or removal percentages. Only cite numbers present in the user's provided dataset or explicitly note when a figure is hypothetical/textbook.
2. NEVER claim 100% contaminant removal. Even if effluent is below analytical detection, describe it as "< Method Detection Limit (MDL)" and specify required confirmation via ICP-MS, GF-AAS, or Ion-Selective Electrode (ISE).
3. NEVER claim water is safe for drinking without appropriate laboratory-verified testing against BIS IS 10500:2012 (Arsenic acceptable & permissible limit = 0.01 mg/L [no relaxation]; Fluoride acceptable = 1.0 mg/L, permissible = 1.5 mg/L; pH = 6.5–8.5; TDS acceptable = 500 mg/L, permissible = 2000 mg/L; Turbidity acceptable = 1 NTU, permissible = 5 NTU).
4. NEVER estimate arsenic or fluoride concentrations from pH, TDS, EC, turbidity, or photographs. Explicitly distinguish field sensor telemetry from laboratory-verified contaminant assays, and never confuse TDS reduction with arsenic or fluoride removal.
5. Always distinguish records tagged "simulated" (demonstration data) from "measured" (user-entered laboratory/experimental data).
6. When discussing spent media, replacement, or regeneration, remind researchers that spent adsorbent media concentrates arsenic and/or fluoride and must undergo TCLP leachability testing, stabilization/encapsulation, and safe hazardous waste disposal—never open landfill dumping.
7. Be concise, technical, structured with clear headings/bullet points, and directly helpful to environmental engineers and water-treatment researchers.`;

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '5mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', service: 'AquaPure Indigenous API' });
  });

  app.get('/api/workspace', (_req, res) => {
    try {
      ensureDataDir();
      if (!fs.existsSync(DB_FILE)) {
        res.status(200).json({ exists: false, data: null });
        return;
      }
      const raw = fs.readFileSync(DB_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      res.status(200).json({ exists: true, data: parsed });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to read workspace storage.';
      res.status(500).json({ error: message });
    }
  });

  app.put('/api/workspace', (req, res) => {
    try {
      const payload = req.body;
      if (!payload || typeof payload !== 'object' || !Array.isArray(payload.samples)) {
        res.status(400).json({ error: 'Invalid workspace payload structure.' });
        return;
      }
      ensureDataDir();
      fs.writeFileSync(DB_FILE, JSON.stringify(payload, null, 2), 'utf-8');
      res.status(200).json({ saved: true, lastUpdated: payload.lastUpdated || new Date().toISOString() });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to persist workspace data.';
      res.status(500).json({ error: message });
    }
  });

  app.post('/api/ai/assist', async (req, res) => {
    try {
      const { prompt, contextData, conversationHistory } = req.body ?? {};
      if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
        res.status(400).json({ error: 'Prompt text is required.' });
        return;
      }

      const ai = getGeminiClient();

      const serializedContext = contextData ? JSON.stringify(contextData, null, 2) : 'No workspace context attached.';
      const historyBlock = Array.isArray(conversationHistory) && conversationHistory.length > 0
        ? conversationHistory
            .slice(-6)
            .map((m: { role?: string; content?: string }) => `${m.role === 'user' ? 'Researcher' : 'Assistant'}: ${m.content ?? ''}`)
            .join('\n\n')
        : '';

      const fullPrompt = [
        '### CURRENT WORKSPACE DATASET (Use ONLY these values when referencing recorded samples/experiments; respect dataOrigin="simulated" vs "measured" and verificationSource):',
        serializedContext,
        historyBlock ? `### RECENT CONVERSATION:\n${historyBlock}` : '',
        `### RESEARCHER REQUEST:\n${prompt.trim()}`,
      ]
        .filter(Boolean)
        .join('\n\n');

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: fullPrompt,
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          thinkingConfig: { thinkingLevel: ThinkingLevel.MEDIUM },
        },
      });

      const answer = response.text;
      if (!answer) {
        res.status(502).json({ error: 'Gemini returned an empty response.' });
        return;
      }

      res.status(200).json({ answer });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unexpected error calling Gemini API.';
      const lower = message.toLowerCase();
      if (lower.includes('api_key') || lower.includes('permission_denied') || lower.includes('not configured')) {
        res.status(401).json({
          error: 'Gemini API key is missing or invalid. Please configure GEMINI_API_KEY in Settings > Secrets.',
        });
        return;
      }
      if (lower.includes('resource_exhausted') || lower.includes('429')) {
        res.status(429).json({
          error: 'Gemini API rate limit or quota exceeded. Please try again shortly or check quota in Settings > Secrets.',
        });
        return;
      }
      res.status(500).json({ error: message });
    }
  });

  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('/{*splat}', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const port = Number(process.env.PORT) || 3000;
  app.listen(port, '0.0.0.0', () => {
    console.log(`AquaPure Indigenous server running on http://0.0.0.0:${port}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
