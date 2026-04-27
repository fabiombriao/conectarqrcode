import { NextRequest, NextResponse } from 'next/server';
import { getDinastiConfig } from '../dinasti';

export async function POST(request: NextRequest) {
  try {
    const { apiBase } = getDinastiConfig();
    const body = await request.json();
    const token = body?.token?.trim();

    if (!token) {
      return NextResponse.json({ error: 'Token da instância é obrigatório' }, { status: 400 });
    }

    const statusResponse = await fetch(`${apiBase}/session/status`, {
      method: 'GET',
      headers: {
        accept: 'application/json',
        token,
      },
    });

    if (!statusResponse.ok) {
      const errorText = await statusResponse.text();

      if (errorText.includes('sql: no rows in result set')) {
        return NextResponse.json({
          success: true,
          data: {
            connected: false,
            loggedIn: false,
            message: 'Instance is not connected yet',
          },
        });
      }

      return NextResponse.json(
        { error: `Erro ao consultar status: ${statusResponse.status} - ${errorText}` },
        { status: statusResponse.status },
      );
    }

    const statusData = await statusResponse.json();
    return NextResponse.json({ success: true, data: statusData });
  } catch (error) {
    console.error('Erro:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro interno' },
      { status: 500 },
    );
  }
}
