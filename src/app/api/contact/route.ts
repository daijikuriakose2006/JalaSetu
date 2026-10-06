import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { contactMessageSchema } from '@/lib/validations';
import nodemailer from 'nodemailer';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = contactMessageSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { name, email, subject, message } = parsed.data;
    const admin = createAdminClient();

    const { data, error } = await admin.from('contact_messages').insert({
      name,
      email,
      subject: subject || 'General Inquiry',
      message,
      read: false,
    }).select().single();

    if (error) throw error;

    // Optional email forwarding via Nodemailer if SMTP configured
    if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
      try {
        const transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: {
            user: process.env.GMAIL_USER,
            pass: process.env.GMAIL_APP_PASSWORD,
          },
        });

        await transporter.sendMail({
          from: `"JalaSetu Contact" <${process.env.GMAIL_USER}>`,
          to: process.env.GMAIL_USER,
          subject: `[JalaSetu Contact] ${subject || 'New Message'} from ${name}`,
          text: `From: ${name} (${email})\n\nMessage:\n${message}`,
        });
      } catch (mailErr) {
        console.warn('Contact email forward error:', mailErr);
      }
    }

    return NextResponse.json({ success: true, messageId: data.id });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
