import 'package:flutkit/full_apps/animations/hr/views/auth/login_screen.dart';
import 'package:get/get.dart';
import 'package:image_picker/image_picker.dart';

class ProfileController extends GetxController {
  final ImagePicker picker = ImagePicker();

  XFile? imageFile;

  void logOut() {
    Get.off(LoginScreen());
  }
}
