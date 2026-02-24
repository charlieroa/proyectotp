import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { MessageSquare, Wifi, WifiOff, QrCode, Upload, FileText } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import api from '@/lib/api';

interface Props {
  tenantId: string;
}

const GREETING_MAX = 500;

const GREETING_TEMPLATES = [
  { label: 'Bienvenida', text: 'Hola! Bienvenido/a a {negocio}. Soy tu asistente virtual. Como puedo ayudarte hoy?' },
  { label: 'Promocion', text: 'Hola! Tenemos promociones especiales esta semana. Preguntame por nuestros descuentos!' },
  { label: 'Horarios', text: 'Hola! Gracias por comunicarte. Nuestro horario es de Lunes a Sabado. Quieres agendar una cita?' },
];

export function WhatsAppTab({ tenantId }: Props) {
  const [loading, setLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [greetingMessage, setGreetingMessage] = useState('');
  const [savingGreeting, setSavingGreeting] = useState(false);
  const [brochureUrl, setBrochureUrl] = useState<string | null>(null);
  const [uploadingBrochure, setUploadingBrochure] = useState(false);

  const checkStatus = useCallback(async () => {
    try {
      const res = await api.get(`/whatsapp/status/${tenantId}`);
      const { status, qr } = res.data;
      setIsConnected(status === 'CONNECTED');
      setQrCode(status === 'QR_READY' ? qr : null);
    } catch {
      setIsConnected(false);
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    checkStatus();
    // Load greeting
    api.get(`/tenants/${tenantId}`).then((res) => {
      setGreetingMessage(res.data?.greeting_message ?? '');
      setBrochureUrl(res.data?.brochure_url ?? null);
    }).catch(() => {});
  }, [tenantId, checkStatus]);

  // Poll status while waiting for QR scan
  useEffect(() => {
    if (!qrCode) return;
    const interval = setInterval(checkStatus, 5000);
    return () => clearInterval(interval);
  }, [qrCode, checkStatus]);

  const handleDisconnect = async () => {
    try {
      await api.post('/whatsapp/disconnect', { tenantId });
      setIsConnected(false);
      setQrCode(null);
      toast.success('WhatsApp desconectado');
    } catch {
      toast.error('Error al desconectar');
    }
  };

  const handleSaveGreeting = async () => {
    setSavingGreeting(true);
    try {
      await api.put(`/tenants/${tenantId}`, { greeting_message: greetingMessage });
      toast.success('Mensaje de bienvenida guardado');
    } catch {
      toast.error('Error al guardar');
    } finally {
      setSavingGreeting(false);
    }
  };

  const handleBrochureUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingBrochure(true);
    try {
      const fd = new FormData();
      fd.append('brochure', file);
      const res = await api.post(`/tenants/${tenantId}/brochure`, fd);
      setBrochureUrl((res.data as Record<string, unknown>).brochure_url as string);
      toast.success('Brochure subido');
    } catch {
      toast.error('Error al subir brochure');
    } finally {
      setUploadingBrochure(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Connection status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Conexion WhatsApp
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {isConnected ? (
                <>
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100">
                    <Wifi className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="font-medium text-green-700">Conectado</p>
                    <p className="text-sm text-gray-500">Tu bot de WhatsApp esta activo</p>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
                    <WifiOff className="h-5 w-5 text-red-600" />
                  </div>
                  <div>
                    <p className="font-medium text-red-700">Desconectado</p>
                    <p className="text-sm text-gray-500">Escanea el codigo QR para conectar</p>
                  </div>
                </>
              )}
            </div>
            {isConnected && (
              <Button variant="danger" size="sm" onClick={handleDisconnect}>
                Desconectar
              </Button>
            )}
          </div>

          {/* QR Code */}
          {qrCode && !isConnected && (
            <div className="mt-6 flex justify-center">
              <div className="rounded-xl border-2 border-dashed border-gray-200 p-6 text-center">
                <QrCode className="mx-auto mb-3 h-8 w-8 text-gray-400" />
                <img src={qrCode} alt="QR Code" className="mx-auto h-48 w-48" />
                <p className="mt-3 text-sm text-gray-500">
                  Escanea con WhatsApp para conectar
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Greeting message */}
      <Card>
        <CardHeader>
          <CardTitle>Mensaje de Bienvenida</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {GREETING_TEMPLATES.map((tpl) => (
              <button
                key={tpl.label}
                onClick={() => setGreetingMessage(tpl.text)}
                className="rounded-full border border-gray-200 px-3 py-1 text-xs text-gray-600 hover:bg-gray-50"
              >
                {tpl.label}
              </button>
            ))}
          </div>
          <Textarea
            value={greetingMessage}
            onChange={(e) => setGreetingMessage(e.target.value.slice(0, GREETING_MAX))}
            rows={4}
            placeholder="Escribe tu mensaje de bienvenida..."
          />
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400">
              {greetingMessage.length}/{GREETING_MAX}
            </span>
            <Button size="sm" onClick={handleSaveGreeting} loading={savingGreeting}>
              Guardar Mensaje
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Brochure */}
      <Card>
        <CardHeader>
          <CardTitle>Brochure / Carta de Servicios</CardTitle>
        </CardHeader>
        <CardContent>
          {brochureUrl ? (
            <div className="flex items-center gap-3 rounded-lg border p-3">
              <FileText className="h-8 w-8 text-primary-400" />
              <div className="flex-1">
                <p className="text-sm font-medium">Brochure cargado</p>
                <a href={brochureUrl} target="_blank" rel="noreferrer" className="text-xs text-primary-600 hover:underline">
                  Ver archivo
                </a>
              </div>
              <Badge variant="success">Activo</Badge>
            </div>
          ) : (
            <p className="text-sm text-gray-500">No hay brochure cargado</p>
          )}
          <label className="mt-3 inline-flex cursor-pointer items-center gap-2">
            <input
              type="file"
              accept=".pdf,.png,.jpg,.jpeg"
              onChange={handleBrochureUpload}
              className="hidden"
            />
            <Button variant="secondary" size="sm" loading={uploadingBrochure}>
              <Upload className="h-4 w-4" />
              {brochureUrl ? 'Cambiar' : 'Subir'} Brochure
            </Button>
          </label>
        </CardContent>
      </Card>
    </div>
  );
}
