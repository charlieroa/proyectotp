import React, { useState } from "react";
import { Row, Col, Alert, Card, CardBody, Container, FormFeedback, Input, Label, Form, Spinner } from "reactstrap";
import { Link, useParams, useNavigate } from "react-router-dom";
import * as Yup from "yup";
import { useFormik } from "formik";
import { api } from "../../services/api";
import ParticlesAuth from "../AuthenticationInner/ParticlesAuth";

const ResetPassword = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const validation = useFormik({
    initialValues: { password: '', confirmPassword: '' },
    validationSchema: Yup.object({
      password: Yup.string()
        .min(6, "Mínimo 6 caracteres")
        .required("Ingresa tu nueva contraseña"),
      confirmPassword: Yup.string()
        .oneOf([Yup.ref('password')], "Las contraseñas no coinciden")
        .required("Confirma tu contraseña"),
    }),
    onSubmit: async (values) => {
      setLoading(true);
      setError(null);
      try {
        const { data } = await api.post('/auth/reset-password', {
          token,
          password: values.password,
        });
        setSuccess(data.message || "Contraseña actualizada correctamente.");
        setTimeout(() => navigate('/login'), 3000);
      } catch (err: any) {
        setError(err?.response?.data?.error || "Error al restablecer la contraseña.");
      } finally {
        setLoading(false);
      }
    }
  });

  document.title = "Restablecer Contraseña | Tupelukeria";

  return (
    <ParticlesAuth>
      <div className="auth-page-content">
        <Container>
          <Row>
            <Col lg={12}>
              <div className="text-center mt-sm-5 mb-4 text-white-50">
                <h1 className="text-white fw-bold" style={{ fontSize: '2rem' }}>Tupelukeria</h1>
                <p className="mt-2 fs-15 fw-medium">Gestión de salones de belleza</p>
              </div>
            </Col>
          </Row>

          <Row className="justify-content-center">
            <Col md={8} lg={6} xl={5}>
              <Card className="mt-4">
                <CardBody className="p-4">
                  <div className="text-center mt-2">
                    <h5 className="text-primary">Restablecer Contraseña</h5>
                    <p className="text-muted">Ingresa tu nueva contraseña</p>
                    <i className="ri-lock-password-line display-5 text-primary mb-3"></i>
                  </div>

                  <div className="p-2">
                    {error && <Alert color="danger" className="mt-3">{error}</Alert>}
                    {success && (
                      <Alert color="success" className="mt-3">
                        {success} Serás redirigido al login...
                      </Alert>
                    )}

                    {!success && (
                      <Form onSubmit={(e) => { e.preventDefault(); validation.handleSubmit(); }}>
                        <div className="mb-3">
                          <Label className="form-label">Nueva Contraseña</Label>
                          <Input
                            name="password"
                            type="password"
                            placeholder="Mínimo 6 caracteres"
                            onChange={validation.handleChange}
                            onBlur={validation.handleBlur}
                            value={validation.values.password || ""}
                            invalid={!!(validation.touched.password && validation.errors.password)}
                          />
                          {validation.touched.password && validation.errors.password && (
                            <FormFeedback type="invalid"><div>{validation.errors.password}</div></FormFeedback>
                          )}
                        </div>

                        <div className="mb-3">
                          <Label className="form-label">Confirmar Contraseña</Label>
                          <Input
                            name="confirmPassword"
                            type="password"
                            placeholder="Repite la contraseña"
                            onChange={validation.handleChange}
                            onBlur={validation.handleBlur}
                            value={validation.values.confirmPassword || ""}
                            invalid={!!(validation.touched.confirmPassword && validation.errors.confirmPassword)}
                          />
                          {validation.touched.confirmPassword && validation.errors.confirmPassword && (
                            <FormFeedback type="invalid"><div>{validation.errors.confirmPassword}</div></FormFeedback>
                          )}
                        </div>

                        <div className="text-center mt-4">
                          <button className="btn btn-success w-100" type="submit" disabled={loading}>
                            {loading ? <Spinner size="sm" /> : "Restablecer Contraseña"}
                          </button>
                        </div>
                      </Form>
                    )}
                  </div>
                </CardBody>
              </Card>

              <div className="mt-4 text-center">
                <p className="mb-0 text-white">
                  <Link to="/login" className="fw-semibold text-white text-decoration-underline">
                    Volver al inicio de sesión
                  </Link>
                </p>
              </div>
            </Col>
          </Row>
        </Container>
      </div>
    </ParticlesAuth>
  );
};

export default ResetPassword;
