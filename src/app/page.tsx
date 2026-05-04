'use client';

import { useState } from 'react';
import Image from 'next/image';

export default function Home() {
  const [name, setName] = useState('');
  const [token, setToken] = useState('');
  const [locationId, setLocationId] = useState('');
  const [providerName, setProviderName] = useState('');
  const [loadingAction, setLoadingAction] = useState<'create' | 'connect' | 'qr' | null>(null);
  const [statusLoading, setStatusLoading] = useState(false);
  const [creationResult, setCreationResult] = useState('');
  const [connectionResult, setConnectionResult] = useState('');
  const [qrStatus, setQrStatus] = useState('');
  const [statusResult, setStatusResult] = useState('');
  const [statusConnected, setStatusConnected] = useState(false);
  const [qrCode, setQrCode] = useState('');
  const [error, setError] = useState('');
  const [instanceToken, setInstanceToken] = useState('');
  const [instanceCreated, setInstanceCreated] = useState(false);
  const [instanceConnected, setInstanceConnected] = useState(false);
  const [connectionStatusChecked, setConnectionStatusChecked] = useState(false);

  const sanitizeInput = (value: string) => {
    return value.replace(/[^a-zA-Z0-9]/g, '');
  };

  const getQrImageSrc = (value: string) => {
    return value.startsWith('data:image/') ? value : `data:image/png;base64,${value}`;
  };

  const parseError = async (response: Response) => {
    try {
      const payload = await response.json();
      return payload.error || 'Erro ao processar';
    } catch {
      return 'Erro ao processar';
    }
  };

  const handleCreateInstance = async () => {
    setError('');
    setQrCode('');
    setCreationResult('');
    setConnectionResult('');
    setQrStatus('');
    setStatusResult('');
    setStatusConnected(false);
    setStatusLoading(false);
    setInstanceToken('');
    setInstanceCreated(false);
    setInstanceConnected(false);
    setConnectionStatusChecked(false);
    setLoadingAction('create');

    try {
      const response = await fetch('/api/create-instance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, token, providerName }),
      });

      if (!response.ok) {
        throw new Error(await parseError(response));
      }

      const data = await response.json();
      const createdToken = data.instanceToken || token;

      setInstanceToken(createdToken);
      setInstanceCreated(true);
      setCreationResult(`Instância criada com sucesso. Token: ${createdToken}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoadingAction(null);
    }
  };

  const handleConnectInstance = async () => {
    setError('');
    setConnectionResult('');
    setQrStatus('');
    setStatusResult('');
    setStatusConnected(false);
    setQrCode('');
    setLoadingAction('connect');

    try {
      const response = await fetch('/api/connect-instance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: instanceToken }),
      });

      if (!response.ok) {
        throw new Error(await parseError(response));
      }

      const data = await response.json();
      setInstanceConnected(true);
      setConnectionResult(
        data?.data?.details
          ? `Instância conectada: ${data.data.details}`
          : 'Instância conectada com sucesso.',
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoadingAction(null);
    }
  };

  const handleGenerateQRCode = async () => {
    setError('');
    setQrCode('');
    setQrStatus('Aguardando QR Code...');
    setStatusResult('');
    setConnectionStatusChecked(false);
    setLoadingAction('qr');

    try {
      const response = await fetch('/api/generate-qr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: instanceToken }),
      });

      if (!response.ok) {
        throw new Error(await parseError(response));
      }

      const data = await response.json();

      if (!data.qrCode) {
        throw new Error('QR Code não foi retornado');
      }

      setQrCode(data.qrCode);
      setQrStatus('QR Code gerado com sucesso!');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
      setQrStatus('');
    } finally {
      setLoadingAction(null);
    }
  };

  const handleCheckConnectionStatus = async () => {
    setError('');
    setStatusResult('');
    setStatusLoading(true);

    try {
      const response = await fetch('/api/check-connection-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, token: instanceToken, locationId, providerName }),
      });

      if (!response.ok) {
        throw new Error(await parseError(response));
      }

      const data = await response.json();
      const status = data?.data?.data ?? data?.data;
      const connected = Boolean(
        status?.connected ||
        status?.loggedIn ||
        status?.session?.connected ||
        status?.session?.loggedIn ||
        status?.data?.connected ||
        status?.data?.loggedIn,
      );

      setConnectionStatusChecked(true);
      setStatusConnected(connected);
      setStatusResult(
        connected
          ? `Instância conectada com sucesso.${data?.webhookSent ? ' Webhook enviado com locationId.' : ''}`
          : 'A instância ainda não está conectada. Se já escaneou o QR Code, tente novamente em alguns segundos.',
      );

      if (connected && !data?.webhookSent) {
        setStatusResult(
          data?.webhookError
            ? `Instância conectada com sucesso, mas o webhook falhou: ${data.webhookError}`
            : 'Instância conectada com sucesso, mas o webhook não foi enviado.',
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setStatusLoading(false);
    }
  };

  const resetForm = () => {
    setName('');
    setToken('');
    setProviderName('');
    setQrCode('');
    setError('');
    setCreationResult('');
    setConnectionResult('');
    setQrStatus('');
    setStatusResult('');
    setStatusConnected(false);
    setStatusLoading(false);
    setLocationId('');
    setInstanceToken('');
    setInstanceCreated(false);
    setInstanceConnected(false);
    setConnectionStatusChecked(false);
    setLoadingAction(null);
  };

  return (
    <main className="min-h-screen bg-[#262626] flex items-center justify-center p-4">
      <div className="bg-black p-10 rounded-2xl shadow-2xl w-full max-w-[420px] text-center border border-[#333]">
        <h1 className="text-white text-2xl font-bold mb-8">
          Conectar Instância (QR Code)
        </h1>

        <form onSubmit={(e) => e.preventDefault()} className="space-y-6">
          <div className="text-left">
            <label className="block text-white text-sm font-semibold mb-2">
              Nome do Provider
            </label>
            <input
              type="text"
              value={providerName}
              onChange={(e) => setProviderName(e.target.value)}
              placeholder="Ex: MyProvider"
              required
              className="w-full p-3.5 bg-[#1a1a1a] border-2 border-[#333] rounded-lg text-white placeholder-gray-600 focus:border-[#e89d2c] focus:outline-none focus:ring-2 focus:ring-[#e89d2c]/15 transition-all"
            />
          </div>
          <div className="text-left">
            <label className="block text-white text-sm font-semibold mb-2">
              Nome da Instância
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(sanitizeInput(e.target.value))}
              placeholder="Ex: Cliente1"
              required
              className="w-full p-3.5 bg-[#1a1a1a] border-2 border-[#333] rounded-lg text-white placeholder-gray-600 focus:border-[#e89d2c] focus:outline-none focus:ring-2 focus:ring-[#e89d2c]/15 transition-all"
            />
          </div>

          <div className="text-left">
            <label className="block text-white text-sm font-semibold mb-2">
              Token da Instância
            </label>
            <input
              type="text"
              value={token}
              onChange={(e) => setToken(sanitizeInput(e.target.value))}
              placeholder="Ex: token123abc"
              required
              className="w-full p-3.5 bg-[#1a1a1a] border-2 border-[#333] rounded-lg text-white placeholder-gray-600 focus:border-[#e89d2c] focus:outline-none focus:ring-2 focus:ring-[#e89d2c]/15 transition-all"
            />
          </div>

          <div className="text-left">
            <label className="block text-white text-sm font-semibold mb-2">
              locationId
            </label>
            <input
              type="text"
              value={locationId}
              onChange={(e) => setLocationId(e.target.value)}
              placeholder="Ex: 12345"
              required
              className="w-full p-3.5 bg-[#1a1a1a] border-2 border-[#333] rounded-lg text-white placeholder-gray-600 focus:border-[#e89d2c] focus:outline-none focus:ring-2 focus:ring-[#e89d2c]/15 transition-all"
            />
          </div>

          <button
            type="button"
            onClick={handleCreateInstance}
            disabled={loadingAction !== null || !name || !token}
            className="w-full py-4 bg-[#e89d2c] text-black font-bold rounded-lg hover:bg-[#c78523] disabled:bg-[#555] disabled:text-[#888] disabled:cursor-not-allowed transition-all hover:translate-y-[-2px] hover:shadow-lg shadow-[#e89d2c]/20"
          >
            {loadingAction === 'create' ? 'Criando...' : 'Criar Instância'}
          </button>
        </form>

        {creationResult && (
          <div className="mt-6 text-emerald-400 text-sm font-medium">
            {creationResult}
          </div>
        )}

        {instanceCreated && !instanceConnected && (
          <button
            type="button"
            onClick={handleConnectInstance}
            disabled={loadingAction !== null || !instanceToken}
            className="mt-6 w-full py-4 bg-[#1f8bff] text-white font-bold rounded-lg hover:bg-[#1572d6] disabled:bg-[#555] disabled:text-[#888] disabled:cursor-not-allowed transition-all hover:translate-y-[-2px] hover:shadow-lg shadow-[#1f8bff]/20"
          >
            {loadingAction === 'connect' ? 'Conectando...' : 'Conectar Instância'}
          </button>
        )}

        {connectionResult && (
          <div className="mt-6 text-emerald-400 text-sm font-medium">
            {connectionResult}
          </div>
        )}

        {instanceConnected && !qrCode && (
          <button
            type="button"
            onClick={handleGenerateQRCode}
            disabled={loadingAction !== null || !instanceToken}
            className="mt-6 w-full py-4 bg-[#7c3aed] text-white font-bold rounded-lg hover:bg-[#6d28d9] disabled:bg-[#555] disabled:text-[#888] disabled:cursor-not-allowed transition-all hover:translate-y-[-2px] hover:shadow-lg shadow-[#7c3aed]/20"
          >
            {loadingAction === 'qr' ? 'Gerando QR Code...' : 'Gerar QR Code'}
          </button>
        )}

        {qrCode && !connectionStatusChecked && (
          <div className="mt-8 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4 text-left">
            <p className="text-emerald-300 text-sm font-semibold">
              QR Code pronto. Depois de escanear, confira o status da conexão abaixo.
            </p>
          </div>
        )}

        {qrCode && !connectionStatusChecked && (
          <button
            type="button"
            onClick={handleCheckConnectionStatus}
            disabled={loadingAction !== null || statusLoading || !instanceToken || !locationId}
            className="mt-6 w-full py-4 bg-[#0f766e] text-white font-bold rounded-lg hover:bg-[#115e59] disabled:bg-[#555] disabled:text-[#888] disabled:cursor-not-allowed transition-all hover:translate-y-[-2px] hover:shadow-lg shadow-[#0f766e]/20"
          >
            {statusLoading ? 'Verificando status...' : 'Conferir Status da Conexão'}
          </button>
        )}

        {loadingAction && (
          <div className="mt-8">
            <div className="w-6 h-6 border-2 border-white/10 border-l-[#e89d2c] rounded-full animate-spin mx-auto mb-3" />
            <p className="text-gray-400 text-sm font-medium">
              {loadingAction === 'create' && 'Criando instância...'}
              {loadingAction === 'connect' && 'Conectando instância...'}
              {loadingAction === 'qr' && 'Aguardando QR Code...'}
            </p>
          </div>
        )}

        {statusLoading && (
          <div className="mt-8">
            <div className="w-6 h-6 border-2 border-white/10 border-l-[#0f766e] rounded-full animate-spin mx-auto mb-3" />
            <p className="text-gray-400 text-sm font-medium">Consultando status da conexão...</p>
          </div>
        )}

        {qrStatus && (
          <div className="mt-6 text-emerald-400 text-sm font-medium">
            {qrStatus}
          </div>
        )}

        {statusResult && (
          <div className={`mt-6 text-sm font-medium ${statusConnected ? 'text-emerald-400' : 'text-amber-300'}`}>
            {statusResult}
          </div>
        )}

        {error && (
          <div className="mt-6 text-red-500 text-sm font-medium">
            {error}
          </div>
        )}

        {qrCode && (
          <div className="mt-8 pt-8 border-t border-[#333]">
            <h2 className="text-white text-lg font-semibold mb-4">Leia o QR Code</h2>
            <div className="bg-white p-4 rounded-lg inline-block border border-[#333]">
              <Image
                src={getQrImageSrc(qrCode)}
                alt="QR Code WhatsApp"
                width={250}
                height={250}
                className="rounded-lg"
              />
            </div>
            <p className="text-gray-400 text-xs mt-4 leading-relaxed">
              Abra o WhatsApp no seu celular, vá em <strong>Aparelhos Conectados</strong> &gt; <strong>Vincular um aparelho</strong> e escaneie o QR Code acima.
            </p>
            <button
              onClick={resetForm}
              className="mt-6 w-full py-4 bg-[#444] text-white font-bold rounded-lg hover:bg-[#555] transition-all"
            >
              Nova Conexão
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
