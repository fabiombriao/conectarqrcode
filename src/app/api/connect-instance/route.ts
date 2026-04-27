import { NextRequest, NextResponse } from 'next/server';
import { getDinastiConfig, sleep } from '../dinasti';

export async function POST(request: NextRequest) {
  try {
    const { apiBase } = getDinastiConfig();
    const body = await request.json();
    const token = body?.token?.trim();

    if (!token) {
      return NextResponse.json({ error: 'Token da instância é obrigatório' }, { status: 400 });
    }

    await sleep(3000);

    const connectResponse = await fetch(`${apiBase}/session/connect`, {
      method: 'POST',
      headers: {
        token,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        Subscribe: ['Message', 'ChatPresence', 'Connected', 'All'],
        Immediate: true,
      }),
    });

    if (!connectResponse.ok) {
      const errorText = await connectResponse.text();
      return NextResponse.json(
        { error: `Erro ao conectar: ${connectResponse.status} - ${errorText}` },
        { status: connectResponse.status },
      );
    }

    const connectData = await connectResponse.json();
    return NextResponse.json({ success: true, data: connectData });
  } catch (error) {
    console.error('Erro:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro interno' },
      { status: 500 },
    );
  }
}
