import { NextRequest, NextResponse } from 'next/server';

const API_BASE = 'http://209.38.71.49:8080';
const AUTH_TOKEN = 'caf2856530a821792e01bcafe3c6eb02a41395f4df702d8405570fb34da34615';

async function getQRCode(apiToken: string, maxRetries = 10): Promise<string> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const qrResponse = await fetch(`${API_BASE}/session/qr`, {
      method: 'GET',
      headers: {
        'accept': 'application/json',
        'Authorization': AUTH_TOKEN,
        'token': apiToken,
      },
    });

    if (qrResponse.ok) {
      const qrData = await qrResponse.json();

      // Verificar diferentes formatos de resposta
      if (qrData.code) return qrData.code;
      if (qrData.base64) return qrData.base64;
      if (qrData.qrcode?.code) return qrData.qrcode.code;
      if (qrData.qrcode?.base64) return qrData.qrcode.base64;
    }

    // Se não for 404 ou última tentativa, throw erro
    if (qrResponse.status !== 404 || attempt === maxRetries) {
      const errorText = await qrResponse.text();
      throw new Error(`Erro ao gerar QR Code: ${qrResponse.status} - ${errorText}`);
    }

    // Aguardar antes da próxima tentativa (tempo crescente)
    await new Promise(resolve => setTimeout(resolve, 2000 * attempt));
  }

  throw new Error('QR Code não disponível após múltiplas tentativas');
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, token: userToken } = body;

    if (!name || !userToken) {
      return NextResponse.json({ error: 'Nome e token são obrigatórios' }, { status: 400 });
    }

    // Passo 1: Criar instância
    const formData = new URLSearchParams();
    formData.append('name', name);
    formData.append('token', userToken);

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

    const createData = await createResponse.json();
    const instanceToken = createData.token || createData.api_token || userToken;

    // Aguardar instância ser criada e processada
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Passo 2: Conectar ao WhatsApp (usar o token retornado da criação)
    const connectResponse = await fetch(`${API_BASE}/session/connect`, {
      method: 'POST',
      headers: {
        'Authorization': AUTH_TOKEN,
        'token': instanceToken,
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

    // Passo 3: Recuperar QR Code com retry
    const qrCodeBase64 = await getQRCode(instanceToken);

    return NextResponse.json({ qrCode: qrCodeBase64 });

  } catch (error) {
    console.error('Erro:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Erro interno' }, { status: 500 });
  }
}
