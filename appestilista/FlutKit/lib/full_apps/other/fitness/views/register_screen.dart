import 'package:flutkit/full_apps/other/fitness/controllers/register_controller.dart';
import 'package:flutkit/helpers/theme/app_theme.dart';
import 'package:flutkit/helpers/widgets/my_button.dart';
import 'package:flutkit/helpers/widgets/my_spacing.dart';
import 'package:flutkit/helpers/widgets/my_text.dart';
import 'package:flutkit/helpers/widgets/my_text_style.dart';
import 'package:flutkit/images.dart';
import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:flutter_lucide/flutter_lucide.dart';

class RegisterScreen extends StatefulWidget {
  const RegisterScreen({super.key});

  @override
  _RegisterScreenState createState() => _RegisterScreenState();
}

class _RegisterScreenState extends State<RegisterScreen> {
  late ThemeData theme;
  late CustomTheme customTheme;

  late RegisterController controller;
  late OutlineInputBorder outlineInputBorder;

  @override
  void initState() {
    super.initState();
    theme = AppTheme.theme;
    customTheme = AppTheme.customTheme;

    controller = RegisterController();
    outlineInputBorder = OutlineInputBorder(
      borderRadius: BorderRadius.all(Radius.circular(4)),
      borderSide: BorderSide(
        color: Colors.transparent,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return GetBuilder<RegisterController>(
        init: controller,
        tag: 'register_controller',
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
                    'Sign up',
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
                                LucideIcons.user,
                                color: theme.colorScheme.onSurface,
                              ),
                              hintText: "Name",
                              enabledBorder: outlineInputBorder,
                              focusedBorder: outlineInputBorder,
                              border: outlineInputBorder,
                              contentPadding: MySpacing.all(16),
                              hintStyle: MyTextStyle.bodyMedium(),
                              isCollapsed: true),
                          maxLines: 1,
                          controller: controller.nameTE,
                          validator: controller.validateName,
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
                                LucideIcons.mail,
                                color: theme.colorScheme.onSurface,
                              ),
                              hintText: "Email Address",
                              enabledBorder: outlineInputBorder,
                              focusedBorder: outlineInputBorder,
                              border: outlineInputBorder,
                              contentPadding: MySpacing.all(16),
                              hintStyle: MyTextStyle.bodyMedium(),
                              isCollapsed: true),
                          maxLines: 1,
                          controller: controller.emailTE,
                          validator: controller.validateEmail,
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
                      ],
                    ),
                  ),
                  MySpacing.height(24),
                  Row(
                    children: [
                      MyText.bodySmall(
                        'By Signing up, you\'re agree to our ',
                        fontSize: 11,
                      ),
                      MyText.bodySmall(
                        'Terms & Conditions',
                        color: customTheme.fitnessPrimary,
                        fontSize: 11,
                      ),
                    ],
                  ),
                  MySpacing.height(24),
                  Row(
                    children: [
                      MyButton(
                          padding: MySpacing.xy(16, 20),
                          onPressed: () {
                            controller.register();
                          },
                          backgroundColor: customTheme.card,
                          splashColor:
                              theme.colorScheme.onSurface.withAlpha(40),
                          elevation: 0,
                          borderRadiusAll: 4,
                          child: Row(
                            children: [
                              Image(
                                image: AssetImage(Images.google),
                                height: 17,
                                width: 17,
                              ),
                              MySpacing.width(20),
                              MyText.labelMedium(
                                'Login with Google',
                                fontWeight: 600,
                                color: theme.colorScheme.onSurface,
                              ),
                            ],
                          )),
                      MySpacing.width(20),
                      Expanded(
                        child: MyButton(
                          padding: MySpacing.y(20),
                          onPressed: () {
                            controller.register();
                          },
                          backgroundColor: customTheme.fitnessPrimary,
                          elevation: 0,
                          borderRadiusAll: 4,
                          child: MyText.bodyMedium(
                            'Continue',
                            color: customTheme.fitnessOnPrimary,
                            fontWeight: 600,
                          ),
                        ),
                      ),
                    ],
                  ),
                  MySpacing.height(20),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      MyText.bodySmall(
                        'Joined us before? ',
                      ),
                      InkWell(
                          onTap: () {
                            controller.goToLogInScreen();
                          },
                          child: MyText.bodySmall(
                            'LogIn',
                            color: customTheme.fitnessPrimary,
                          )),
                    ],
                  ),
                ],
              ),
            ),
          );
        });
  }
}
