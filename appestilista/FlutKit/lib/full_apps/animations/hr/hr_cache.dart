import 'package:flutkit/full_apps/animations/hr/model/employee_detail.dart';
import 'package:flutkit/full_apps/animations/hr/model/hire_data.dart';

class EmployeeCommunicationCache {
  static List<EmployeeDetailModel> employeeDetails = [];
  static List<HireDataModel> hireData = [];

  static Future<void> initDummy() async {
    EmployeeCommunicationCache.employeeDetails =
        await EmployeeDetailModel.getDummyList();
  }
}
