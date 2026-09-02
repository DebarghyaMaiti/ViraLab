import { GoogleGenAI } from '@google/genai';
import { runDeterministicSimulation } from '../engine/rk45';
import { runStochasticSimulation } from '../engine/stochastic';
import { estimateParametersFromData } from '../engine/estimation';
import { runDataQualityAudit, normalizeDatasetRows } from '../data/dataQuality';
import { SimulationConfig } from '../types/simulation';

// Shared server-side Gemini client
let aiClient: GoogleGenAI | null = null;
function getAiClient(): GoogleGenAI {
  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

export interface ApiHandlerRequest {
  method: string;
  path: string;
  body: any;
  query: Record<string, string>;
}

export interface ApiHandlerResponse {
  status: number;
  body: any;
}

export async function handleApiRoute(req: ApiHandlerRequest): Promise<ApiHandlerResponse> {
  const { path, body, method } = req;

  // 1. Health Check
  if (path === '/api/health' && method === 'GET') {
    return {
      status: 200,
      body: {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        engine: 'ViraLab-SEIRD-Engine-v2.4',
        runtime: 'Node.js/TypeScript',
      },
    };
  }

  // 2. Available Models List
  if (path === '/api/models' && method === 'GET') {
    return {
      status: 200,
      body: {
        models: [
          {
            id: 'seird-multistrain',
            name: 'Multi-Strain SEIRD Model',
            description: 'Compartmental deterministic differential system with shared susceptible pool and strain-specific E, I, R, D states.',
            equations: [
              'dS/dt = - Σ βᵢ S Iᵢ / N',
              'dEᵢ/dt = βᵢ S Iᵢ / N - σEᵢ',
              'dIᵢ/dt = σEᵢ - (γᵢ + μᵢ)Iᵢ',
              'dRᵢ/dt = γᵢIᵢ',
              'dDᵢ/dt = μᵢIᵢ',
            ],
            capabilities: ['Variant Competition', 'Interventions', 'Vaccination', 'Hospitalization'],
          },
          {
            id: 'seird-stochastic',
            name: 'Stochastic SEIRD Ensemble',
            description: 'Ensemble trajectory generator with demographic diffusion, computing median, 50% IQR, and 95% confidence intervals.',
          },
        ],
      },
    };
  }

  // 3. Run Simulation
  if (path === '/api/simulation/run' && method === 'POST') {
    try {
      const config: SimulationConfig = body;
      if (!config) {
        return { status: 400, body: { error: 'Missing simulation configuration body.' } };
      }

      const results =
        config.mode === 'stochastic'
          ? runStochasticSimulation(config)
          : runDeterministicSimulation(config);

      return { status: 200, body: results };
    } catch (err: any) {
      return {
        status: 400,
        body: {
          error: err.message || 'Something went wrong while processing the simulation.',
          errorId: `ERR-${Date.now()}`,
        },
      };
    }
  }

  // 4. Data Quality Validation
  if (path === '/api/data/validate' && method === 'POST') {
    try {
      const { rows, columnMappings } = body;
      if (!rows || !Array.isArray(rows)) {
        return { status: 400, body: { error: 'Rows array is required.' } };
      }
      const report = runDataQualityAudit(rows, columnMappings || {});
      return { status: 200, body: report };
    } catch (err: any) {
      return { status: 400, body: { error: err.message || 'Failed to validate dataset.' } };
    }
  }

  // 5. Parameter Estimation
  if (path === '/api/data/estimate' && method === 'POST') {
    try {
      const { observed, population } = body;
      if (!observed || !Array.isArray(observed) || observed.length < 5) {
        return {
          status: 400,
          body: { error: 'At least 5 empirical data points with "cases" and "day" are required.' },
        };
      }
      const estimation = estimateParametersFromData(observed, population || 1000000);
      return { status: 200, body: estimation };
    } catch (err: any) {
      return { status: 400, body: { error: err.message || 'Failed to estimate model parameters.' } };
    }
  }

  // 6. Scenario Comparison
  if (path === '/api/scenario/compare' && method === 'POST') {
    try {
      const { scenarios } = body; // array of { id, name, config }
      if (!Array.isArray(scenarios) || scenarios.length === 0) {
        return { status: 400, body: { error: 'Array of scenarios is required.' } };
      }

      const results = scenarios.map((sc: any) => {
        const sim = runDeterministicSimulation(sc.config);
        return {
          id: sc.id,
          name: sc.name,
          color: sc.color || '#3b82f6',
          kpis: sim.kpis,
          timeSeries: sim.timeSeries,
        };
      });

      return { status: 200, body: { comparison: results } };
    } catch (err: any) {
      return { status: 400, body: { error: err.message || 'Failed to execute scenario comparison.' } };
    }
  }

  // 7. AI Research Assistant (Server-Side Gemini API)
  if (path === '/api/ai/analyze' && method === 'POST') {
    try {
      const { query, simulationSummary, datasetMetadata } = body;
      if (!query) {
        return { status: 400, body: { error: 'Query prompt is required.' } };
      }

      const ai = getAiClient();

      const systemInstruction = `
You are the ViraLab AI Epidemiological Research Assistant, an expert scientific communicator and computational epidemiologist.
CRITICAL MANDATES:
1. You must ONLY reason from the supplied mathematical simulation results, parameters, and empirical dataset metadata provided in the prompt.
2. NEVER hallucinate real-world clinical statistics, medical advice, or unverified claims.
3. Clearly distinguish between:
   - Observed historical data
   - Mathematical model estimates
   - Simulated projections under specific assumptions
   - Hypothetical "what-if" counterfactual scenarios
4. Explain epidemiological concepts clearly using scientific definitions (e.g. reproduction numbers R0 and Re, herd immunity threshold, transmission coefficient beta, incubation period 1/sigma, removal rate gamma).
5. State the underlying model assumptions (homogeneous mixing, deterministic compartment transitions, closed population) when explaining dynamics.
6. Provide clear, structured, readable bullet points and concise paragraphs.
`;

      const promptContext = `
Simulation Context:
${JSON.stringify(simulationSummary || {}, null, 2)}

Dataset Context:
${JSON.stringify(datasetMetadata || {}, null, 2)}

User Question:
"${query}"
`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: promptContext,
        config: {
          systemInstruction,
          temperature: 0.3, // Low temperature for high factual accuracy
        },
      });

      return {
        status: 200,
        body: {
          answer: response.text || 'Unable to generate response from model output.',
          timestamp: new Date().toISOString(),
        },
      };
    } catch (err: any) {
      return {
        status: 500,
        body: {
          error: err.message || 'AI Assistant service unavailable or API key not configured.',
          fallbackAnswer:
            'The AI Research Assistant could not connect to Gemini API. You can still inspect all interactive charts, numerical parameter estimates, and scenario metrics directly in ViraLab.',
        },
      };
    }
  }

  return { status: 404, body: { error: `Endpoint ${path} not found.` } };
}
