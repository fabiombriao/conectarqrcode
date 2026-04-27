import { NextRequest, NextResponse } from 'next/server';
import { extractQRCodeValue, getDinastiConfig, sleep } from '../dinasti';

async function getQRCode(apiBase: string, apiToken: string, maxRetries = 10): Promise<string> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const qrResponse = await fetch(`${apiBase}/session/qr`, {
      method: 'GET',
      headers: {
        accept: 'application/json',
        token: apiToken,
      },
    });

    const qrResponseClone = qrResponse.clone();

    if (qrResponse.ok) {
      const qrData = await qrResponse.json();
      const qrCode = extractQRCodeValue(qrData);

      if (qrCode) {
        return qrCode;
      }

      if (attempt < maxRetries) {
        await sleep(2000 * attempt);
        continue;
      }
    }

    if (qrResponse.status !== 404 || attempt === maxRetries) {
      const errorText = await qrResponseClone.text();
      throw new Error(`Erro ao gerar QR Code: ${qrResponse.status} - ${errorText}`);
    }

    await sleep(2000 * attempt);
  }

  throw new Error('QR Code não disponível após múltiplas tentativas');
}

export async function POST(request: NextRequest) {
  try {
    const { apiBase } = getDinastiConfig();
    const body = await request.json();
    const token = body?.token?.trim();

    if (!token) {
      return NextResponse.json({ error: 'Token da instância é obrigatório' }, { status: 400 });
    }

    const qrCodeBase64 = await getQRCode(apiBase, token);
    return NextResponse.json({ success: true, qrCode: qrCodeBase64 });
  } catch (error) {
    console.error('Erro:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro interno' },
      { status: 500 },
    );
  }
}
