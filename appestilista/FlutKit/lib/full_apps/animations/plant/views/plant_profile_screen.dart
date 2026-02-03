import 'dart:io';

import 'package:flutkit/full_apps/animations/plant/controller/plant_profile_controller.dart';

import 'package:flutkit/helpers/utils/my_shadow.dart';
import 'package:flutkit/helpers/widgets/my_card.dart';
import 'package:flutkit/helpers/widgets/my_container.dart';
import 'package:flutkit/helpers/widgets/my_spacing.dart';
import 'package:flutkit/helpers/widgets/my_text.dart';
import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:image_picker/image_picker.dart';
import 'package:flutter_lucide/flutter_lucide.dart';

class PlantProfileScreen extends StatefulWidget {
  const PlantProfileScreen({super.key});

  @override
  State<PlantProfileScreen> createState() => _PlantProfileScreenState();
}

class _PlantProfileScreenState extends State<PlantProfileScreen>
    with TickerProviderStateMixin {
  late PlantProfileController controller;
  @override
  void initState() {
    controller = PlantProfileController();
    super.initState();
  }

  @override
  Widget build(BuildContext context) {
    return GetBuilder<PlantProfileController>(
      init: controller,
      tag: 'plant_profile_controller',
      builder: (controller) {
        return Scaffold(
          appBar: AppBar(
            elevation: 0,
            title: MyText.titleMedium(
              'Profile',
              fontWeight: 600,
            ),
            automaticallyImplyLeading: false,
            clipBehavior: Clip.antiAliasWithSaveLayer,
            centerTitle: true,
          ),
          body: Column(
            children: [
              buildProfileImage(),
              MySpacing.height(12),
              MyText.titleMedium(
                'Nasir Undid',
                fontWeight: 600,
                fontSize: 20,
                muted: true,
              ),
              MySpacing.height(20),
              buildProfileDetails(),
            ],
          ),
        );
      },
    );
  }

  Widget buildProfileImage() {
    return Center(
      child: Stack(
        clipBehavior: Clip.antiAliasWithSaveLayer,
        children: <Widget>[
          MyContainer.rounded(
            paddingAll: 0,
            width: 140,
            height: 140,
            clipBehavior: Clip.antiAliasWithSaveLayer,
            child: controller.imageFile == null
                ? Image(
                    image: AssetImage(
                      "./assets/images/profile/avatar_1.jpg",
                    ),
                    fit: BoxFit.fill,
                  )
                : Image.file(
                    File(
                      controller.imageFile!.path,
                    ),
                    fit: BoxFit.cover,
                  ),
          ),
          Positioned(
            bottom: 8,
            right: 8,
            child: InkWell(
              onTap: () async {
                controller.imageFile = await controller.picker.pickImage(
                  source: ImageSource.gallery,
                );
                setState(() {});
              },
              child: MyContainer.rounded(
                border: Border.all(width: 2, style: BorderStyle.solid),
                paddingAll: 6,
                child: Icon(
                  LucideIcons.pencil,
                  size: 20,
                ),
              ),
            ),
          )
        ],
      ),
    );
  }

  Widget buildProfileDetails() {
    return Padding(
      padding: MySpacing.x(12),
      child: Column(
        children: [
          buildProfileDetailContainer(
            LucideIcons.circle_user,
            'Nasir Undid',
            LucideIcons.clipboard_pen,
          ),
          MySpacing.height(16),
          buildProfileDetailContainer(
            LucideIcons.mail,
            'nasirundid@gmail.com',
            LucideIcons.clipboard_pen,
          ),
          MySpacing.height(16),
          buildProfileDetailContainer(
            LucideIcons.lock,
            '**********',
            LucideIcons.clipboard_pen,
          ),
          MySpacing.height(16),
          buildProfileDetailContainer(
            LucideIcons.map_pin,
            'Nasir Undid',
            LucideIcons.clipboard_pen,
          ),
          MySpacing.height(16),
          MyCard(
            onTap: () => controller.gotoPlantSupportScreen(),
            shadow: MyShadow(elevation: 1, darkShadow: true),
            borderRadiusAll: 8,
            child: Row(
              children: [
                Icon(
                  LucideIcons.circle_question_mark,
                  size: 18,
                ),
                MySpacing.width(12),
                Expanded(
                    child: MyText.bodyMedium(
                  'Support',
                  fontSize: 16,
                  fontWeight: 600,
                )),
                Icon(
                  LucideIcons.move_right,
                  size: 18,
                )
              ],
            ),
          ),
          MySpacing.height(12),
          MyCard(
            onTap: () => controller.gotoLogout(),
            shadow: MyShadow(elevation: 1, darkShadow: true),
            borderRadiusAll: 8,
            child: Row(
              children: [
                Icon(
                  LucideIcons.log_out,
                  size: 18,
                ),
                MySpacing.width(12),
                MyText.bodyMedium(
                  'Log Out',
                  fontSize: 16,
                  fontWeight: 600,
                ),
              ],
            ),
          ),
          
        ],
      ),
    );
  }

  Widget buildProfileDetailContainer(
      IconData icons, String name, IconData iconData) {
    return MyCard(
      onTap: () => controller.gotoEditProfileScreen(),
      shadow: MyShadow(elevation: 1, darkShadow: true),
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
          Icon(
            iconData,
            size: 18,
          )
        ],
      ),
    );
  }
}
