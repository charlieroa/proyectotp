import 'package:flutkit/full_apps/animations/plant/controller/plant_forgot_password_controller.dart';

import 'package:flutkit/helpers/theme/app_theme.dart';
import 'package:flutkit/helpers/widgets/my_button.dart';
import 'package:flutkit/helpers/widgets/my_container.dart';
import 'package:flutkit/helpers/widgets/my_spacing.dart';
import 'package:flutkit/helpers/widgets/my_text.dart';
import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:flutter_lucide/flutter_lucide.dart';

class PlantForgotPasswordScreen extends StatefulWidget {
  const PlantForgotPasswordScreen({super.key});

  @override
  State<PlantForgotPasswordScreen> createState() =>
      _PlantForgotPasswordScreenState();
}

class _PlantForgotPasswordScreenState extends State<PlantForgotPasswordScreen>
    with TickerProviderStateMixin {
  late PlantForGotPasswordController controller;
  late OutlineInputBorder outlineInputBorder;

  @override
  void initState() {
    controller = PlantForGotPasswordController(this);
    outlineInputBorder = OutlineInputBorder(
        borderRadius: BorderRadius.circular(8),
        borderSide: BorderSide(
          color: theme.dividerColor,
        ));
    super.initState();
  }

  @override
  Widget build(BuildContext context) {
    return GetBuilder(
      init: controller,
      tag: 'plant_forgot_password_controller',
      builder: (controller) {
        return Scaffold(
            body: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            buildBody(),
          ],
        ));
      },
    );
  }

  Widget buildBody() {
    return Padding(
      padding: MySpacing.x(12),
      child: SingleChildScrollView(
        child: MyContainer(
          paddingAll: 0,
          padding: MySpacing.xy(20, 14),
          borderRadiusAll: 12,
          color: theme.colorScheme.surface.withAlpha(120),
          child: Form(
            key: controller.formKey,
            child: Column(
              mainAxisAlignment: MainAxisAlignment.start,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                MyText.bodyLarge(
                  'Forgot Password',
                  fontWeight: 600,
                  fontSize: 24,
                ),
                MySpacing.height(20),
                SlideTransition(
                  position: controller.emailAnimation,
                  child: TextFormField(
                    clipBehavior: Clip.antiAliasWithSaveLayer,
                    controller: controller.emailTE,
                    validator: controller.validateEmail,
                    decoration: InputDecoration(
                      contentPadding: MySpacing.xy(12, 16),
                      hintText: 'Email Address',
                      border: outlineInputBorder,
                      enabledBorder: outlineInputBorder,
                      errorBorder: outlineInputBorder,
                      focusedErrorBorder: outlineInputBorder,
                      focusedBorder: outlineInputBorder,
                      disabledBorder: outlineInputBorder,
                      floatingLabelBehavior: FloatingLabelBehavior.never,
                      filled: true,
                      isDense: true,
                    ),
                    keyboardType: TextInputType.emailAddress,
                  ),
                ),
                MySpacing.height(20),
                buildSubmitButton(),
                Center(
                  child: MyButton.text(
                    child: MyText.bodyLarge(
                      'Back To LogIn',
                      fontSize: 16,
                      fontWeight: 600,
                    ),
                    onPressed: () {
                      controller.gotoLoginScreen();
                    },
                  ),
                ),

              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget buildSubmitButton() {
    return MyButton.block(
      elevation: 0,
      borderRadiusAll: 8,
      padding: MySpacing.y(20),
      onPressed: () {
        controller.goToResetPasswordScreen();
      },
      backgroundColor: Colors.green.shade600,
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          MyText.labelLarge(
            "Submit",
            fontWeight: 600,
            color: AppTheme.plantTheme.colorScheme.surface,
            letterSpacing: 0.4,
          ),
          MySpacing.width(8),
          SlideTransition(
              position: controller.arrowAnimation,
              child: Icon(
                LucideIcons.arrow_right,
                color: AppTheme.plantTheme.colorScheme.surface,
                size: 20,
              )),
        ],
      ),
    );
  }
}
