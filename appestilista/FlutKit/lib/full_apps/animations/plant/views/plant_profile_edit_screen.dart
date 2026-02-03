import 'package:flutkit/full_apps/animations/plant/controller/plant_profile_edit_controller.dart';

import 'package:flutkit/helpers/theme/app_theme.dart';
import 'package:flutkit/helpers/widgets/my_button.dart';
import 'package:flutkit/helpers/widgets/my_spacing.dart';
import 'package:flutkit/helpers/widgets/my_text.dart';
import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:flutter_lucide/flutter_lucide.dart';

class PlantProfileEditScreen extends StatefulWidget {
  const PlantProfileEditScreen({super.key});

  @override
  State<PlantProfileEditScreen> createState() => _PlantProfileEditScreenState();
}

class _PlantProfileEditScreenState extends State<PlantProfileEditScreen>
    with TickerProviderStateMixin {
  late PlantProfileEditController controller;
  late OutlineInputBorder outlineInputBorder;

  @override
  void initState() {
    controller = PlantProfileEditController();
    outlineInputBorder = OutlineInputBorder(
      borderRadius: BorderRadius.all(
        Radius.circular(8),
      ),
    );
    super.initState();
  }

  @override
  Widget build(BuildContext context) {
    return GetBuilder<PlantProfileEditController>(
      init: controller,
      tag: 'plant_profile_edit_controller',
      builder: (controller) {
        return Scaffold(
          appBar: AppBar(
            elevation: 0,
            leading: IconButton(
              onPressed: () => Navigator.of(context).pop(),
              icon: Icon(LucideIcons.move_left),
            ),
            title: MyText.titleMedium(
              'Edit Profile',
              fontWeight: 600,
            ),
            centerTitle: true,
          ),
          body: Center(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.center,
              children: [
                Expanded(child: buildEditProfileFields()),
                Padding(
                  padding: MySpacing.xy(20, 50),
                  child: Column(
                    children: [buildSaveButton(), ],
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget buildEditProfileFields() {
    return Padding(
      padding: MySpacing.x(20),
      child: Column(
        children: [
          TextFormField(
            clipBehavior: Clip.antiAliasWithSaveLayer,
            controller: controller.nameTE,
            decoration: InputDecoration(
              contentPadding: MySpacing.xy(12, 16),
              fillColor: theme.colorScheme.surface,
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
          MySpacing.height(20),
          TextFormField(
            clipBehavior: Clip.antiAliasWithSaveLayer,
            controller: controller.emailTE,
            decoration: InputDecoration(
              contentPadding: MySpacing.xy(12, 16),
              fillColor: theme.colorScheme.surface,
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
          MySpacing.height(20),
          TextFormField(
            clipBehavior: Clip.antiAliasWithSaveLayer,
            controller: controller.passwordTE,
            decoration: InputDecoration(
              contentPadding: MySpacing.xy(12, 16),
              fillColor: theme.colorScheme.surface,
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
          MySpacing.height(20),
          TextFormField(
            clipBehavior: Clip.antiAliasWithSaveLayer,
            controller: controller.locationTE,
            decoration: InputDecoration(
              contentPadding: MySpacing.xy(12, 16),
              fillColor: theme.colorScheme.surface,
              hintText: 'Enter Address',
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
            keyboardType: TextInputType.streetAddress,
          ),
        ],
      ),
    );
  }

  Widget buildSaveButton() {
    return MyButton.block(
      elevation: 1,
      borderRadiusAll: 8,
      padding: MySpacing.y(20),
      backgroundColor: AppTheme.plantTheme.colorScheme.primary,
      onPressed: () => controller.gotoProfile(),
      child: MyText.bodyMedium(
        'Save',
        fontWeight: 600,
        fontSize: 16,
        color: AppTheme.plantTheme.colorScheme.surface,
      ),
    );
  }
}
