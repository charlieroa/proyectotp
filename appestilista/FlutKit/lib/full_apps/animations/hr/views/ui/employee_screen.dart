import 'package:flutkit/full_apps/animations/hr/controller/ui/employee_controller.dart';
import 'package:flutkit/helpers/theme/app_theme.dart';
import 'package:flutkit/helpers/widgets/my_container.dart';
import 'package:flutkit/helpers/widgets/my_spacing.dart';
import 'package:flutkit/helpers/widgets/my_text.dart';
import 'package:flutkit/helpers/widgets/my_text_style.dart';
import 'package:flutkit/images.dart';
import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:flutter_lucide/flutter_lucide.dart';

import 'package:flutkit/full_apps/animations/hr/controller/ui/employee_detail_controller.dart';
import 'package:flutkit/full_apps/animations/hr/model/employee_detail.dart';
import 'package:flutkit/full_apps/animations/hr/views/ui/employee_detail_screen.dart';

class EmployeeScreen extends StatefulWidget {
  const EmployeeScreen({super.key});

  @override
  State<EmployeeScreen> createState() => _EmployeeScreenState();
}

class _EmployeeScreenState extends State<EmployeeScreen> {
  late ThemeData theme;
  late EmployeeController controller;
  EmployeeDetailController employeeDetailController =
      Get.put(EmployeeDetailController());

  @override
  void initState() {
    theme = AppTheme.employeeCommunication;
    controller = EmployeeController();
    super.initState();
  }

  @override
  Widget build(BuildContext context) {
    return GetBuilder<EmployeeController>(
      tag: 'employee_screen',
      init: controller,
      builder: (controller) {
        return Scaffold(
          floatingActionButton: FloatingActionButton(
            backgroundColor: theme.colorScheme.primary,
            clipBehavior: Clip.antiAliasWithSaveLayer,
            splashColor: theme.colorScheme.primary,
            focusColor: theme.colorScheme.primary,
            hoverColor: theme.colorScheme.primary,
            elevation: 0,
            mini: true,
            onPressed: () {
              controller.goToEmployeeAddScreen();
            },
            child: Icon(LucideIcons.plus),
          ),
          body: SafeArea(
            child: Padding(
              padding: MySpacing.fromLTRB(16, 28, 16, 16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      IconButton(
                        onPressed: () => Navigator.of(context).pop(),
                        icon: Icon(LucideIcons.move_left),
                      ),
                      MyText.titleLarge("Employee", fontWeight: 600),
                    ],
                  ),
                  MySpacing.height(20),
                  TextField(
                    controller: controller.searchController,
                    onChanged: controller.searchEmployeeList,
                    decoration: InputDecoration(
                        filled: true,
                        hintText: "Search people",
                        hintStyle: MyTextStyle.bodyMedium(fontWeight: 600),
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(8),
                          borderSide: BorderSide.none,
                        ),
                        suffixIcon: IconButton(
                          onPressed: () {
                            controller.clearSearch();
                          },
                          icon: Icon(Icons.clear),
                        ),
                        prefixIcon: Icon(LucideIcons.search, size: 20),
                        contentPadding: MySpacing.xy(12, 12)),
                  ),
                  MySpacing.height(16),
                  Expanded(
                    child: controller.searchEmployee.isNotEmpty
                        ? ListView.separated(
                            shrinkWrap: true,
                            primary: true,
                            itemCount: controller.searchEmployee.length,
                            itemBuilder: (context, index) {
                              EmployeeDetailModel data =
                                  controller.searchEmployee[index];
                              return MyContainer(
                                onTap: () {
                                  employeeDetailController
                                      .employeeDetailModelData = data;
                                  employeeDetailController.update();
                                  Get.to(EmployeeDetailScreen());
                                },
                                borderRadiusAll: 8,
                                child: Row(
                                  children: [
                                    MyContainer.roundBordered(
                                      paddingAll: 3,
                                      child: MyContainer.rounded(
                                        height: 50,
                                        width: 50,
                                        clipBehavior:
                                            Clip.antiAliasWithSaveLayer,
                                        paddingAll: 0,
                                        child: Image.asset(
                                          Images.hrAvatars[
                                              index % Images.hrAvatars.length],
                                          fit: BoxFit.cover,
                                        ),
                                      ),
                                    ),
                                    MySpacing.width(12),
                                    Column(
                                      crossAxisAlignment:
                                          CrossAxisAlignment.start,
                                      children: [
                                        MyText.bodyLarge(
                                          data.name,
                                          fontWeight: 600,
                                        ),
                                        MySpacing.height(4),
                                        MyText.bodyMedium(
                                          data.role,
                                          fontWeight: 600,
                                        ),
                                      ],
                                    )
                                  ],
                                ),
                              );
                            },
                            separatorBuilder: (context, index) {
                              return SizedBox(
                                height: 20,
                              );
                            },
                          )
                        : Center(
                            child: MyText.bodyLarge(
                              '"${controller.searchController.text}" Search result not found',
                              fontWeight: 600,
                              textAlign: TextAlign.center,
                            ),
                          ),
                  )
                ],
              ),
            ),
          ),
        );
      },
    );
  }
}
