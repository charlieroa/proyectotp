import 'package:flutkit/full_apps/animations/hr/controller/ui/chat_controller.dart';
import 'package:flutkit/full_apps/animations/hr/controller/ui/employee_detail_controller.dart';
import 'package:flutkit/full_apps/animations/hr/model/employee_detail.dart';
import 'package:flutkit/full_apps/animations/hr/views/ui/chat_screen.dart';
import 'package:flutkit/helpers/theme/app_theme.dart';
import 'package:flutkit/helpers/widgets/my_container.dart';
import 'package:flutkit/helpers/widgets/my_spacing.dart';
import 'package:flutkit/helpers/widgets/my_text.dart';
import 'package:flutkit/images.dart';
import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:flutter_lucide/flutter_lucide.dart';

class EmployeeDetailScreen extends StatefulWidget {
  const EmployeeDetailScreen({super.key});

  @override
  State<EmployeeDetailScreen> createState() => _EmployeeDetailScreenState();
}

class _EmployeeDetailScreenState extends State<EmployeeDetailScreen> {
  late ThemeData theme;
  EmployeeDetailController employeeDetailController =
      Get.put(EmployeeDetailController());

  EmployeeChatController employeeChatController =
      Get.put(EmployeeChatController());

  @override
  void initState() {
    theme = AppTheme.employeeCommunication;
    super.initState();
  }

  @override
  Widget build(BuildContext context) {
    return GetBuilder<EmployeeDetailController>(
      init: EmployeeDetailController(),
      builder: (controller) {
        EmployeeDetailModel data = controller.employeeDetailModelData!;
        return SafeArea(
          child: Scaffold(
            body: SingleChildScrollView(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  SizedBox(
                    height: 140,
                    width: double.infinity,
                    child: Stack(
                      children: [
                        MyContainer(
                          height: 112,
                          paddingAll: 0,
                          marginAll: 0,
                          color: theme.colorScheme.primary,
                          enableBorderRadius: true,
                          borderRadiusAll: 0,
                        ),
                        Positioned(
                          top: 16,
                          left: 4,
                          child: Row(
                            children: [
                              IconButton(
                                onPressed: () => Navigator.of(context).pop(),
                                icon: Icon(LucideIcons.move_left,
                                    color: theme.colorScheme.onPrimary),
                              ),
                              MyText.titleLarge(
                                "Employee Detail",
                                fontWeight: 600,
                                color: theme.colorScheme.onPrimary,
                              ),
                            ],
                          ),
                        ),
                        Positioned(
                          bottom: 0,
                          left: 12,
                          right: 12,
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Row(
                                children: [
                                  MyContainer.rounded(
                                    paddingAll: 2,
                                    child: MyContainer.rounded(
                                      paddingAll: 0,
                                      height: 60,
                                      width: 60,
                                      clipBehavior: Clip.antiAliasWithSaveLayer,
                                      child: Image.asset(
                                        Images.hrAvatars[0],
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
                                        color: theme.colorScheme.onPrimary,
                                      ),
                                      MySpacing.height(8),
                                      MyText.bodyMedium(
                                        data.role,
                                        fontWeight: 600,
                                      ),
                                    ],
                                  ),
                                ],
                              ),
                              MySpacing.width(12),
                              Expanded(
                                child: Row(
                                  mainAxisAlignment: MainAxisAlignment.end,
                                  children: [
                                    MyContainer.rounded(
                                        onTap: () {},
                                        paddingAll: 4,
                                        child: Icon(
                                          LucideIcons.phone_call,
                                          size: 20,
                                        )),
                                    MySpacing.width(12),
                                    MyContainer.rounded(
                                        onTap: () {
                                          employeeChatController
                                              .employeeChatModelData = data;
                                          employeeChatController.update();
                                          Get.to(EmployeeChatScreen());
                                        },
                                        paddingAll: 4,
                                        child: Icon(
                                          LucideIcons.message_circle,
                                          size: 20,
                                        )),
                                  ],
                                ),
                              )
                            ],
                          ),
                        )
                      ],
                    ),
                  ),
                  Padding(
                    padding: MySpacing.fromLTRB(16, 16, 16, 0),
                    child: Column(
                      children: [
                        buildContactDetail(LucideIcons.mail, data.email),
                        MySpacing.height(12),
                        buildContactDetail(
                            LucideIcons.phone_call, "+91 ${data.contactNumber}"),
                        MySpacing.height(12),
                        Wrap(
                          runSpacing: 12,
                          spacing: 12,
                          children: [
                            buildDetail(
                              LucideIcons.calendar_range,
                              theme.colorScheme.error,
                              "DOB",
                              "${data.dob.day}-${data.dob.month}-${data.dob.year}",
                            ),
                            buildDetail(
                              LucideIcons.calendar_check,
                              CustomTheme.occur,
                              "Joining Date",
                              "${data.joiningDate.day}-${data.joiningDate.month}-${data.joiningDate.year}",
                            ),
                            buildDetail(
                              LucideIcons.circle_dollar_sign,
                              theme.colorScheme.primary,
                              "Salary",
                              "\$${data.salary}.00",
                            ),
                            buildDetail(
                              LucideIcons.clipboard_check,
                              CustomTheme.green,
                              "Total Task",
                              "${data.totalTask}",
                            ),
                          ],
                        )
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
        );
      },
    );
  }

  Widget buildDetail(IconData icon, Color color, String title, String name) {
    return MyContainer(
      width: MediaQuery.of(context).size.width / 2.3,
      height: 110,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Row(
            children: [
              MyContainer.rounded(
                paddingAll: 8,
                clipBehavior: Clip.antiAliasWithSaveLayer,
                color: color.withAlpha(36),
                child: Icon(
                  icon,
                  color: color,
                ),
              ),
              Spacer(),
              MyText.bodyLarge(
                title,
                fontWeight: 600,
              )
            ],
          ),
          MyText.bodyLarge(
            name,
            fontWeight: 600,
            color: color,
            muted: true,
          )
        ],
      ),
    );
  }

  Widget buildContactDetail(IconData icon, String description) {
    return MyContainer(
      borderRadiusAll: 8,
      child: Row(
        children: [
          Icon(
            icon,
            size: 16,
          ),
          MySpacing.width(12),
          MyText.bodyMedium(description, fontWeight: 600)
        ],
      ),
    );
  }
}
