import
'package:flutkit/full_apps/animations/hr/controller/ui/employee_add_controller.dart';
import 'package:flutkit/helpers/theme/app_theme.dart';
import 'package:flutkit/helpers/theme/constant.dart';
import 'package:flutkit/helpers/widgets/my_button.dart';
import 'package:flutkit/helpers/widgets/my_container.dart';
import 'package:flutkit/helpers/widgets/my_spacing.dart';
import 'package:flutkit/helpers/widgets/my_text.dart';
import 'package:flutkit/helpers/widgets/my_text_style.dart';
import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:flutter_lucide/flutter_lucide.dart';

class EmployeeAddScreen extends StatefulWidget {
  const EmployeeAddScreen({super.key});

  @override
  State<EmployeeAddScreen> createState() => _EmployeeAddScreenState();
}

class _EmployeeAddScreenState extends State<EmployeeAddScreen> {
  late ThemeData theme;
  late EmployeeAddController controller;
  late OutlineInputBorder outlineInputBorder;

  @override
  void initState() {
    theme = AppTheme.employeeCommunication;
    controller = EmployeeAddController();
    outlineInputBorder = OutlineInputBorder(
      borderRadius:
      BorderRadius.all(Radius.circular(Constant.buttonRadius.small)),
      borderSide: BorderSide(
        color: Colors.transparent,
      ),
    );
    super.initState();
  }

