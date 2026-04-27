import { NextRequest, NextResponse } from 'next/server';

function getConfig() {
  const apiBase = process.env.DINASTIAPI_BASE_URL?.trim().replace(/\/$/, '');
  const adminToken = process.env.DINASTIAPI_ADMIN_TOKEN?.trim();

  if (!apiBase || !adminToken) {
    throw new Error('Missing DINASTIAPI_BASE_URL or DINASTIAPI_ADMIN_TOKEN environment variables');
  }

  return { apiBase, adminToken };
}

function normalizeQRCodeValue(value: string) {
  return value.replace(/^data:image\/png;base64,/, '');
}

async function getQRCode(apiBase: string, apiToken: string, maxRetries = 10): Promise<string> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const qrResponse = await fetch(`${apiBase}/session/qr`, {
      method: 'GET',
      headers: {
        'accept': 'application/json',
        'token': apiToken,
      },
    });

    if (qrResponse.ok) {
      const qrData = await qrResponse.json();

      // Verificar formatos reais de resposta do DinastiAPI
      if (typeof qrData?.data?.QRCode === 'string') {
        const normalized = normalizeQRCodeValue(qrData.data.QRCode).trim();
        if (normalized) return normalized;
      }

      if (typeof qrData?.data?.qrcode?.base64 === 'string') {
        const normalized = normalizeQRCodeValue(qrData.data.qrcode.base64).trim();
        if (normalized) return normalized;
      }

      if (typeof qrData?.data?.base64 === 'string') {
        const normalized = normalizeQRCodeValue(qrData.data.base64).trim();
        if (normalized) return normalized;
      }

      if (typeof qrData?.qrcode?.base64 === 'string') {
        const normalized = normalizeQRCodeValue(qrData.qrcode.base64).trim();
        if (normalized) return normalized;
      }
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
    const { apiBase, adminToken } = getConfig();
    const body = await request.json();
    const { name, token: userToken } = body;

    if (!name || !userToken) {
      return NextResponse.json({ error: 'Nome e token são obrigatórios' }, { status: 400 });
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
    const instanceToken =
      createData?.data?.token ||
      createData?.data?.api_token ||
      createData?.token ||
      createData?.api_token ||
      userToken;

    // Aguardar instância ser criada e processada
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Passo 2: Conectar ao WhatsApp (usar o token retornado da criação)
    const connectResponse = await fetch(`${apiBase}/session/connect`, {
      method: 'POST',
      headers: {
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
    const qrCodeBase64 = await getQRCode(apiBase, instanceToken);

    return NextResponse.json({ qrCode: qrCodeBase64 });

  } catch (error) {
    console.error('Erro:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Erro interno' }, { status: 500 });
  }
}
