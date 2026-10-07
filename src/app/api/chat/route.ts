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
    let userId: string | null = null;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      userId = user?.id || null;
    } catch {
      // Non-blocking for conversation
    }

    const body = await request.json();
    const parsed = ChatRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request', details: parsed.error }, { status: 400 });
    }

    const { message, chat_history = [] } = parsed.data;

    // 🔍 Debug: log what is being sent to the model
    console.log('\n──── /api/chat ────────────────────────────────────');
    console.log('📨 User message:', message);
    console.log('📜 History length:', chat_history.length);

    // Use centralized Gemini extraction with intelligent fallback
    const result = await extractBookingDetails(chat_history, message);

    // 🔍 Debug: log what came back
    console.log('🤖 Reply:', result.reply.slice(0, 80) + (result.reply.length > 80 ? '…' : ''));
    console.log('📦 Extracted:', JSON.stringify(result.extracted));
    console.log('✅ is_complete:', result.is_complete);
    console.log('────────────────────────────────────────────────────\n');

    return NextResponse.json({
      reply: result.reply,
      extracted_data: result.extracted,
      is_complete: result.is_complete,
      suggested_chips: result.suggested_chips || [],
      order_id: parsed.data.order_id,
      user_id: userId,
    });
  } catch (err: any) {
    console.error('Chat endpoint error:', err);
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
