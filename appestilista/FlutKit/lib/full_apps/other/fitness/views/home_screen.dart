import 'package:flutkit/full_apps/other/fitness/controllers/home_controller.dart';
import 'package:flutkit/full_apps/other/fitness/models/recent_exercise.dart';
import 'package:flutkit/full_apps/other/fitness/models/spline_area_data.dart';
import 'package:flutkit/helpers/extensions/extensions.dart';
import 'package:flutkit/helpers/localizations/language.dart';
import 'package:flutkit/helpers/theme/app_theme.dart';
import 'package:flutkit/helpers/widgets/my_button.dart';
import 'package:flutkit/helpers/widgets/my_container.dart';
import 'package:flutkit/helpers/widgets/my_spacing.dart';
import 'package:flutkit/helpers/widgets/my_text.dart';
import 'package:flutkit/helpers/widgets/my_text_style.dart';
import 'package:flutkit/loading_effect.dart';
import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:flutter_lucide/flutter_lucide.dart';
import 'package:syncfusion_flutter_charts/charts.dart';

class HomeScreen extends StatefulWidget {
  HomeScreen({super.key});

  @override
  _HomeScreenState createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  late ThemeData theme;
  late CustomTheme customTheme;

  late HomeController controller;

  @override
  void initState() {
    super.initState();
    theme = AppTheme.theme;
    customTheme = AppTheme.customTheme;

    controller = HomeController();
  }

