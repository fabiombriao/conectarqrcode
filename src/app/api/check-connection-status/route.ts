import { NextRequest, NextResponse } from 'next/server';
import { getDinastiConfig } from '../dinasti';

const STATUS_WEBHOOK_URL = 'https://dinastia-n8n-webhook.rphhuc.easypanel.host/webhook/criar_instancia_qrcode';

export async function POST(request: NextRequest) {
  try {
    const { apiBase } = getDinastiConfig();
    const body = await request.json();
    const token = body?.token?.trim();
    const name = body?.name?.trim();
    const locationId = body?.locationId?.trim();
    const providerName = body?.providerName?.trim();

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
    const sessionData = statusData?.data ?? statusData;
    const connected = Boolean(
      sessionData?.connected ||
      sessionData?.loggedIn ||
      sessionData?.session?.connected ||
      sessionData?.session?.loggedIn ||
      sessionData?.data?.connected ||
      sessionData?.data?.loggedIn,
    );

    let webhookSent = false;
    let webhookError = '';

    if (connected && name && locationId && providerName) {
      const webhookResponse = await fetch(STATUS_WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          instance_name: name,
          instance_token: token,
          locationId,
          providerName,
          status: 'connected',
          DinastiAPI_BASE_URL: process.env.DINASTIAPI_BASE_URL,
          DinASTIAPI_ADMIN_TOKEN: process.env.DINASTIAPI_ADMIN_TOKEN,
        }),
      });

      webhookSent = webhookResponse.ok;

      if (!webhookResponse.ok) {
        webhookError = await webhookResponse.text();
      }
    }

    return NextResponse.json({
      success: true,
      data: statusData,
      connected,
      webhookSent,
      webhookError,
    });
  } catch (error) {
    console.error('Erro:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro interno' },
      { status: 500 },
    );
  }
}
