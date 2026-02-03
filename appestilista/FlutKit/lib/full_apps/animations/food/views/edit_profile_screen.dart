import 'package:flutkit/helpers/extensions/widgets_extension.dart';
import 'package:flutkit/helpers/localizations/language.dart';
import 'package:flutkit/helpers/theme/app_theme.dart';
import 'package:flutkit/helpers/widgets/my_button.dart';
import 'package:flutkit/helpers/widgets/my_card.dart';
import 'package:flutkit/helpers/widgets/my_container.dart';
import 'package:flutkit/helpers/widgets/my_spacing.dart';
import 'package:flutkit/helpers/widgets/my_text.dart';
import 'package:flutkit/helpers/widgets/my_text_style.dart';
import 'package:flutkit/images.dart';
import 'package:flutter/material.dart';
import 'package:flutkit/full_apps/animations/food/controllers/edit_profile_controller.dart';
import 'package:flutter_lucide/flutter_lucide.dart';
import 'package:get/get.dart';

class EditProfileScreen extends StatefulWidget {
  const EditProfileScreen({super.key});

  @override
  State<EditProfileScreen> createState() => _EditProfileScreenState();
}

class _EditProfileScreenState extends State<EditProfileScreen> {
  late ThemeData theme;
  late CustomTheme customTheme;

  late EditProfileController controller;

  @override
  void initState() {
    super.initState();
    theme = AppTheme.theme;
    customTheme = AppTheme.customTheme;

    controller = Get.put(EditProfileController());
  }

  Widget _buildSingleField(String type, String value) {
    return MyContainer(
      margin: MySpacing.bottom(12),
      child: Row(
        children: [
          SizedBox(
            width: 64,
            child: MyText.bodySmall(
              type,
              xMuted: true,
            ),
          ),
          MySpacing.width(12),

          Expanded(
            child: TextFormField(
              style: MyTextStyle.bodySmall(fontWeight: 600),
              maxLines: 1,
              decoration: InputDecoration(
                isDense: true,
                isCollapsed: true,
                labelText: value,
                contentPadding: MySpacing.all(12)
              ),
            ),
          ),
          MySpacing.width(12),
          Icon(
            LucideIcons.chevron_right,
            size: 16,
            color: theme.colorScheme.onSurface.withAlpha(160),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return GetBuilder<EditProfileController>(
        init: controller,
        tag: 'food_edit_profile_controller',
        builder: (controller) {
          return _buildBody();
        });
  }

  Widget _buildBody() {
      return Scaffold(
        appBar: AppBar(
          title: MyText.bodyLarge(
            'Personal Data',
            fontWeight: 600,
          ),
          elevation: 0,
          centerTitle: true,
          automaticallyImplyLeading: false,
          leading: InkWell(
            onTap: () => controller.goBack(),
            child: Icon(
              LucideIcons.chevron_left,
              size: 20,
            ).autoDirection(),
          ),
        ),
        body: ListView(
          padding: MySpacing.all(20),
          children: [
            Center(
              child: MyContainer(
                color: Colors.transparent,
                paddingAll: 0,
                height: 100,
                width: 100,
                child: Stack(
                  clipBehavior: Clip.none,
                  children: [
                    ClipRRect(
                      clipBehavior: Clip.antiAliasWithSaveLayer,
                      borderRadius: BorderRadius.all(Radius.circular(8)),
                      child: Image(
                        height: 100,
                        width: 100,
                        image: AssetImage(Images.foodProfile),
                        fit: BoxFit.cover,
                      ),
                    ),
                    Positioned(
                      bottom: -8,
                      left: Language.autoDirection(null, 0),
                      right: Language.autoDirection(-8),
                      child: MyCard(
                        paddingAll: 2,
                        borderRadiusAll: 4,
                        clipBehavior: Clip.none,
                        child: MyContainer(
                          paddingAll: 4,
                          borderRadiusAll: 4,
                          color: customTheme.foodPrimary.withAlpha(60),
                          child: Icon(
                            Icons.camera_alt,
                            size: 16,
                            color: customTheme.foodPrimary,
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
            MySpacing.height(32),
            _buildSingleField('Full Name', 'Helly Seth'),
            _buildSingleField('Password', 'password'),
            _buildSingleField('Number', '+91 8965412370'),
            _buildSingleField('Email', 'abc@gmail.com'),
            _buildSingleField('Birth Date', 'Oct 23, 2005'),
            MySpacing.height(20),
            MyButton.block(
              onPressed: () {
                controller.goBack();
              },
              elevation: 0,
              borderRadiusAll: 8,
              splashColor: customTheme.foodOnPrimary.withAlpha(40),
              backgroundColor: customTheme.foodPrimary,
              child: MyText.labelLarge(
                'Submit',
                fontWeight: 600,
                color: customTheme.foodOnPrimary,
              ),
            ),
          ],
        ),
      );
    }
  }