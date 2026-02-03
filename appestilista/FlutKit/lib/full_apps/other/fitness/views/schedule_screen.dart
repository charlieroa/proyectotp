import 'package:flutkit/full_apps/other/fitness/controllers/schedule_controller.dart';
import 'package:flutkit/full_apps/other/fitness/models/exercise.dart';
import 'package:flutkit/full_apps/other/fitness/models/schedule_exercise.dart';
import 'package:flutkit/helpers/extensions/extensions.dart';
import 'package:flutkit/helpers/theme/app_theme.dart';
import 'package:flutkit/helpers/widgets/my_container.dart';
import 'package:flutkit/helpers/widgets/my_spacing.dart';
import 'package:flutkit/helpers/widgets/my_text.dart';
import 'package:flutkit/loading_effect.dart';
import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:flutter_lucide/flutter_lucide.dart';

class ScheduleScreen extends StatefulWidget {
  const ScheduleScreen({super.key});

  @override
  _ScheduleScreenState createState() => _ScheduleScreenState();
}

class _ScheduleScreenState extends State<ScheduleScreen> {
  late ThemeData theme;
  late CustomTheme customTheme;

  late ScheduleController controller;

  @override
  void initState() {
    super.initState();
    theme = AppTheme.theme;
    customTheme = AppTheme.customTheme;

    controller = ScheduleController();
  }

  Widget _buildDateList() {
    List<Widget> tabs = [];

    for (int i = 0; i < controller.dailyExercises!.length; i++) {
      bool selected = controller.currentPage == i;
      tabs.add(Expanded(
        child: InkWell(
          onTap: () {
            controller.selectDate(controller.dailyExercises![i]);
            controller.onPageChanged(i, fromUser: true);
          },
          child: Column(
            children: [
              MyText.labelMedium(
                controller.dailyExercises![i].day,
                xMuted: true,
              ),
              MySpacing.height(12),
              MyContainer.bordered(
                paddingAll: 6,
                borderRadiusAll: 2,
                border: Border.all(
                    color: selected
                        ? customTheme.fitnessPrimary
                        : customTheme.borderDark),
                color: selected
                    ? customTheme.fitnessPrimary
                    : theme.scaffoldBackgroundColor,
                child: MyText.bodyMedium(
                  controller.dailyExercises![i].date,
                  fontWeight: 600,
                  color: selected
                      ? customTheme.fitnessOnPrimary
                      : theme.colorScheme.onSurface,
                ),
              ),
            ],
          ),
        ),
      ));
    }

    return MyContainer.bordered(
      borderRadiusAll: 4,
      margin: MySpacing.x(20),
      padding: MySpacing.xy(8, 16),
      color: customTheme.cardDark,
      child: Row(
        children: tabs,
      ),
    );
  }

  List<Widget> _buildDailyExercise() {
    List<Widget> list = [];

    for (ScheduleExercise dailyExercise in controller.dailyExercises!) {
      list.add(Padding(
        padding: MySpacing.x(20),
        child: SingleChildScrollView(
          child: Column(
            children: dailyExercise.exercises.map((exercise) {
              return _buildSingleExercise(exercise);
            }).toList(),
          ),
        ),
      ));
    }

    return list;
  }

  Widget _buildSingleExercise(Exercise exercise) {
    return Padding(
      padding: MySpacing.bottom(20),
      child: Row(
        children: [
          MyText.bodyMedium(
            exercise.time,
            fontWeight: 600,
          ),
          MySpacing.width(20),
          Expanded(
            child: exercise.isRest
                ? MyContainer(
                    height: 58,
                    borderRadiusAll: 4,
                    padding: MySpacing.xy(16, 18),
                    color: customTheme.card,
                    child: MyText.labelMedium(
                      exercise.name,
                    ),
                  )
                : MyContainer(
                    height: 58,
                    borderRadiusAll: 4,
                    padding: MySpacing.xy(16, 12),
                    color: customTheme.fitnessPrimary.withAlpha(40),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        MyText.labelMedium(
                          exercise.name,
                        ),
                        MySpacing.height(2),
                        MyText.labelSmall(
                          exercise.duration,
                          muted: true,
                        ),
                      ],
                    ),
                  ),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return GetBuilder<ScheduleController>(
        init: controller,
        tag: 'schedule_controller',
        builder: (controller) {
          return _buildBody();
        });
  }

  Widget _buildBody() {
    if (controller.uiLoading) {
      return Scaffold(
        body: Padding(
          padding: MySpacing.top(MySpacing.safeAreaTop(context) + 20),
          child: LoadingEffect.getSearchLoadingScreen(context),
        ),
      );
    } else {
      return Scaffold(
        appBar: AppBar(
          automaticallyImplyLeading: false,
          title: MyText.bodyLarge(
            controller.selectedDate.monthName,
            fontWeight: 600,
          ),
          centerTitle: true,
          elevation: 0,
          actions: [
            MyContainer(
              onTap: () {
                controller.showCalendar();
              },
              padding: MySpacing.x(20),
              color: Colors.transparent,
              child: Icon(
                LucideIcons.calendar,
                color: theme.colorScheme.onSurface,
                size: 20,
              ),
            )
          ],
        ),
        body: Container(
          padding: MySpacing.fromLTRB(0, 8, 0, 0),
          child: Column(
            children: [
              _buildDateList(),
              MySpacing.height(20),
              Container(
                padding: MySpacing.x(20),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    MyText.bodyMedium(
                      'Daily Exercise',
                      fontWeight: 700,
                    ),
                    Icon(
                      LucideIcons.ellipsis,
                    ),
                  ],
                ),
              ),
              MySpacing.height(20),
              Expanded(
                child: PageView(
                  allowImplicitScrolling: true,
                  pageSnapping: true,
                  physics: ClampingScrollPhysics(),
                  controller: controller.pageController,
                  onPageChanged: (int page) {
                    controller.onPageChanged(page);
                  },
                  children: _buildDailyExercise(),
                ),
              ),
            ],
          ),
        ),
      );
    }
  }
}