  Widget _buildSingleExercise(RecentExercise exercise) {
    return MyContainer(
      onTap: () {
        controller.goToRelaxationScreen();
      },
      margin: MySpacing.x(10),
      paddingAll: 0,
      borderRadiusAll: 4,
      height: 160,
      width: 140,
      color: exercise.color.withAlpha(40),
      child: Stack(
        children: [
          Positioned(
            top: 40,
            bottom: 8,
            left: 30.cd(-16).toDouble(),
            right: (-16).cd(30).toDouble(),
            child: Image(
              image: AssetImage(exercise.image),
            ),
          ),
          Positioned(
              top: 16,
              left: 16,
              bottom: 0,
              right: 16,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  MyText.labelMedium(
                    exercise.name,
                    fontWeight: 600,
                    color: theme.colorScheme.onSurface,
                  ),
                  MyText.bodySmall(
                    exercise.duration,
                    color: theme.colorScheme.onSurface,
                  ),
                ],
              ))
        ],
      ),
    );
  }

  SfCartesianChart _buildSplineAreaChart() {
    return SfCartesianChart(
      plotAreaBorderWidth: 0,
      margin: EdgeInsets.zero,
      primaryXAxis: NumericAxis(
          isVisible: false,
          interval: 1,
          majorGridLines: MajorGridLines(width: 0),
          edgeLabelPlacement: EdgeLabelPlacement.shift),
      primaryYAxis: NumericAxis(
          isVisible: false,
          axisLine: AxisLine(width: 0),
          majorTickLines: MajorTickLines(size: 0)),
      series: [
        SplineAreaSeries<SplineAreaData, double>(
          dataSource: controller.chartData,
          gradient: LinearGradient(
            colors: [
              AppTheme.customTheme.fitnessPrimary.withAlpha(150),
              AppTheme.customTheme.fitnessPrimary.withAlpha(100),
              AppTheme.customTheme.fitnessPrimary.withAlpha(40),
              AppTheme.customTheme.fitnessPrimary.withAlpha(20),
            ],
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
          ),
          borderColor: AppTheme.customTheme.fitnessPrimary,
          borderWidth: 2,
          xValueMapper: (SplineAreaData sales, _) => sales.calories,
          yValueMapper: (SplineAreaData sales, _) => sales.day,
        )
      ],
      tooltipBehavior: TooltipBehavior(enable: true),
    );
  }

  @override
  Widget build(BuildContext context) {
    return GetBuilder<HomeController>(
        init: controller,
        tag: 'home_controller',
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
      ));
    } else {
      return Scaffold(
        body: ListView(
          padding: MySpacing.top(MySpacing.safeAreaTop(context) + 20),
          children: [
            Container(
              padding: MySpacing.x(20),
              child: Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        MyText.bodyMedium(
                          'Hello, Nen',
                          muted: true,
                        ),
                        MySpacing.height(8),
                        MyText.titleMedium(
                          'Choose your exercise',
                          fontWeight: 700,
                          letterSpacing: 0.3,
                        ),
                      ],
                    ),
                  ),
                  MySpacing.width(20),
                  InkWell(
                    onTap: () {},
                    child: Stack(
                      clipBehavior: Clip.none,
                      children: [
                        Icon(
                          LucideIcons.bell,
                          color: theme.colorScheme.onSurface,
                          size: 20,
                        ),
                        Positioned(
                          top: -4,
                          right: -1,
                          child: MyContainer.rounded(
                            paddingAll: 3,
                            color: customTheme.fitnessPrimary,
                            child: Center(
                                child: MyText.bodySmall(
                              '2',
                              color: customTheme.fitnessOnPrimary,
                              fontSize: 8,
                            )),
                          ),
                        )
                      ],
                    ),
                  ),
                ],
              ),
            ),
            MySpacing.height(20),
            MyContainer(
              margin: MySpacing.x(20),
              padding: MySpacing.xy(8, 8),
              borderRadiusAll: 4,
              child: IntrinsicHeight(
                child: Row(
                  children: [
                    Expanded(
                      child: TextFormField(
                        cursorColor: theme.colorScheme.onSurface,
                        maxLines: 1,
                        style: MyTextStyle.bodyMedium(),
                        decoration: InputDecoration(
                          hintText: "Search exercise...",
                          hintStyle: MyTextStyle.bodySmall(
                              color: theme.colorScheme.onSurface,
                              muted: true),
                          contentPadding: MySpacing.y(16),
                          border: InputBorder.none,
                          enabledBorder: InputBorder.none,
                          focusedBorder: InputBorder.none,
                          filled: true,
                          isDense: true,
                          fillColor: customTheme.card,
                          prefixIcon: Icon(
                            LucideIcons.search,
                            size: 20,
                            color:
                                theme.colorScheme.onSurface.withAlpha(200),
                          ),
                        ),
                      ),
                    ),
                    MySpacing.width(8),
                    Container(
                        padding: MySpacing.y(4),
                        child: VerticalDivider(
                          thickness: 1,
                          color: customTheme.borderDark,
                        )),
                    MySpacing.width(8),
                    Icon(
                      LucideIcons.mic,
                      size: 18,
                      color: theme.colorScheme.onSurface,
                    ),
                    MySpacing.width(12),
                  ],
                ),
              ),
            ),
            MySpacing.height(20),
            MyContainer(
                borderRadiusAll: 4,
                onTap: () {
                  controller.goToRelaxationScreen();
                },
                margin: MySpacing.x(20),
                padding: MySpacing.xy(20, 16),
                color: customTheme.fitnessPrimary.withAlpha(40),
                child: Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          MyText.bodyMedium(
                            "Time to Meditation",
                            color: customTheme.fitnessPrimary,
                            fontWeight: 600,
                          ),
                          MyText.bodySmall(
                            "30 min",
                            color: customTheme.fitnessPrimary,
                          )
                        ],
                      ),
                    ),
                    MySpacing.width(20),
                    MyButton(
                      elevation: 0,
                      borderRadiusAll: 4,
                      padding: MySpacing.xy(12, 16),
                      onPressed: () {
                        controller.goToRelaxationScreen();
                      },
                      splashColor: customTheme.fitnessOnPrimary.withAlpha(28),
                      backgroundColor: customTheme.fitnessPrimary,
                      child: MyText.labelMedium(
                        "START NOW",
                        color: customTheme.fitnessOnPrimary,
                        fontWeight: 600,
                      ),
                    )
                  ],
                )),
            MySpacing.height(20),
            Container(
              padding: MySpacing.x(20),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  MyText.bodyMedium(
                    'Recent Exercise',
                    fontWeight: 700,
                  ),
                  Icon(
                    LucideIcons.ellipsis,
                  ),
                ],
              ),
            ),
            MySpacing.height(20),
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: [
                  MySpacing.width(10),
                  ...controller.exercises!
                      .map((exercise) => _buildSingleExercise(exercise))
                      ,
                  MySpacing.width(10),
                ],
              ),
            ),
            MySpacing.height(20),
            Container(
              padding: MySpacing.x(20),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      MyText.bodyMedium(
                        'Weekly Summary',
                        fontWeight: 700,
                      ),
                      MySpacing.height(2),
                      MyText.bodySmall(
                        'You\'re doing good, keep it up!',
                        muted: true,
                      ),
                    ],
                  ),
                  Stack(
                    children: [
                      Positioned(
                        top: 0,
                        bottom: 0,
                        left: Language.autoDirection(8),
                        right: Language.autoDirection(null, 6),
                        child: Center(
                          child: MyText.bodySmall(
                            '75%',
                            fontWeight: 700,
                            fontSize: 11,
                          ),
                        ),
                      ),
                      CircularProgressIndicator(
                        value: 0.75,
                        valueColor: AlwaysStoppedAnimation<Color>(
                            customTheme.fitnessPrimary),
                        backgroundColor: customTheme.borderDark,
                        strokeWidth: 2,
                      ),
                    ],
                  ),
                ],
              ),
            ),
            MySpacing.height(20),
            MyContainer(
                height: 200,
                padding: MySpacing.top(20),
                borderRadiusAll: 4,
                margin: MySpacing.x(20),
                color: customTheme.cardDark,
                child: Column(
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                      children: [
                        Column(
                          children: [
                            MyText.labelMedium(
                              'Calories',
                              xMuted: true,
                              fontWeight: 600,
                              fontSize: 12,
                            ),
                            MySpacing.height(4),
                            MyText.labelMedium(
                              '30.5K',
                              fontWeight: 700,
                            ),
                          ],
                        ),
                        Column(
                          children: [
                            MyText.labelMedium(
                              'Training',
                              xMuted: true,
                              fontWeight: 600,
                              fontSize: 12,
                            ),
                            MySpacing.height(4),
                            MyText.labelMedium(
                              '2h 25m',
                              fontWeight: 700,
                            ),
                          ],
                        ),
                        Column(
                          children: [
                            MyText.labelMedium(
                              'Avg step',
                              xMuted: true,
                              fontWeight: 600,
                              fontSize: 12,
                            ),
                            MySpacing.height(4),
                            MyText.labelMedium(
                              '2145',
                              fontWeight: 700,
                            ),
                          ],
                        ),
                      ],
                    ),
                    Expanded(child: _buildSplineAreaChart()),
                  ],
                )),
          ],
        ),
      );
    }
  }
}
