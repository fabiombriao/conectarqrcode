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

      // Only send webhook if status code is 200
      if (statusResponse.status === 200) {
        // Process as before - send webhook
      } else {
        // Don't send webhook for non-200 status codes
        return NextResponse.json({
          success: true,
          data: {
            connected: false,
            loggedIn: false,
            message: `Status code: ${statusResponse.status} - Instance not fully connected`,
            httpStatusCode: statusResponse.status,
          },
          webhookSent: false,
          webhookError: 'Webhook not sent due to non-200 status code',
        });
      }
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

    // Only send webhook when status code is 200 and connection is successful
    if (statusResponse.status === 200 && connected && name && locationId && providerName) {
      const webhookResponse = await fetch(STATUS_WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          dinastiapi_instance_name: name,
          dinastiapi_instance_token: token,
          location_id: locationId,
          provider_name: providerName,
          status: 'connected',
          dinastiapi_base_url: process.env.DINASTIAPI_BASE_URL,
          dinastiapi_admin_token: process.env.DINASTIAPI_ADMIN_TOKEN,
          http_status_code: statusResponse.status,
        }),
      });

      webhookSent = webhookResponse.ok;

      if (!webhookResponse.ok) {
        webhookError = await webhookResponse.text();
      }
    } else if (statusResponse.status !== 200) {
      webhookError = `Webhook not sent - API returned status code: ${statusResponse.status}`;
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
