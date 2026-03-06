import { userForgetPasswordSuccess, userForgetPasswordError } from "./reducer";
import { api } from "../../../services/api";

export const userForgetPassword = (user: any, history: any) => async (dispatch: any) => {
  try {
    const { data } = await api.post('/auth/forgot-password', { email: user.email });
    dispatch(userForgetPasswordSuccess(data.message || "Se ha enviado un enlace a tu correo."));
  } catch (error: any) {
    const msg = error?.response?.data?.error || "Error al procesar la solicitud.";
    dispatch(userForgetPasswordError(msg));
  }
};
