import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { extractBookingDetails } from '@/lib/gemini';
import { z } from 'zod';

const ChatRequestSchema = z.object({
  message: z.string(),
  order_id: z.string().optional(),
  chat_history: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string(),
      })
    )
    .optional(),
});

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = ChatRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request', details: parsed.error }, { status: 400 });
    }

    const { message, chat_history = [] } = parsed.data;

    // Use centralized Gemini extraction with fallback
    const result = await extractBookingDetails(chat_history, message);

    return NextResponse.json({
      reply: result.reply,
      extracted_data: result.extracted,
      is_complete: result.is_complete,
      order_id: parsed.data.order_id,
    });
  } catch (err: any) {
    console.error('Chat endpoint error:', err);
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
