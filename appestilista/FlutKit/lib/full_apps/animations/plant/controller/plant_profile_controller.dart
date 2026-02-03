import 'package:flutkit/full_apps/animations/plant/views/plant_login_screen.dart';
import 'package:flutkit/full_apps/animations/plant/views/plant_profile_edit_screen.dart';
import 'package:flutkit/full_apps/animations/plant/views/plant_support_screen.dart';
import 'package:get/get.dart';
import 'package:image_picker/image_picker.dart';

class PlantProfileController extends GetxController {
  final ImagePicker picker = ImagePicker();

  XFile? imageFile;

  void gotoLogout() {
    Get.off(PlantLoginScreen());
  }

  void gotoEditProfileScreen() {
    Get.to(PlantProfileEditScreen());
  }

  void gotoPlantSupportScreen() {
    Get.to(PlantSupportScreen());
  }
}
