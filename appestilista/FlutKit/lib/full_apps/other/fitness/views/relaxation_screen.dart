import 'package:flutkit/full_apps/other/fitness/controllers/relaxation_controller.dart';
import 'package:flutkit/helpers/theme/app_theme.dart';
import 'package:flutkit/helpers/widgets/my_button.dart';
import 'package:flutkit/helpers/widgets/my_container.dart';
import 'package:flutkit/helpers/widgets/my_progress_bar.dart';
import 'package:flutkit/helpers/widgets/my_spacing.dart';
import 'package:flutkit/helpers/widgets/my_text.dart';
import 'package:flutter/material.dart';
import 'package:get/get.dart';

class RelaxationScreen extends StatefulWidget {
  const RelaxationScreen({super.key});

  @override
  _RelaxationScreenState createState() => _RelaxationScreenState();
}

class _RelaxationScreenState extends State<RelaxationScreen>
    with TickerProviderStateMixin {
  late ThemeData theme;
  late CustomTheme customTheme;

  late RelaxationController controller;

  @override
  void initState() {
    super.initState();
    theme = AppTheme.theme;
    customTheme = AppTheme.customTheme;
    controller = RelaxationController(this);
  }

  @override
  Widget build(BuildContext context) {
    return GetBuilder<RelaxationController>(
        init: controller,
        tag: 'relaxation_controller',
        builder: (controller) {
          return Scaffold(
            body: Padding(
              padding: MySpacing.fromLTRB(
                  20, MySpacing.safeAreaTop(context) + 20, 20, 20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  InkWell(
                    onTap: () {
                      controller.goBack();
                    },
                    child: Icon(
                      Icons.chevron_left,
                      size: 20,
                    ),
                  ),
                  MySpacing.height(12),
                  MyText.headlineSmall(
                    'Relaxation',
                    fontWeight: 700,
                  ),
                  MySpacing.height(16),
                  MyProgressBar(
                    width: MediaQuery.of(context).size.width - 40,
                    activeColor: customTheme.fitnessPrimary,
                    inactiveColor: customTheme.fitnessPrimary.withAlpha(40),
                    progress: (controller.totalCount - controller.count) /
                        controller.totalCount,
                    height: 5,
                  ),
                  MySpacing.height(40),
                  Expanded(
                    child: Stack(
                      children: [
                        Center(
                            child: MyContainer.rounded(
                                width: 200 + (100 - controller.animation.value),
                                height:
                                    200 + (100 - controller.animation.value),
                                color: customTheme.fitnessPrimary.withAlpha(40),
                                child: Container())),
                        Center(
                          child: MyContainer.rounded(
                              width: 200 + controller.animation.value,
                              height: 200 + controller.animation.value,
                              color: customTheme.fitnessPrimary.withAlpha(40),
                              child: Container()),
                        ),
                        Center(
                          child: AnimatedSwitcher(
                            duration: Duration(milliseconds: 400),
                            transitionBuilder:
                                (Widget child, Animation<double> animation) {
                              return ScaleTransition(
                                  scale: animation, child: child);
                            },
                            child: MyText.headlineSmall(
                              controller.positionText,
                              fontWeight: 700,
                              color: customTheme.fitnessPrimary,
                              key: ValueKey<String>(controller.positionText),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                  MySpacing.height(40),
                  Center(
                    child: Column(
                      children: [
                        AnimatedSwitcher(
                          duration: Duration(milliseconds: 200),
                          transitionBuilder:
                              (Widget child, Animation<double> animation) {
                            return ScaleTransition(
                                scale: animation, child: child);
                          },
                          child: MyText.headlineSmall(
                            controller.count.toInt().toString(),
                            fontWeight: 700,
                            key: ValueKey<int>(controller.count.toInt()),
                            color: customTheme.fitnessPrimary,
                          ),
                        ),
                        MyText.bodyMedium(
                          'Seconds left',
                        ),
                      ],
                    ),
                  ),
                  MySpacing.height(20),
                  MyButton.block(
                    onPressed: () {
                      controller.goBack();
                    },
                    backgroundColor: customTheme.fitnessPrimary,
                    elevation: 0,
                    borderRadiusAll: 4,
                    child: MyText.labelMedium(
                      'Finish Workout',
                      color: customTheme.fitnessOnPrimary,
                      fontWeight: 600,
                    ),
                  ),
                ],
              ),
            ),
          );
        });
  }
}
