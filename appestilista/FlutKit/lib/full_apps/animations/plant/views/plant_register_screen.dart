import 'package:flutkit/full_apps/animations/plant/controller/plant_register_controller.dart';

import 'package:flutkit/helpers/theme/app_theme.dart';
import 'package:flutkit/helpers/widgets/my_button.dart';
import 'package:flutkit/helpers/widgets/my_container.dart';
import 'package:flutkit/helpers/widgets/my_spacing.dart';
import 'package:flutkit/helpers/widgets/my_text.dart';
import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:flutter_lucide/flutter_lucide.dart';

class PlantRegisterScreen extends StatefulWidget {
  const PlantRegisterScreen({super.key});

  @override
  State<PlantRegisterScreen> createState() => _PlantRegisterScreenState();
}

class _PlantRegisterScreenState extends State<PlantRegisterScreen>
    with TickerProviderStateMixin {
  late PlantRegisterController controller;
  late OutlineInputBorder outlineInputBorder;

  @override
  void initState() {
    controller = PlantRegisterController(this);
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
      tag: 'plant_register_controller',
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
                    'Register Account',
                    fontWeight: 600,
                    fontSize: 24,
                  ),
                  MySpacing.height(20),
                  SlideTransition(
                    position: controller.nameAnimation,
                    child: TextFormField(
                      validator: controller.validateName,
                      clipBehavior: Clip.antiAliasWithSaveLayer,
                      controller: controller.nameTE,
                      decoration: InputDecoration(
                        contentPadding: MySpacing.xy(12, 16),
                        hintText: 'Name',
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
                      keyboardType: TextInputType.name,
                    ),
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
                  SlideTransition(
                    position: controller.passwordAnimation,
                    child: TextFormField(
                      validator: controller.validatePassword,
                      clipBehavior: Clip.antiAliasWithSaveLayer,
                      controller: controller.passwordTE,
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
                  MySpacing.height(20),
                  buildCreateAccountButton(),
                  Center(
                    child: MyButton.text(
                      onPressed: () {
                        controller.goToLogInScreen();
                      },
                      child: MyText.bodyLarge(
                        "Already Have an Account",
                        fontSize: 16,
                        fontWeight: 600,
                      ),
                    ),
                  ),

                ],
              )),
        ),
      ),
    );
  }

  Widget buildCreateAccountButton() {
    return MyButton.block(
      elevation: 0,
      borderRadiusAll: 8,
      padding: MySpacing.y(18),
      backgroundColor: Colors.green.shade600,
      onPressed: () {
        controller.register();
      },
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          MyText.labelLarge(
            "Create Account",
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
