import { NextRequest, NextResponse } from 'next/server';
import { extractInstanceToken, getDinastiConfig } from '../dinasti';

export async function POST(request: NextRequest) {
  try {
    const { apiBase, adminToken } = getDinastiConfig();
    const body = await request.json();
    const { name, token: userToken, providerName } = body;

    if (!name || !userToken || !providerName) {
      return NextResponse.json({ error: 'Nome, token e nome do provider são obrigatórios' }, { status: 400 });
    }

    const createResponse = await fetch(`${apiBase}/admin/users`, {
      method: 'POST',
      headers: {
        'Authorization': adminToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name,
        token: userToken,
      }),
    });

    if (!createResponse.ok) {
      const errorText = await createResponse.text();
      return NextResponse.json({ error: `Erro ao criar instância: ${createResponse.status} - ${errorText}` }, { status: createResponse.status });
    }

    const createData = await createResponse.json();
    const instanceToken = extractInstanceToken(createData, userToken);

    return NextResponse.json({
      success: true,
      instanceToken,
      data: createData?.data ?? createData,
    });

  } catch (error) {
    console.error('Erro:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Erro interno' }, { status: 500 });
  }
}
