import 'package:flutkit/full_apps/animations/plant/controller/plant_login_controller.dart';

import 'package:flutkit/helpers/theme/app_theme.dart';
import 'package:flutkit/helpers/widgets/my_button.dart';
import 'package:flutkit/helpers/widgets/my_container.dart';
import 'package:flutkit/helpers/widgets/my_spacing.dart';
import 'package:flutkit/helpers/widgets/my_text.dart';
import 'package:flutkit/helpers/widgets/my_text_style.dart';
import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:flutter_lucide/flutter_lucide.dart';

class PlantLoginScreen extends StatefulWidget {
  const PlantLoginScreen({super.key});

  @override
  State<PlantLoginScreen> createState() => _PlantLoginScreenState();
}

class _PlantLoginScreenState extends State<PlantLoginScreen>
    with TickerProviderStateMixin {
  late PlantLoginController controller;
  late OutlineInputBorder outlineInputBorder;

  @override
  void initState() {
    controller = PlantLoginController(this);
    outlineInputBorder = OutlineInputBorder(
        borderRadius: BorderRadius.circular(8),
        borderSide: BorderSide(
          color: theme.dividerColor,
        ));
    super.initState();
  }

  @override
  Widget build(BuildContext context) {
    return GetBuilder<PlantLoginController>(
      init: controller,
      tag: 'plant_login_controller',
      builder: (controller) {
        return Scaffold(
          body: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              buildBody(),
            ],
          ),
        );
      },
    );
  }

  Widget buildBody() {
    return Padding(
      padding: MySpacing.x(12),
      child: SingleChildScrollView(
        child: MyContainer(
          paddingAll: 0,
          padding: MySpacing.xy(20, 12),
          borderRadiusAll: 12,
          color: theme.colorScheme.surface.withAlpha(120),
          child: Form(
            key: controller.formKey,
            child: Column(
              mainAxisAlignment: MainAxisAlignment.start,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                MyText.bodyLarge(
                  'Log In',
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
                      hintStyle: MyTextStyle.bodyMedium(),
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
                SlideTransition(
                  position: controller.passwordAnimation,
                  child: TextFormField(
                    clipBehavior: Clip.antiAliasWithSaveLayer,
                    controller: controller.passwordTE,
                    validator: controller.validatePassword,
                    autofocus: false,
                    decoration: InputDecoration(
                      contentPadding: MySpacing.xy(12, 16),
                      hintText: 'Password',
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
                    keyboardType: TextInputType.visiblePassword,
                  ),
                ),
                MySpacing.height(4),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    InkWell(
                      onTap: () =>
                          controller.onChangeCheckBox(controller.rememberBox),
                      child: Row(
                        children: [
                          Checkbox(
                            onChanged: controller.onChangeCheckBox,
                            value: controller.rememberBox,
                            materialTapTargetSize:
                                MaterialTapTargetSize.shrinkWrap,
                            visualDensity: VisualDensity(
                              horizontal: -4,
                            ),
                          ),
                          MySpacing.width(8),
                          MyText.bodyMedium(
                            "Remember Me",
                            fontWeight: 600,
                          ),
                        ],
                      ),
                    ),
                    MyButton.text(
                      backgroundColor:
                          AppTheme.plantTheme.colorScheme.surface,
                      onPressed: () {
                        controller.gotoForgotPasswordScreen();
                      },
                      child: MyText.bodyMedium(
                        "Forgot Password ?",
                        fontWeight: 600,
                      ),
                    ),
                  ],
                ),
                MySpacing.height(4),
                buildLoginButton(),
                Center(
                  child: MyButton.text(
                    backgroundColor: AppTheme.plantTheme.colorScheme.surface,
                    onPressed: () {
                      controller.gotoRegisterScreen();
                    },
                    child: MyText.bodyLarge(
                      "I Haven't Account",
                      fontSize: 16,
                      fontWeight: 600,
                    ),
                  ),
                ),

              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget buildLoginButton() {
    return MyButton.block(
      elevation: 0,
      borderRadiusAll: 8,
      padding: MySpacing.y(18),
      backgroundColor: AppTheme.plantTheme.colorScheme.primary,
      onPressed: () => controller.login(),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          MyText.labelLarge(
            "Sign In",
            fontWeight: 600,
            fontSize: 16,
            color: AppTheme.plantTheme.colorScheme.surface,
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
