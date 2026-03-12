import { NextRequest, NextResponse } from 'next/server';
import { getUserData } from '@/lib/redis';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const visitorId = searchParams.get('visitorId');

  if (!visitorId) {
    return NextResponse.json(
      { success: false, error: 'visitorId é obrigatório.' },
      { status: 400 }
    );
  }

  const userData = await getUserData(visitorId);

  if (!userData) {
    return NextResponse.json(
      { success: false, error: 'Dados não encontrados. Faça login primeiro.' },
      { status: 404 }
    );
  }

  return NextResponse.json({ success: true, data: userData });
}
