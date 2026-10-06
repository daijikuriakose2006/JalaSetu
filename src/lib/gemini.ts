import { GoogleGenAI } from '@google/genai';

export interface ExtractedBookingDetails {
  cargo_name?: string;
  cargo_description?: string;
  weight_tonnes?: number;
  needs_loading_unloading?: boolean;
  pickup_time?: string;
  origin?: string;
  destination?: string;
}

export interface ChatExtractionResult {
  extracted: ExtractedBookingDetails;
  is_complete: boolean;
  reply: string;
}

// In-memory token bucket / rate limiter: max 15 req/min
let requestCount = 0;
let windowStartTime = Date.now();

function checkRateLimit(): boolean {
  const now = Date.now();
  if (now - windowStartTime > 60000) {
    windowStartTime = now;
    requestCount = 0;
  }
  if (requestCount >= 15) {
    return false;
  }
  requestCount++;
  return true;
}

function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'your-gemini-api-key') {
    return null;
  }
  return new GoogleGenAI({ apiKey });
}

/**
 * Intelligent regex + heuristics fallback when Gemini API key is missing or rate limited
 */
export function extractBookingFallback(
  chatHistory: { role: 'user' | 'assistant'; content: string }[],
  latestMessage: string
): ChatExtractionResult {
  const fullText = chatHistory.map((m) => m.content).join(' ') + ' ' + latestMessage;
  const lower = fullText.toLowerCase();

  const extracted: ExtractedBookingDetails = {};

  // Weight extraction (e.g., 8 tonnes, 8t, 8 ton, 10 tons)
  const weightMatch = lower.match(/(\d+(?:\.\d+)?)\s*(?:tonnes|tonne|tons|ton|t\b)/i);
  if (weightMatch) {
    extracted.weight_tonnes = parseFloat(weightMatch[1]);
  }

  // Cargo name heuristics
  if (lower.includes('cement')) extracted.cargo_name = 'Cement Bags';
  else if (lower.includes('sand')) extracted.cargo_name = 'River Sand';
  else if (lower.includes('brick')) extracted.cargo_name = 'Red Bricks';
  else if (lower.includes('steel') || lower.includes('iron') || lower.includes('tmt')) extracted.cargo_name = 'Steel / TMT Bars';
  else if (lower.includes('building material') || lower.includes('construction material')) extracted.cargo_name = 'Building Materials';
  else if (lower.includes('timber') || lower.includes('wood')) extracted.cargo_name = 'Timber';
  else if (lower.includes('tile') || lower.includes('granite') || lower.includes('marble')) extracted.cargo_name = 'Floor Tiles / Granite';
  else {
    const itemMatch = lower.match(/move|transport|ship|carry|send\s+([a-zA-Z\s]+?)(?:from|\bto\b|\d)/i);
    if (itemMatch && itemMatch[1].trim().length > 2) {
      extracted.cargo_name = itemMatch[1].trim();
    }
  }

  // Origin & Destination
  const fromMatch = lower.match(/(?:from|pickup at|origin:?)\s+([a-zA-Z\s]+?)(?:to|for|dest|\bat\b|,|$)/i);
  if (fromMatch && fromMatch[1].trim()) {
    extracted.origin = fromMatch[1].trim();
  } else if (lower.includes('kochi') || lower.includes('cochin') || lower.includes('ernakulam')) {
    extracted.origin = 'Kochi';
  }

  const toMatch = lower.match(/(?:to|delivery to|dest:?|destination:?)\s+([a-zA-Z\s]+?)(?:for|with|\bat\b|,|$)/i);
  if (toMatch && toMatch[1].trim()) {
    extracted.destination = toMatch[1].trim();
  } else if (lower.includes('alappuzha') || lower.includes('alleppey')) {
    extracted.destination = 'Alappuzha';
  } else if (lower.includes('kottayam')) {
    extracted.destination = 'Kottayam';
  } else if (lower.includes('kollam')) {
    extracted.destination = 'Kollam';
  }

  // Loading / Unloading
  if (lower.includes('loading') || lower.includes('labor') || lower.includes('unload') || lower.includes('workers')) {
    extracted.needs_loading_unloading = !lower.includes('no loading') && !lower.includes('without loading');
  }

  // Date / Time
  if (lower.includes('now') || lower.includes('immediately') || lower.includes('urgent')) {
    extracted.pickup_time = 'Now';
  } else if (lower.includes('today')) {
    extracted.pickup_time = 'Today';
  } else if (lower.includes('tomorrow')) {
    extracted.pickup_time = 'Tomorrow';
  }

  const missing: string[] = [];
  if (!extracted.cargo_name) missing.push('what item or cargo you want to ship');
  if (!extracted.weight_tonnes) missing.push('the estimated weight in tonnes');
  if (!extracted.origin) missing.push('pickup location/origin');
  if (!extracted.destination) missing.push('destination in Kerala');

  const is_complete = missing.length === 0;

  let reply = '';
  if (is_complete) {
    reply = `Great! I've noted down: **${extracted.cargo_name}** (${extracted.weight_tonnes} tonnes) from **${extracted.origin}** to **${extracted.destination}**. Please review the details below to view your multi-modal route plan and cost comparison.`;
  } else {
    reply = `I can help arrange inland water transport for your shipment! To prepare the best route plan, could you please specify ${missing.join(', and ')}?`;
  }

  return { extracted, is_complete, reply };
}

