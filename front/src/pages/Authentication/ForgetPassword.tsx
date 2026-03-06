import React from "react";
import { Row, Col, Alert, Card, CardBody, Container, FormFeedback, Input, Label, Form } from "reactstrap";
import { useSelector, useDispatch } from "react-redux";
import { Link } from "react-router-dom";
import * as Yup from "yup";
import { useFormik } from "formik";
import { userForgetPassword } from "../../slices/thunks";
import ParticlesAuth from "../AuthenticationInner/ParticlesAuth";
import { createSelector } from "reselect";

const ForgetPasswordPage = () => {
  const dispatch: any = useDispatch();

  const validation = useFormik({
    initialValues: { email: '' },
    validationSchema: Yup.object({
      email: Yup.string().email("Email inválido").required("Ingresa tu email"),
    }),
    onSubmit: (values) => {
      dispatch(userForgetPassword(values, null));
    }
  });

  const selectState = createSelector(
    (state: any) => state.ForgetPassword,
    (state: any) => ({
      forgetError: state.forgetError,
      forgetSuccessMsg: state.forgetSuccessMsg,
    })
  );
  const { forgetError, forgetSuccessMsg } = useSelector(selectState);

  document.title = "Recuperar Contraseña | Tupelukeria";

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
                    <h5 className="text-primary">¿Olvidaste tu contraseña?</h5>
                    <p className="text-muted">No te preocupes, te enviaremos un enlace para restablecerla</p>
                    <i className="ri-mail-send-line display-5 text-success mb-3"></i>
                  </div>

                  <div className="p-2">
                    {forgetError && (
                      <Alert color="danger" className="mt-3">{forgetError}</Alert>
                    )}
                    {forgetSuccessMsg && (
                      <Alert color="success" className="mt-3">{forgetSuccessMsg}</Alert>
                    )}
                    <Form onSubmit={(e) => { e.preventDefault(); validation.handleSubmit(); }}>
                      <div className="mb-4">
                        <Label className="form-label">Email</Label>
                        <Input
                          name="email"
                          className="form-control"
                          placeholder="Ingresa tu email"
                          type="email"
                          onChange={validation.handleChange}
                          onBlur={validation.handleBlur}
                          value={validation.values.email || ""}
                          invalid={!!(validation.touched.email && validation.errors.email)}
                        />
                        {validation.touched.email && validation.errors.email && (
                          <FormFeedback type="invalid"><div>{validation.errors.email}</div></FormFeedback>
                        )}
                      </div>

                      <div className="text-center mt-4">
                        <button className="btn btn-success w-100" type="submit">
                          Enviar enlace de recuperación
                        </button>
                      </div>
                    </Form>
                  </div>
                </CardBody>
              </Card>

              <div className="mt-4 text-center">
                <p className="mb-0 text-white">
                  ¿Recordaste tu contraseña?{" "}
                  <Link to="/login" className="fw-semibold text-white text-decoration-underline">
                    Iniciar sesión
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

export default ForgetPasswordPage;
