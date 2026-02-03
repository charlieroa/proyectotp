import 'package:flutkit/full_apps/animations/plant/controller/plant_support_controller.dart';

import 'package:flutkit/helpers/utils/my_shadow.dart';
import 'package:flutkit/helpers/widgets/my_card.dart';
import 'package:flutkit/helpers/widgets/my_spacing.dart';
import 'package:flutkit/helpers/widgets/my_text.dart';
import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:flutter_lucide/flutter_lucide.dart';

class PlantSupportScreen extends StatefulWidget {
  const PlantSupportScreen({super.key});

  @override
  State<PlantSupportScreen> createState() => _PlantSupportScreenState();
}

class _PlantSupportScreenState extends State<PlantSupportScreen>
    with TickerProviderStateMixin {
  late PlantSupportController controller;
  @override
  void initState() {
    controller = PlantSupportController();
    super.initState();
  }

  @override
  Widget build(BuildContext context) {
    return GetBuilder<PlantSupportController>(
      init: controller,
      tag: 'plant_support_controller',
      builder: (controller) {
        return Scaffold(
          appBar: AppBar(
            elevation: 0,
            leading: IconButton(
              onPressed: () => Navigator.of(context).pop(),
              icon: Icon(LucideIcons.move_left),
            ),
            title: MyText.titleMedium(
              'Support',
              fontWeight: 600,
            ),
            centerTitle: true,
          ),
          body: Padding(
            padding: MySpacing.x(20),
            child: Column(
              children: [
                buildSupportDetailContainer(
                    Icons.support_agent, 'Contact Live Chat'),
                MySpacing.height(20),
                buildSupportDetailContainer(
                    LucideIcons.mail, 'Sent us an email'),
                MySpacing.height(20),
                buildSupportDetailContainer(LucideIcons.file_question_mark, 'FAQs'),

              ],
            ),
          ),
        );
      },
    );
  }

  Widget buildSupportDetailContainer(IconData icons, String name) {
    return MyCard(
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
            muted: true,
          )),
          Icon(
            LucideIcons.move_right,
            size: 18,
          )
        ],
      ),
    );
  }
}
