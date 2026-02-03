import 'package:flutkit/full_apps/other/fitness/controllers/reset_password_controller.dart';
import 'package:flutkit/helpers/theme/app_theme.dart';
import 'package:flutkit/helpers/widgets/my_button.dart';
import 'package:flutkit/helpers/widgets/my_spacing.dart';
import 'package:flutkit/helpers/widgets/my_text.dart';
import 'package:flutkit/helpers/widgets/my_text_style.dart';
import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:flutter_lucide/flutter_lucide.dart';

class ResetPasswordScreen extends StatefulWidget {
  const ResetPasswordScreen({super.key});

  @override
  _ResetPasswordScreenState createState() => _ResetPasswordScreenState();
}

class _ResetPasswordScreenState extends State<ResetPasswordScreen> {
  late ThemeData theme;
  late CustomTheme customTheme;

  late ResetPasswordController controller;
  late OutlineInputBorder outlineInputBorder;

  @override
  void initState() {
    super.initState();
    theme = AppTheme.theme;
    customTheme = AppTheme.customTheme;

    controller = ResetPasswordController();
    outlineInputBorder = OutlineInputBorder(
      borderRadius: BorderRadius.all(Radius.circular(4)),
      borderSide: BorderSide(
        color: Colors.transparent,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return GetBuilder<ResetPasswordController>(
        init: controller,
        tag: 'reset_password_controller',
        builder: (controller) {
          return Scaffold(
            body: Padding(
              padding: MySpacing.fromLTRB(
                  20, MySpacing.safeAreaTop(context) + 20, 20, 20),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  MyText.displaySmall(
                    'Reset \nPassword',
                    fontWeight: 700,
                  ),
                  MySpacing.height(20),
                  Form(
                    key: controller.formKey,
                    child: Column(
                      children: [
                        TextFormField(
                          style: MyTextStyle.bodyMedium(),
                          decoration: InputDecoration(
                              floatingLabelBehavior:
                                  FloatingLabelBehavior.never,
                              filled: true,
                              isDense: true,
                              fillColor: customTheme.card,
                              prefixIcon: Icon(
                                LucideIcons.lock,
                                color: theme.colorScheme.onSurface,
                              ),
                              hintText: "Password",
                              enabledBorder: outlineInputBorder,
                              focusedBorder: outlineInputBorder,
                              border: outlineInputBorder,
                              contentPadding: MySpacing.all(16),
                              hintStyle: MyTextStyle.bodyMedium(),
                              isCollapsed: true),
                          maxLines: 1,
                          controller: controller.passwordTE,
                          validator: controller.validatePassword,
                          cursorColor: theme.colorScheme.onSurface,
                        ),
                        MySpacing.height(20),
                        TextFormField(
                          style: MyTextStyle.bodyMedium(),
                          decoration: InputDecoration(
                              floatingLabelBehavior:
                                  FloatingLabelBehavior.never,
                              filled: true,
                              isDense: true,
                              fillColor: customTheme.card,
                              prefixIcon: Icon(
                                LucideIcons.lock,
                                color: theme.colorScheme.onSurface,
                              ),
                              hintText: "Confirm Password",
                              enabledBorder: outlineInputBorder,
                              focusedBorder: outlineInputBorder,
                              border: outlineInputBorder,
                              contentPadding: MySpacing.all(16),
                              hintStyle: MyTextStyle.bodyMedium(),
                              isCollapsed: true),
                          maxLines: 1,
                          controller: controller.confirmPasswordTE,
                          validator: controller.validateConfirmPassword,
                          cursorColor: theme.colorScheme.onSurface,
                        ),
                      ],
                    ),
                  ),
                  MySpacing.height(40),
                  MyButton.block(
                    onPressed: () {
                      controller.resetPassword();
                    },
                    backgroundColor: customTheme.fitnessPrimary,
                    splashColor: customTheme.fitnessOnPrimary.withAlpha(40),
                    elevation: 0,
                    borderRadiusAll: 4,
                    child: MyText.bodyMedium(
                      'Submit',
                      color: customTheme.fitnessOnPrimary,
                      fontWeight: 600,
                    ),
                  ),
                  MySpacing.height(20),
                ],
              ),
            ),
          );
        });
  }
}
