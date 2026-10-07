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
  suggested_chips?: string[];
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
  // Scan the FULL conversation to build up extracted fields progressively
  const fullText = chatHistory.map((m) => m.content).join(' ') + ' ' + latestMessage;
  const lower = fullText.toLowerCase();

  // ONLY scan LATEST message for greeting detection (not history)
  const latestLower = latestMessage.toLowerCase().trim();
  const isGreeting =
    latestMessage.trim().length < 20 &&
    (latestLower === 'hi' ||
      latestLower === 'hai' ||
      latestLower === 'hello' ||
      latestLower === 'hey' ||
      latestLower === 'namaskaram' ||
      latestLower.startsWith('hi ') ||
      latestLower.startsWith('hello '));

  const extracted: ExtractedBookingDetails = {};

  // ── Weight extraction ──────────────────────────────────────────────
  // handles: "8 tonnes", "8t", "1 ton", "8000 kg", "500 kilograms"
  const kgMatch = lower.match(/(\d+(?:\.\d+)?)\s*(?:kg|kilograms?)\b/i);
  if (kgMatch) {
    extracted.weight_tonnes = parseFloat(kgMatch[1]) / 1000;
  } else {
    const weightMatch = lower.match(/(\d+(?:\.\d+)?)\s*(?:tonnes?|tons?|t\b)/i);
    if (weightMatch) {
      extracted.weight_tonnes = parseFloat(weightMatch[1]);
    }
  }

  // ── Cargo name heuristics (keyword → canonical name) ──────────────
  if (lower.includes('cement')) extracted.cargo_name = 'Cement Bags';
  else if (lower.includes('sand')) extracted.cargo_name = 'River Sand';
  else if (lower.includes('brick')) extracted.cargo_name = 'Red Bricks';
  else if (lower.includes('steel') || lower.includes('iron') || lower.includes('tmt')) extracted.cargo_name = 'Steel / TMT Bars';
  else if (lower.includes('building material') || lower.includes('construction material')) extracted.cargo_name = 'Building Materials';
  else if (lower.includes('timber') || lower.includes('wood')) extracted.cargo_name = 'Timber';
  else if (lower.includes('tile') || lower.includes('granite') || lower.includes('marble')) extracted.cargo_name = 'Floor Tiles / Granite';
  else if (lower.includes('coir')) extracted.cargo_name = 'Coir Mats & Fibre';
  else if (lower.includes('rice') || lower.includes('paddy')) extracted.cargo_name = 'Rice / Paddy';
  else if (lower.includes('grain') || lower.includes('wheat') || lower.includes('maize')) extracted.cargo_name = 'Food Grains';
  else if (lower.includes('apple') || lower.includes('mango') || lower.includes('banana') || lower.includes('fruit')) extracted.cargo_name = 'Fresh Fruits';
  else if (lower.includes('vegetable') || lower.includes('onion') || lower.includes('potato') || lower.includes('tomato')) extracted.cargo_name = 'Vegetables';
  else if (lower.includes('fish') || lower.includes('prawn') || lower.includes('seafood')) extracted.cargo_name = 'Fish / Seafood';
  else if (lower.includes('coconut') || lower.includes('copra')) extracted.cargo_name = 'Coconut / Copra';
  else if (lower.includes('fertilizer') || lower.includes('fertiliser')) extracted.cargo_name = 'Fertilizer';
  else if (lower.includes('fuel') || lower.includes('diesel') || lower.includes('petrol')) extracted.cargo_name = 'Fuel';
  else if (lower.includes('coal')) extracted.cargo_name = 'Coal';
  else if (lower.includes('container')) extracted.cargo_name = 'Shipping Container';
  else {
    // Pattern 1: verb + cargo — "move/send/ship <cargo> from…"
    // Also handles "need to send", "want to ship", "i need to transport"
    const verbMatch = lower.match(
      /(?:move|transport|ship|carry|send|sent|dispatch)\s+(?:\d+\s*(?:boxes?|bags?|sacks?|units?|crates?|pieces?|nos?\.?)\s+of\s+)?([a-zA-Z][a-zA-Z\s]{2,30}?)(?:\s+from|\s+\d|\s*$)/i
    );
    if (verbMatch && verbMatch[1].trim().length > 2) {
      extracted.cargo_name = verbMatch[1].trim()
        // clean up trailing prepositions / noise words
        .replace(/\b(?:from|to|for|the|a|an)\s*$/i, '')
        .trim();
    } else {
      // Pattern 2: "<N> boxes/bags of <cargo>" without a verb
      const containerMatch = lower.match(
        /\d+\s*(?:boxes?|bags?|sacks?|units?|crates?|pieces?|nos?\.?)\s+of\s+([a-zA-Z][a-zA-Z\s]{2,30}?)(?:\s+from|\s+\d|\s*$)/i
      );
      if (containerMatch && containerMatch[1].trim().length > 2) {
        extracted.cargo_name = containerMatch[1].trim()
          .replace(/\b(?:from|to|for|the|a|an)\s*$/i, '')
          .trim();
      }
    }
  }

  // ── Origin & Destination ───────────────────────────────────────────
  // Kerala cities lookup table (origin and destination detection)
  const KERALA_CITIES: Record<string, string> = {
    kochi: 'Kochi', cochin: 'Kochi', ernakulam: 'Kochi', 'fort kochi': 'Kochi',
    alappuzha: 'Alappuzha', alleppey: 'Alappuzha',
    kottayam: 'Kottayam',
    kollam: 'Kollam', quilon: 'Kollam',
    vaikom: 'Vaikom',
    muhamma: 'Muhamma',
    cherthala: 'Cherthala', cherthalla: 'Cherthala',
    thrissur: 'Thrissur', trichur: 'Thrissur',
    palakkad: 'Palakkad', palghat: 'Palakkad',
    kozhikode: 'Kozhikode', calicut: 'Kozhikode',
    kannur: 'Kannur', cannanore: 'Kannur',
    thiruvananthapuram: 'Thiruvananthapuram', trivandrum: 'Thiruvananthapuram',
    malappuram: 'Malappuram',
    pathanamthitta: 'Pathanamthitta',
    idukki: 'Idukki',
    kasaragod: 'Kasaragod',
    kumarakom: 'Kumarakom',
    munroe: 'Munroe Island', munroturuttu: 'Munroe Island',
    kayamkulam: 'Kayamkulam',
    changanassery: 'Changanassery',
    mannar: 'Mannar',
    champakulam: 'Champakulam',
    nedumudi: 'Nedumudi',
  };

  // "from <city>" pattern
  const fromMatch = lower.match(/(?:from|pickup\s+at|starting\s+(?:from|at)|origin\s*:?)\s+([a-z\s]{3,25}?)(?:\s+to|\s+for|\s+dest|,|$)/i);
  if (fromMatch) {
    const candidate = fromMatch[1].trim().toLowerCase();
    for (const [key, val] of Object.entries(KERALA_CITIES)) {
      if (candidate.includes(key)) { extracted.origin = val; break; }
    }
    if (!extracted.origin && candidate.length > 2) extracted.origin = fromMatch[1].trim();
  }

  // "to <city>" pattern
  const toMatch = lower.match(/(?:\bto\b|delivery\s+to|dest(?:ination)?\s*:?)\s+([a-z\s]{3,25?})(?:\s+with|\s+for|\s+by|,|$)/i);
  if (toMatch) {
    const candidate = toMatch[1].trim().toLowerCase();
    for (const [key, val] of Object.entries(KERALA_CITIES)) {
      if (candidate.includes(key)) { extracted.destination = val; break; }
    }
    if (!extracted.destination && candidate.length > 2) extracted.destination = toMatch[1].trim();
  }

  // Fallback: city mentioned anywhere in text — only with directional context
  if (!extracted.origin) {
    for (const [key, val] of Object.entries(KERALA_CITIES)) {
      if (lower.match(new RegExp(`\\b(from|pickup)\\b[^.]*\\b${key}\\b`, 'i'))) {
        extracted.origin = val; break;
      }
    }
  }
  if (!extracted.destination) {
    for (const [key, val] of Object.entries(KERALA_CITIES)) {
      if (lower.match(new RegExp(`\\b(to|deliver(?:y|ed)?\\s+(?:to)?)\\b[^.]*\\b${key}\\b`, 'i'))) {
        extracted.destination = val; break;
      }
    }
  }

  // ── Loading / Unloading ────────────────────────────────────────────
  if (/(load|unload|labour|labor|worker|helper|stevedore)/i.test(lower)) {
    extracted.needs_loading_unloading =
      !/\b(no\s+load|without\s+load|no\s+helper|no\s+worker)\b/i.test(lower);
  }

  // ── Date / Time ────────────────────────────────────────────────────
  if (/\b(now|immediately|urgent|asap)\b/i.test(lower)) {
    extracted.pickup_time = 'Now';
  } else if (/\btoday\b/i.test(lower)) {
    extracted.pickup_time = 'Today';
  } else if (/\btomorrow\b/i.test(lower)) {
    extracted.pickup_time = 'Tomorrow';
  }

  // ── Completeness & Reply ───────────────────────────────────────────
  const hasCore = Boolean(
    extracted.cargo_name && extracted.weight_tonnes && extracted.origin && extracted.destination
  );
  const is_complete = hasCore && !isGreeting;

  let reply = '';
  let suggested_chips: string[] = [];

  if (isGreeting) {
    reply = `Namaskaram! Welcome to JalaSetu 👋 I help arrange inland water cargo transit across Kerala's backwaters with first and last-mile road pickup. What would you like to ship today?`;
    suggested_chips = [
      'Move 8 tonnes building material from Kochi to Alappuzha',
      'Transport 5t cement bags from Fort Kochi to Vaikom',
      'Send 12 tonnes river sand from Ernakulam to Muhamma',
    ];
  } else if (!extracted.cargo_name && !extracted.weight_tonnes) {
    reply = `What cargo would you like to move, and approximately how much does it weigh in tonnes? (e.g. "5 boxes of apples, 1 tonne")`;
    suggested_chips = ['1 tonne Fresh Fruits', '8 tonnes Building Material', '5t Cement Bags'];
  } else if (!extracted.cargo_name) {
    reply = `Got the weight — **${extracted.weight_tonnes} tonnes**! What is the cargo or commodity you'd like to ship?`;
    suggested_chips = ['Fresh Fruits', 'Vegetables', 'Building Material', 'Cement Bags'];
  } else if (!extracted.weight_tonnes) {
    reply = `Got it — **${extracted.cargo_name}**! What is the approximate weight in tonnes? (e.g. "1 tonne" or "500 kg")`;
    suggested_chips = ['0.5 tonnes (500 kg)', '1 tonne', '5 tonnes'];
  } else if (!extracted.origin || !extracted.destination) {
    reply = `Noted — **${extracted.weight_tonnes}t of ${extracted.cargo_name}**! Where in Kerala is the pickup location, and where should it be delivered?`;
    suggested_chips = ['From Kochi to Alappuzha', 'From Kochi to Cherthala', 'From Fort Kochi to Vaikom'];
  } else if (extracted.needs_loading_unloading === undefined) {
    reply = `Great! Moving **${extracted.weight_tonnes}t of ${extracted.cargo_name}** from **${extracted.origin}** to **${extracted.destination}**. Do you need jetty loading/unloading workers, and when should we schedule the pickup?`;
    suggested_chips = ['👷 Yes, need helpers — Now', '🚫 No loading helpers — Now', '📅 Schedule for Today'];
  } else {
    reply = `Perfect! Calculating the optimal waterway route for **${extracted.weight_tonnes}t of ${extracted.cargo_name}** from **${extracted.origin}** to **${extracted.destination}**…`;
    suggested_chips = ['🚀 Confirm & Dispatch Order', 'Change weight or quantity'];
  }

  return { extracted, is_complete, reply, suggested_chips };
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
    console.log('⚠️  Gemini unavailable (no key or rate limit) → using regex fallback');
    return extractBookingFallback(chatHistory, latestMessage);
  }

  const modelName = process.env.GEMINI_MODEL || 'gemini-3.8-flash';
  console.log(`🧠 Calling Gemini model: ${modelName}`);

  const systemInstruction = `You are JalaSetu's AI Cargo Booking Agent for Kerala's inland waterways.
JalaSetu connects cargo owners with Kerala's backwater boats/barges plus first/last-mile road transport.

Your goal: converse naturally (like WhatsApp/ChatGPT) and gradually extract these booking details:
1. cargo_name: canonical item name. Examples: "Fresh Fruits", "Cement Bags", "Building Materials", "Fish / Seafood", "Vegetables", "Rice / Paddy", "Coconut / Copra"
2. cargo_description: optional extra notes
3. weight_tonnes: weight as a number in tonnes. If user says "5 boxes of apples", estimate weight (5 boxes ≈ 0.1t) and ask to confirm. If unsure, ask.
4. needs_loading_unloading: true if user wants helpers/labour at jetty
5. pickup_time: "Now", "Today", "Tomorrow", or a date string
6. origin: Kerala city/town (e.g. "Kochi", "Ernakulam", "Cherthala")
7. destination: Kerala city/town (e.g. "Alappuzha", "Vaikom", "Kollam", "Cherthala", "Thrissur", "Kottayam")

Kerala towns served: Kochi, Fort Kochi, Ernakulam, Alappuzha (Alleppey), Kottayam, Kollam, Vaikom, Muhamma, Cherthala, Cherthalla, Thrissur, Kozhikode, Thiruvananthapuram, Kumarakom, Kayamkulam, Changanassery, Champakulam.

Rules:
- Set is_complete=true ONLY when ALL 4 essentials (cargo_name, weight_tonnes, origin, destination) are confirmed.
- Ask for missing fields one at a time. Never dump all questions at once.
- Be warm and friendly, use Kerala context in replies.
- Always output valid JSON conforming to the schema.`;

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
            suggested_chips: {
              type: 'ARRAY',
              items: { type: 'STRING' },
            },
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
        suggested_chips: parsed.suggested_chips || [],
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
    const modelName = process.env.GEMINI_MODEL || 'gemini-3.8-flash';
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