/**
 * Extract booking details using Gemini with structured JSON output
 */
export async function extractBookingDetails(
  chatHistory: { role: 'user' | 'assistant'; content: string }[],
  latestMessage: string
): Promise<ChatExtractionResult> {
  const ai = getGeminiClient();
  if (!ai || !checkRateLimit()) {
    return extractBookingFallback(chatHistory, latestMessage);
  }

  const modelName = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

  const systemInstruction = `You are JalaSetu's AI Cargo Booking Agent.
JalaSetu connects cargo owners with Kerala's inland waterways (boats/barges) plus first/last-mile road transport (taxis/trucks).
Your goal is to converse with the user and extract:
1. cargo_name: Item to ship (e.g. "8 tonnes building material", "Cement bags")
2. cargo_description: brief notes if any
3. weight_tonnes: Number in tonnes (e.g. 8)
4. needs_loading_unloading: Boolean (true if user requested helpers/labour)
5. pickup_time: e.g. "Now", "Today", or a date/time string
6. origin: Origin place in Kerala (e.g. "Kochi")
7. destination: Destination place in Kerala (e.g. "Alappuzha")

Analyze the conversation history and the latest message.
Extract whatever fields are available. Set is_complete to true ONLY if all 4 essentials (cargo_name, weight_tonnes, origin, destination) are identified.
Write a friendly, polite response in 'reply'. If fields are missing, ask for them naturally in Kerala logistics context.
Always output valid JSON conforming to the schema.`;

  const conversationText = chatHistory
    .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
    .join('\n') + `\nUSER: ${latestMessage}`;

  try {
    const response = await ai.models.generateContent({
      model: modelName,
      contents: conversationText,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'OBJECT',
          properties: {
            extracted: {
              type: 'OBJECT',
              properties: {
                cargo_name: { type: 'STRING' },
                cargo_description: { type: 'STRING' },
                weight_tonnes: { type: 'NUMBER' },
                needs_loading_unloading: { type: 'BOOLEAN' },
                pickup_time: { type: 'STRING' },
                origin: { type: 'STRING' },
                destination: { type: 'STRING' },
              },
            },
            is_complete: { type: 'BOOLEAN' },
            reply: { type: 'STRING' },
          },
          required: ['reply', 'is_complete'],
        },
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    if (parsed.reply) {
      return {
        extracted: parsed.extracted || {},
        is_complete: Boolean(parsed.is_complete),
        reply: parsed.reply,
      };
    }
  } catch (err) {
    console.warn('Gemini chat extraction error, falling back:', err);
  }

  return extractBookingFallback(chatHistory, latestMessage);
}

/**
 * Generate Gemini explanation for Road vs Waterway comparison card
 */
export async function generateComparisonExplanation(params: {
  origin: string;
  destination: string;
  weightTonnes: number;
  roadCost: number;
  waterCost: number;
  roadDurationMin: number;
  waterDurationMin: number;
  roadCo2Kg: number;
  waterCo2Kg: number;
  costSavedPercent: number;
  co2SavedPercent: number;
}): Promise<string> {
  const fallback = `Moving ${params.weightTonnes} tonnes from ${params.origin} to ${params.destination} via Kerala's waterways cuts transport costs by ~${params.costSavedPercent}% (saving ₹${params.roadCost - params.waterCost}) and reduces carbon emissions by ${params.co2SavedPercent}% (${(params.roadCo2Kg - params.waterCo2Kg).toFixed(1)} kg CO₂). While water transit is slower due to backwater navigation speeds, it avoids highway toll and traffic bottlenecks on NH66.`;

  const ai = getGeminiClient();
  if (!ai || !checkRateLimit()) {
    return fallback;
  }

  try {
    const modelName = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
    const prompt = `Write a crisp 2-3 sentence executive summary explaining the Road vs Waterway comparison for a cargo owner.
Route: ${params.origin} to ${params.destination}
Cargo: ${params.weightTonnes} tonnes
Road: ₹${params.roadCost}, ${Math.round(params.roadDurationMin / 60)} hrs, ${params.roadCo2Kg} kg CO2
Waterway (Multi-modal): ₹${params.waterCost}, ${Math.round(params.waterDurationMin / 60)} hrs, ${params.waterCo2Kg} kg CO2
Savings: ${params.costSavedPercent}% cheaper, ${params.co2SavedPercent}% less emissions.
Tone: Professional, persuasive, highlighting cost and environmental advantages of Kerala's national waterways.`;

    const res = await ai.models.generateContent({
      model: modelName,
      contents: prompt,
    });

    return res.text?.trim() || fallback;
  } catch (err) {
    console.warn('Gemini comparison explanation error:', err);
    return fallback;
  }
}
