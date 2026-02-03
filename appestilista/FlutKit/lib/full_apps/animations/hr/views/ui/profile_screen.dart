import 'dart:io';

import 'package:flutkit/full_apps/animations/hr/controller/ui/profile_controller.dart';
import 'package:flutkit/helpers/theme/app_theme.dart';
import 'package:flutkit/helpers/widgets/my_button.dart';
import 'package:flutkit/helpers/widgets/my_container.dart';
import 'package:flutkit/helpers/widgets/my_spacing.dart';
import 'package:flutkit/helpers/widgets/my_text.dart';

import 'package:flutkit/images.dart';
import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:image_picker/image_picker.dart';
import 'package:flutter_lucide/flutter_lucide.dart';

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  late ThemeData theme;
  late ProfileController controller;

  @override
  void initState() {
    theme = AppTheme.employeeCommunication;
    controller = ProfileController();
    super.initState();
  }

  @override
  Widget build(BuildContext context) {
    return GetBuilder<ProfileController>(
      tag: 'profile_controller',
      init: controller,
      builder: (controller) {
        return SafeArea(
          child: Scaffold(
            body: Padding(
              padding: MySpacing.fromLTRB(16, 28, 16, 12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Center(child: buildProfileImage()),
                  MySpacing.height(16),
                  buildProfileDetailContainer(
                    LucideIcons.circle_user,
                    'Nasir Undid',
                  ),
                  MySpacing.height(16),
                  buildProfileDetailContainer(
                    LucideIcons.mail,
                    'nasirundid@gmail.com',
                  ),
                  MySpacing.height(16),
                  buildProfileDetailContainer(
                    LucideIcons.lock,
                    '**********',
                  ),
                  MySpacing.height(16),
                  buildProfileDetailContainer(
                    LucideIcons.map_pin,
                    'Nasir Undid',
                  ),
                  MySpacing.height(16),
                  buildProfileDetailContainer(
                    LucideIcons.phone_call,
                    '+91 234567890',
                  ),
                  MySpacing.height(16),
                  buildProfileDetailContainer(
                    Icons.male_outlined,
                    'Male ',
                  ),
                  MySpacing.height(16),
                  MyButton.block(
                      onPressed: () {
                        controller.logOut();
                      },
                      elevation: 0,
                      padding: MySpacing.y(20),
                      borderRadiusAll: 8,
                      backgroundColor: theme.colorScheme.primary,
                      child: MyText.bodyLarge(
                        "Log out",
                        color: theme.colorScheme.onPrimary,
                        fontWeight: 600,
                      ))
                ],
              ),
            ),
          ),
        );
      },
    );
  }

  Widget buildProfileImage() {
    return Stack(
      clipBehavior: Clip.antiAliasWithSaveLayer,
      children: <Widget>[
        MyContainer.rounded(
          onTap: () async {
            controller.imageFile = await controller.picker.pickImage(
              source: ImageSource.gallery,
            );
            setState(() {});
          },
          paddingAll: 0,
          width: 100,
          height: 100,
          clipBehavior: Clip.antiAliasWithSaveLayer,
          child: controller.imageFile == null
              ? Image.asset(Images.hrAvatars[5])
              : Image.file(
                  File(controller.imageFile!.path),
                  fit: BoxFit.cover,
                ),
        ),
      ],
    );
  }

  Widget buildProfileDetailContainer(IconData icons, String name) {
    return MyContainer(
      borderRadiusAll: 8,
      child: Row(
        children: [
          Icon(
            icons,
            size: 18,
          ),
          MySpacing.width(12),
          Expanded(
              child: MyText.bodyMedium(
            name,
            fontSize: 16,
            fontWeight: 600,
          )),
        ],
      ),
    );
  }
}
