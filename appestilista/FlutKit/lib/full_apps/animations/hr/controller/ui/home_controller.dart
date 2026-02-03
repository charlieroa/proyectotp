import 'package:flutkit/full_apps/animations/hr/hr_cache.dart';
import 'package:flutkit/full_apps/animations/hr/model/employee_detail.dart';
import 'package:flutkit/full_apps/animations/hr/views/ui/employee_screen.dart';
import 'package:flutkit/full_apps/animations/hr/views/ui/profile_screen.dart';
import 'package:get/get_state_manager/src/simple/get_controllers.dart';
import 'package:get/route_manager.dart';

class HomeController extends GetxController {
  List<EmployeeDetailModel> employeeList = [];
  List<EmployeeDetailModel> resentEmployeeList = [];

  var greeting = "Good Morning";
  late int currentTime = DateTime.now().hour;

  @override
  void onInit() {
    employeeList = EmployeeCommunicationCache.employeeDetails.sublist(5, 9);
    resentEmployeeList =
        EmployeeCommunicationCache.employeeDetails.sublist(0, 3);

    if ((currentTime < 6) || (currentTime > 21)) {
      greeting = 'Good Night';
    } else if (currentTime < 12) {
      greeting = 'Good Morning';
    } else if (currentTime < 18) {
      greeting = 'Good Afternoon';
    } else if (currentTime < 22) {
      greeting = 'Good Evening';
    }
    super.onInit();
  }

  void goToEmployee() {
    Get.to(EmployeeScreen());
  }

  void goToProfile() {
    Get.to(ProfileScreen());
  }
}
