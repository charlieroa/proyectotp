import React, { useState, useEffect } from 'react';
import {
  Row, Col, Card, CardBody, Button, Input, InputGroup, InputGroupText,
  Spinner, Alert, Badge
} from 'reactstrap';
import { api } from '../../services/api';

const GlobalSettings: React.FC = () => {
  const [openaiApiKey, setOpenaiApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [hasExistingKey, setHasExistingKey] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadSettings = async () => {
    try {
      const res = await api.get('/super-admin/settings');
      const key = res.data.openai_api_key;
      if (key) {
        setOpenaiApiKey(key);
        setHasExistingKey(true);
      }
    } catch (err) {
      console.error('Error loading settings:', err);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleSave = async () => {
    if (!openaiApiKey.trim() || openaiApiKey.startsWith('****')) {
      setErrorMsg('Ingresa una API Key válida.');
      setTimeout(() => setErrorMsg(null), 3000);
      return;
    }

    setSaving(true);
    try {
      await api.put('/super-admin/settings', { openai_api_key: openaiApiKey.trim() });
      setSuccessMsg('API Key guardada correctamente.');
      setHasExistingKey(true);
      setOpenaiApiKey('****' + openaiApiKey.slice(-4));
      setShowKey(false);
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err) {
      setErrorMsg('No se pudo guardar la API Key.');
      setTimeout(() => setErrorMsg(null), 3000);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Row>
      <Col lg={8} xl={6}>
        {successMsg && <Alert color="success">{successMsg}</Alert>}
        {errorMsg && <Alert color="danger">{errorMsg}</Alert>}

        <Card className="border shadow-sm">
          <CardBody>
            <div className="d-flex align-items-center gap-3 mb-4">
              <div
                className="d-flex align-items-center justify-content-center rounded-3"
                style={{
                  width: 48,
                  height: 48,
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                }}
              >
                <i className="ri-key-2-line fs-20 text-white"></i>
              </div>
              <div className="flex-grow-1">
                <h5 className="mb-1">OpenAI API Key Global</h5>
                <p className="text-muted mb-0 small">
                  Esta clave se usa para todos los salones
                </p>
              </div>
              {hasExistingKey && (
                <Badge color="success" pill className="d-flex align-items-center gap-1">
                  <i className="ri-check-line"></i> Configurada
                </Badge>
              )}
            </div>

            <div className="mb-3">
              <InputGroup>
                <Input
                  type={showKey ? 'text' : 'password'}
                  value={openaiApiKey}
                  onChange={(e) => {
                    setOpenaiApiKey(e.target.value);
                    setHasExistingKey(false);
                  }}
                  placeholder="sk-proj-..."
                />
                <InputGroupText style={{ cursor: 'pointer' }} onClick={() => setShowKey(!showKey)}>
                  <i className={showKey ? 'ri-eye-off-line' : 'ri-eye-line'}></i>
                </InputGroupText>
              </InputGroup>
            </div>

            <div className="d-flex align-items-center gap-2">
              <Button
                color="primary"
                onClick={handleSave}
                disabled={saving || openaiApiKey.startsWith('****')}
                style={{
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  border: 'none',
                }}
              >
                {saving ? (
                  <>
                    <Spinner size="sm" className="me-2" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <i className="ri-save-line me-1"></i>
                    Guardar API Key
                  </>
                )}
              </Button>
              {hasExistingKey && (
                <Button
                  color="link"
                  size="sm"
                  className="text-muted p-0"
                  onClick={() => {
                    setOpenaiApiKey('');
                    setHasExistingKey(false);
                  }}
                >
                  Cambiar key
                </Button>
              )}
            </div>

            <div className="mt-3 pt-3 border-top">
              <small className="text-muted">
                <i className="ri-information-line me-1"></i>
                Esta clave es compartida por todos los salones.
                Se almacena en la base de datos con un cache de 5 minutos.
              </small>
            </div>
          </CardBody>
        </Card>
      </Col>
    </Row>
  );
};

export default GlobalSettings;
