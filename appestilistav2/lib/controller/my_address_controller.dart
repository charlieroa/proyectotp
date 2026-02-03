import 'package:get/get.dart';
import 'package:home_helper_flutter_ui_kit/config/app_string.dart';


class MyAddressController extends GetxController {
  RxInt selectedContainerIndex = 0.obs;
  List<String> usersName = [
    AppString.janeCooper,
    AppString.dianneRussell,
    AppString.jacobJanes,
  ];

  List<String> addressLists = [
    AppString.address1,
    AppString.address2,
    AppString.address3,
  ];

  List<String> addressMobileNumbers = [
    AppString.addressMobile1,
    AppString.addressMobile2,
    AppString.addressMobile2,
  ];
}
