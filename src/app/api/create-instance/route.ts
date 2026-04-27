import { NextRequest, NextResponse } from 'next/server';

const API_BASE = 'http://209.38.71.49:8080';
const AUTH_TOKEN = 'caf2856530a821792e01bcafe3c6eb02a41395f4df702d8405570fb34da34615';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, token } = body;

    if (!name || !token) {
      return NextResponse.json({ error: 'Nome e token são obrigatórios' }, { status: 400 });
    }

    // Passo 1: Criar instância
    const formData = new URLSearchParams();
    formData.append('name', name);
    formData.append('token', token);

    const createResponse = await fetch(`${API_BASE}/admin/users`, {
      method: 'POST',
      headers: {
        'Authorization': AUTH_TOKEN,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData,
    });

    if (!createResponse.ok) {
      const errorText = await createResponse.text();
      return NextResponse.json({ error: `Erro ao criar instância: ${createResponse.status} - ${errorText}` }, { status: createResponse.status });
    }

    // Aguardar instância ser criada
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Passo 2: Conectar ao WhatsApp
    const connectResponse = await fetch(`${API_BASE}/session/connect`, {
      method: 'POST',
      headers: {
        'Authorization': AUTH_TOKEN,
        'token': token,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        Subscribe: ['Message', 'ChatPresence', 'Connected', 'All'],
        Immediate: true,
      }),
    });

    if (!connectResponse.ok) {
      const errorText = await connectResponse.text();
      return NextResponse.json({ error: `Erro ao conectar: ${connectResponse.status} - ${errorText}` }, { status: connectResponse.status });
    }

    // Aguardar QR Code ser gerado
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Passo 3: Recuperar QR Code
    const qrResponse = await fetch(`${API_BASE}/session/qr`, {
      method: 'GET',
      headers: {
        'accept': 'application/json',
        'Authorization': AUTH_TOKEN,
        'token': token,
      },
    });

    if (!qrResponse.ok) {
      const errorText = await qrResponse.text();
      return NextResponse.json({ error: `Erro ao gerar QR Code: ${qrResponse.status} - ${errorText}` }, { status: qrResponse.status });
    }

    const qrData = await qrResponse.json();

    // Extrair QR Code base64 da resposta
    let qrCodeBase64 = '';
    if (qrData.code) {
      qrCodeBase64 = qrData.code;
    } else if (qrData.base64) {
      qrCodeBase64 = qrData.base64;
    } else if (qrData.qrcode?.code) {
      qrCodeBase64 = qrData.qrcode.code;
    } else {
      return NextResponse.json({ error: 'QR Code não encontrado na resposta', data: qrData }, { status: 500 });
    }

    return NextResponse.json({ qrCode: qrCodeBase64 });

  } catch (error) {
    console.error('Erro:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Erro interno' }, { status: 500 });
  }
}
