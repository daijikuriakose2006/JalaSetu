import { NextResponse } from 'next/server';
import { generateComparisonExplanation } from '@/lib/gemini';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      origin,
      destination,
      weightTonnes,
      roadCost,
      waterCost,
      roadDurationMin,
      waterDurationMin,
      roadCo2Kg,
      waterCo2Kg,
      costSavedPercent,
      co2SavedPercent,
    } = body;

    const explanation = await generateComparisonExplanation({
      origin: origin || 'Kochi',
      destination: destination || 'Alappuzha',
      weightTonnes: Number(weightTonnes) || 8,
      roadCost: Number(roadCost) || 3120,
      waterCost: Number(waterCost) || 1880,
      roadDurationMin: Number(roadDurationMin) || 150,
      waterDurationMin: Number(waterDurationMin) || 270,
      roadCo2Kg: Number(roadCo2Kg) || 32.2,
      waterCo2Kg: Number(waterCo2Kg) || 10.2,
      costSavedPercent: Number(costSavedPercent) || 40,
      co2SavedPercent: Number(co2SavedPercent) || 68,
    });

    return NextResponse.json({ explanation });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
