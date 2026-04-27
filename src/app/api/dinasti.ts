export function getDinastiConfig() {
  const apiBase = process.env.DINASTIAPI_BASE_URL?.trim().replace(/\/$/, '');
  const adminToken = process.env.DINASTIAPI_ADMIN_TOKEN?.trim();

  if (!apiBase || !adminToken) {
    throw new Error('Missing DINASTIAPI_BASE_URL or DINASTIAPI_ADMIN_TOKEN environment variables');
  }

  return { apiBase, adminToken };
}

export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function normalizeQRCodeValue(value: string) {
  return value.replace(/^data:image\/png;base64,/, '').trim();
}

export function extractInstanceToken(payload: unknown, fallbackToken: string) {
  const data = payload as {
    data?: { token?: string; api_token?: string };
    token?: string;
    api_token?: string;
  };

  return data?.data?.token || data?.data?.api_token || data?.token || data?.api_token || fallbackToken;
}

export function extractQRCodeValue(payload: unknown) {
  const data = payload as {
    data?: {
      QRCode?: string;
      code?: string;
      base64?: string;
      qrcode?: { code?: string; base64?: string };
    };
    QRCode?: string;
    code?: string;
    base64?: string;
    qrcode?: { code?: string; base64?: string };
  };

  const candidates = [
    data?.data?.QRCode,
    data?.data?.code,
    data?.data?.base64,
    data?.data?.qrcode?.code,
    data?.data?.qrcode?.base64,
    data?.QRCode,
    data?.code,
    data?.base64,
    data?.qrcode?.code,
    data?.qrcode?.base64,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === 'string') {
      const normalized = normalizeQRCodeValue(candidate);
      if (normalized) return normalized;
    }
  }

  return '';
}
