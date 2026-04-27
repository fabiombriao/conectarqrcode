'use client';

import { useState } from 'react';
import Image from 'next/image';

export default function Home() {
  const [name, setName] = useState('');
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState('');
  const [qrCode, setQrCode] = useState('');
  const [error, setError] = useState('');

  const sanitizeInput = (value: string) => {
    return value.replace(/[^a-zA-Z0-9]/g, '');
  };

  const getQrImageSrc = (value: string) => {
    return value.startsWith('data:image/') ? value : `data:image/png;base64,${value}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setQrCode('');
    setLoading(true);

    try {
      setStep('Criando instância...');

      const response = await fetch('/api/create-instance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, token }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Erro ao processar');
      }

      setStep('Gerando QR Code...');
      const data = await response.json();

      if (data.qrCode) {
        setQrCode(data.qrCode);
        setStep('QR Code gerado com sucesso!');
      } else {
        throw new Error('QR Code não foi retornado');
      }

      // Acionar webhook do N8N
      await fetch('https://dinastia-n8n-webhook.rphhuc.easypanel.host/webhook/criar_instancia_qrcode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, token, status: 'completed' }),
      });

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setName('');
    setToken('');
    setQrCode('');
    setError('');
    setStep('');
  };

  return (
    <main className="min-h-screen bg-[#262626] flex items-center justify-center p-4">
      <div className="bg-black p-10 rounded-2xl shadow-2xl w-full max-w-[420px] text-center border border-[#333]">
        <h1 className="text-white text-2xl font-bold mb-8">
          Conectar Instância (QR Code)
        </h1>

        {!qrCode && (
          <form onSubmit={handleSubmit} className="space-y-6">
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

            <button
              type="submit"
              disabled={loading || !name || !token}
              className="w-full py-4 bg-[#e89d2c] text-black font-bold rounded-lg hover:bg-[#c78523] disabled:bg-[#555] disabled:text-[#888] disabled:cursor-not-allowed transition-all hover:translate-y-[-2px] hover:shadow-lg shadow-[#e89d2c]/20"
            >
              {loading ? 'Processando...' : 'Conectar Instância'}
            </button>
          </form>
        )}

        {loading && (
          <div className="mt-8">
            <div className="w-6 h-6 border-2 border-white/10 border-l-[#e89d2c] rounded-full animate-spin mx-auto mb-3" />
            <p className="text-gray-400 text-sm font-medium">{step}</p>
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
