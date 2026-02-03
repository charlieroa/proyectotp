import 'package:flutter/cupertino.dart';
import 'package:get/get.dart';

class AddressController extends GetxController {
  TextEditingController nameController = TextEditingController();
  TextEditingController emailController = TextEditingController();
  TextEditingController pinCodeController = TextEditingController();
  TextEditingController stateController = TextEditingController();
  TextEditingController cityController = TextEditingController();
  TextEditingController houseAddressController = TextEditingController();
  TextEditingController roadAreaController = TextEditingController();
  TextEditingController landMarkController = TextEditingController();
  RxBool showShadow = false.obs;
  final addressFormKey = GlobalKey<FormState>();
  RxInt val = 0.obs;
  final RxBool isValid = false.obs;
  final RxBool isTap = false.obs;
  final RxBool isWorkTap = false.obs;
  final RxBool isOfficeTap = false.obs;
  var selectedAddress = ''.obs;
  void updateShowShadow(bool value) {
    showShadow.value = value;
  }

  @override
  void onInit() {
    super.onInit();
    nameController.addListener(() {
      isValid.value = emailController.text.isNotEmpty &&
          pinCodeController.text.isNotEmpty &&
          stateController.text.isNotEmpty &&
          cityController.text.isNotEmpty &&
          houseAddressController.text.isNotEmpty &&
          roadAreaController.text.isNotEmpty &&
          roadAreaController.text.isNotEmpty &&
          landMarkController.text.isNotEmpty;
    });
    emailController.addListener(() {
      isValid.value = nameController.text.isNotEmpty &&
          pinCodeController.text.isNotEmpty &&
          stateController.text.isNotEmpty &&
          cityController.text.isNotEmpty &&
          houseAddressController.text.isNotEmpty &&
          roadAreaController.text.isNotEmpty &&
          roadAreaController.text.isNotEmpty &&
          landMarkController.text.isNotEmpty;
    });
    pinCodeController.addListener(() {
      isValid.value = nameController.text.isNotEmpty &&
          emailController.text.isNotEmpty &&
          stateController.text.isNotEmpty &&
          cityController.text.isNotEmpty &&
          houseAddressController.text.isNotEmpty &&
          roadAreaController.text.isNotEmpty &&
          roadAreaController.text.isNotEmpty &&
          landMarkController.text.isNotEmpty;
    });
    stateController.addListener(() {
      isValid.value = nameController.text.isNotEmpty &&
          emailController.text.isNotEmpty &&
          pinCodeController.text.isNotEmpty &&
          cityController.text.isNotEmpty &&
          houseAddressController.text.isNotEmpty &&
          roadAreaController.text.isNotEmpty &&
          roadAreaController.text.isNotEmpty &&
          landMarkController.text.isNotEmpty;
    });
    cityController.addListener(() {
      isValid.value = nameController.text.isNotEmpty &&
          emailController.text.isNotEmpty &&
          pinCodeController.text.isNotEmpty &&
          stateController.text.isNotEmpty &&
          houseAddressController.text.isNotEmpty &&
          roadAreaController.text.isNotEmpty &&
          roadAreaController.text.isNotEmpty &&
          landMarkController.text.isNotEmpty;
    });
    houseAddressController.addListener(() {
      isValid.value = nameController.text.isNotEmpty &&
          emailController.text.isNotEmpty &&
          pinCodeController.text.isNotEmpty &&
          stateController.text.isNotEmpty &&
          cityController.text.isNotEmpty &&
          roadAreaController.text.isNotEmpty &&
          roadAreaController.text.isNotEmpty &&
          landMarkController.text.isNotEmpty;
    });
    roadAreaController.addListener(() {
      isValid.value = nameController.text.isNotEmpty &&
          emailController.text.isNotEmpty &&
          pinCodeController.text.isNotEmpty &&
          stateController.text.isNotEmpty &&
          cityController.text.isNotEmpty &&
          houseAddressController.text.isNotEmpty &&
          roadAreaController.text.isNotEmpty &&
          landMarkController.text.isNotEmpty;
    });
    landMarkController.addListener(() {
      isValid.value = nameController.text.isNotEmpty &&
          emailController.text.isNotEmpty &&
          pinCodeController.text.isNotEmpty &&
          stateController.text.isNotEmpty &&
          cityController.text.isNotEmpty &&
          houseAddressController.text.isNotEmpty &&
          roadAreaController.text.isNotEmpty &&
          roadAreaController.text.isNotEmpty;
    });
    isValid.value = false;
  }

  void setAddress(String addressType) {
    selectedAddress.value = addressType;
  }

  @override
  void dispose() {
    nameController.dispose();
    emailController.dispose();
    pinCodeController.dispose();
    stateController.dispose();
    cityController.dispose();
    houseAddressController.dispose();
    roadAreaController.dispose();
    landMarkController.dispose();
    super.dispose();
  }
}