  @override
  Widget build(BuildContext context) {
    return GetBuilder<EmployeeAddController>(
      tag: 'employee_add_screen',
      init: controller,
      builder: (controller) {
        return SafeArea(
          child: Scaffold(
            body: Padding(
              padding: MySpacing.all(16),
              child: SingleChildScrollView(
                physics: AlwaysScrollableScrollPhysics(),
                child: Form(
                  key: controller.formKey,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      MyText.titleLarge("Add Employee", fontWeight: 600),
                      MySpacing.height(16),
                      buildName(),
                      MySpacing.height(12),
                      buildEmail(),
                      MySpacing.height(12),
                      buildContactNumber(),
                      MySpacing.height(12),
                      buildEmployeeRole(),
                      MySpacing.height(12),
                      buildSelectDate(),
                      MySpacing.height(12),
                      buildSalary(),
                      MySpacing.height(12),
                      buildTotalTask(),
                      MySpacing.height(16),
                      sendDataBtn()
                    ],
                  ),
                ),
              ),
            ),
          ),
        );
      },
    );
  }

  Widget sendDataBtn() {
    return MyButton.block(
      onPressed: () {
        controller.sendData();
      },
      borderRadiusAll: Constant.buttonRadius.small,
      elevation: 0,
      padding: MySpacing.y(20),
      backgroundColor: theme.colorScheme.primary,
      child: MyText.labelLarge(
        "Send Data",
        fontWeight: 700,
        color: theme.colorScheme.onPrimary,
      ),
    );
  }

  Widget buildName() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        MyText.bodyMedium(
          "Enter Name",
          fontWeight: 600,
        ),
        MySpacing.height(4),
        TextFormField(
          style: MyTextStyle.bodyMedium(),
          keyboardType: TextInputType.name,
          decoration: InputDecoration(
              floatingLabelBehavior: FloatingLabelBehavior.never,
              isDense: true,
              filled: true,
              fillColor: theme.cardTheme.color,
              hintText: "Enter Name",
              enabledBorder: outlineInputBorder,
              focusedBorder: outlineInputBorder,
              border: outlineInputBorder,
              prefixIcon: Icon(LucideIcons.user),
              contentPadding: MySpacing.all(16),
              hintStyle: MyTextStyle.bodySmall(xMuted: true),
              isCollapsed: true),
          maxLines: 1,
          controller: controller.nameTe,
          validator: controller.validName,
          cursorColor: theme.colorScheme.primary,
        )
      ],
    );
  }

  Widget buildEmail() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        MyText.bodyMedium(
          "Enter Email",
          fontWeight: 600,
        ),
        MySpacing.height(4),
        TextFormField(
          keyboardType: TextInputType.emailAddress,
          style: MyTextStyle.bodyMedium(),
          decoration: InputDecoration(
              floatingLabelBehavior: FloatingLabelBehavior.never,
              isDense: true,
              filled: true,
              fillColor: theme.cardTheme.color,
              hintText: "Enter Email",
              enabledBorder: outlineInputBorder,
              focusedBorder: outlineInputBorder,
              border: outlineInputBorder,
              prefixIcon: Icon(LucideIcons.mail),
              contentPadding: MySpacing.all(16),
              hintStyle: MyTextStyle.bodySmall(xMuted: true),
              isCollapsed: true),
          maxLines: 1,
          controller: controller.emailTe,
          validator: controller.validateEmail,
          cursorColor: theme.colorScheme.primary,
        )
      ],
    );
  }

  Widget buildContactNumber() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        MyText.bodyMedium(
          "Enter Contact Number",
          fontWeight: 600,
        ),
        MySpacing.height(4),
        TextFormField(
          keyboardType: TextInputType.phone,
          style: MyTextStyle.bodyMedium(),
          decoration: InputDecoration(
              floatingLabelBehavior: FloatingLabelBehavior.never,
              isDense: true,
              filled: true,
              fillColor: theme.cardTheme.color,
              hintText: "Enter Contact Number",
              enabledBorder: outlineInputBorder,
              focusedBorder: outlineInputBorder,
              border: outlineInputBorder,
              prefixIcon: Icon(LucideIcons.phone_call),
              contentPadding: MySpacing.all(16),
              hintStyle: MyTextStyle.bodySmall(xMuted: true),
              isCollapsed: true),
          maxLines: 1,
          controller: controller.contactNumberTe,
          validator: controller.validContactNumber,
          cursorColor: theme.colorScheme.primary,
        )
      ],
    );
  }

  Widget buildEmployeeRole() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        MyText.bodyMedium(
          "Enter Employee Role",
          fontWeight: 600,
        ),
        MySpacing.height(4),
        TextFormField(
          keyboardType: TextInputType.text,
          style: MyTextStyle.bodyMedium(),
          decoration: InputDecoration(
              floatingLabelBehavior: FloatingLabelBehavior.never,
              isDense: true,
              filled: true,
              fillColor: theme.cardTheme.color,
              hintText: "Enter Employee Role",
              enabledBorder: outlineInputBorder,
              focusedBorder: outlineInputBorder,
              border: outlineInputBorder,
              prefixIcon: Icon(LucideIcons.book_open),
              contentPadding: MySpacing.all(16),
              hintStyle: MyTextStyle.bodySmall(xMuted: true),
              isCollapsed: true),
          maxLines: 1,
          controller: controller.roleTe,
          validator: controller.validRole,
          cursorColor: theme.colorScheme.primary,
        )
      ],
    );
  }

  Widget buildSelectDate() {
    return Wrap(
      runSpacing: 12,
      spacing: 12,
      crossAxisAlignment: WrapCrossAlignment.start,
      clipBehavior: Clip.antiAliasWithSaveLayer,
      alignment: WrapAlignment.start,
      runAlignment: WrapAlignment.spaceBetween,
      children: [
        Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            MyText.bodyMedium(
              "Enter DOB",
              fontWeight: 600,
            ),
            MySpacing.height(4),
            InkWell(
              onTap: () => controller.dobPickDate(),
              child: MyContainer(
                width: MediaQuery
                    .of(context)
                    .size
                    .width / 2.3,
                child: Row(
                  children: [
                    Icon(
                      LucideIcons.calendar,
                      size: 16,
                    ),
                    MySpacing.width(8),
                    MyText.labelMedium(
                      controller.dobDate != null
                          ? "${controller.dobDate?.day}-${controller.dobDate
                          ?.month}-${controller.dobDate?.year}"
                          : "Select DOB",
                      fontWeight: 600,
                    ),
                  ],
                ),
              ),
            )
          ],
        ),
        Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            MyText.bodyMedium(
              "Enter Joining Date",
              fontWeight: 600,
            ),
            MySpacing.height(4),
            MyContainer(
              width: MediaQuery
                  .of(context)
                  .size
                  .width / 2.3,
              onTap: () => controller.joiningDate(),
              child: Row(
                children: [
                  Icon(
                    LucideIcons.calendar,
                    size: 16,
                  ),
                  MySpacing.width(8),
                  MyText.labelMedium(
                    controller.joining != null
                        ? "${controller.joining?.day}-${controller.joining
                        ?.month}-${controller.joining?.year}"
                        : "Select Joining Date",
                    fontWeight: 600,
                  ),
                ],
              ),
            )
          ],
        )
      ],
    );
  }

  Widget buildSalary() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        MyText.bodyMedium(
          "Enter Salary",
          fontWeight: 600,
        ),
        MySpacing.height(4),
        TextFormField(
          keyboardType: TextInputType.number,
          style: MyTextStyle.bodyMedium(),
          decoration: InputDecoration(
              floatingLabelBehavior: FloatingLabelBehavior.never,
              isDense: true,
              filled: true,
              fillColor: theme.cardTheme.color,
              hintText: "Enter Salary",
              enabledBorder: outlineInputBorder,
              focusedBorder: outlineInputBorder,
              border: outlineInputBorder,
              prefixIcon: Icon(LucideIcons.book_open),
              contentPadding: MySpacing.all(16),
              hintStyle: MyTextStyle.bodySmall(xMuted: true),
              isCollapsed: true),
          maxLines: 1,
          controller: controller.salaryTe,
          validator: controller.validSalary,
          cursorColor: theme.colorScheme.primary,
        )
      ],
    );
  }

  Widget buildTotalTask() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        MyText.bodyMedium(
          "Enter Total Task",
          fontWeight: 600,
        ),
        MySpacing.height(4),
        TextFormField(
          keyboardType: TextInputType.number,
          style: MyTextStyle.bodyMedium(),
          decoration: InputDecoration(
              floatingLabelBehavior: FloatingLabelBehavior.never,
              isDense: true,
              filled: true,
              fillColor: theme.cardTheme.color,
              hintText: "Enter Total Task",
              enabledBorder: outlineInputBorder,
              focusedBorder: outlineInputBorder,
              border: outlineInputBorder,
              prefixIcon: Icon(LucideIcons.book_open),
              contentPadding: MySpacing.all(16),
              hintStyle: MyTextStyle.bodySmall(xMuted: true),
              isCollapsed: true),
          maxLines: 1,
          controller: controller.totalTaskTe,
          validator: controller.validTotalTask,
          cursorColor: theme.colorScheme.primary,
        )
      ],
    );
  }
}
