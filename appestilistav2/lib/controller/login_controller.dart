import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:get/get.dart';
import '../services/api_service.dart';

class LoginController extends GetxController {
  TextEditingController emailController = TextEditingController();
  TextEditingController passwordController = TextEditingController();
  final loginFormKey = GlobalKey<FormState>();
  final RxBool isValid = false.obs;
  RxBool isPasswordVisible = false.obs;
  RxBool isLoading = false.obs;

  @override
  void onInit() {
    super.onInit();
    emailController.addListener(() {
      isValid.value =
          emailController.text.isNotEmpty && passwordController.text.isNotEmpty;
    });

    passwordController.addListener(() {
      isValid.value =
          emailController.text.isNotEmpty && passwordController.text.isNotEmpty;
    });
  }

  void togglePasswordVisibility() {
    isPasswordVisible.toggle();
  }

  Future<bool> login() async {
    isLoading.value = true;
    try {
      final response = await ApiService.login(
        emailController.text.trim(),
        passwordController.text,
      );
      
      // El token ya se guardó en ApiService.login
      isLoading.value = false;
      return true;
    } catch (e) {
      isLoading.value = false;
      String errorMessage = 'Error al iniciar sesión';
      
      final errorString = e.toString();
      print('❌ Error en login: $errorString');
      
      if (errorString.contains('Error de conexión') || 
          errorString.contains('Tiempo de espera') ||
          errorString.contains('timeout')) {
        errorMessage = 'No se pudo conectar al servidor. Verifica que esté corriendo en http://localhost:3005';
      } else if (errorString.contains('Credenciales inválidas') || 
                 errorString.contains('401')) {
        errorMessage = 'Email o contraseña incorrectos';
      } else if (errorString.contains('no es un estilista')) {
        errorMessage = 'Este usuario no es un estilista. Solo los estilistas pueden usar esta app.';
      } else if (errorString.contains('Error en login')) {
        final match = RegExp(r'Error en login:\s*(.+)').firstMatch(errorString);
        errorMessage = match?.group(1) ?? 'Error al iniciar sesión';
      } else {
        errorMessage = errorString.replaceAll('Exception: ', '').replaceAll('Error: ', '');
        if (errorMessage.length > 100) {
          errorMessage = errorMessage.substring(0, 100) + '...';
        }
      }
      
      // Mostrar snackbar con mejor visibilidad
      Get.snackbar(
        'Error',
        errorMessage,
        snackPosition: SnackPosition.BOTTOM,
        duration: const Duration(seconds: 5),
        backgroundColor: Colors.red,
        colorText: Colors.white,
        margin: const EdgeInsets.all(16),
        borderRadius: 8,
        isDismissible: true,
        dismissDirection: DismissDirection.horizontal,
        forwardAnimationCurve: Curves.easeOutBack,
      );
      
      // También imprimir en consola para debugging
      print('🔴 Error mostrado al usuario: $errorMessage');
      return false;
    }
  }

  @override
  void dispose() {
    emailController.dispose();
    passwordController.dispose();
    super.dispose();
  }
}
