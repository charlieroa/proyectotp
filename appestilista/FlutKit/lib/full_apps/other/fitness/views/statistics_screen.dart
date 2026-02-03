import 'package:flutkit/full_apps/other/fitness/controllers/statistics_controller.dart';
import 'package:flutkit/full_apps/other/fitness/models/daily_exercise.dart';
import 'package:flutkit/full_apps/other/fitness/models/spline_area_data.dart';
import 'package:flutkit/helpers/extensions/extensions.dart';
import 'package:flutkit/helpers/theme/app_theme.dart';
import 'package:flutkit/helpers/widgets/my_container.dart';
import 'package:flutkit/helpers/widgets/my_spacing.dart';
import 'package:flutkit/helpers/widgets/my_text.dart';
import 'package:flutkit/loading_effect.dart';
import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:flutter_lucide/flutter_lucide.dart';
import 'package:syncfusion_flutter_charts/charts.dart';

class StatisticsScreen extends StatefulWidget {
  final DailyExercise dailyExercise;
  final IconData icon;

  StatisticsScreen(
    this.dailyExercise,
    this.icon, {
    super.key,
  });

  @override
  _StatisticsScreenState createState() => _StatisticsScreenState();
}

class _StatisticsScreenState extends State<StatisticsScreen> {
  late ThemeData theme;
  late CustomTheme customTheme;

  late StatisticsController controller;

  @override
  void initState() {
    super.initState();
    theme = AppTheme.theme;
    customTheme = AppTheme.customTheme;

    controller = StatisticsController(widget.dailyExercise, widget.icon);
  }

  SfCartesianChart _buildSplineAreaChart() {
    return SfCartesianChart(
      plotAreaBorderWidth: 0,
      margin: EdgeInsets.zero,
      primaryXAxis: NumericAxis(
          isVisible: true,
          interval: 1,
          majorGridLines: MajorGridLines(width: 0),
          edgeLabelPlacement: EdgeLabelPlacement.shift),
      primaryYAxis: NumericAxis(
          isVisible: true,
          axisLine: AxisLine(width: 0),
          majorTickLines: MajorTickLines(size: 4, color: Colors.transparent)),
      series: [
        SplineAreaSeries<SplineAreaData, double>(
          dataSource: controller.dailyExercise.chartData,
          gradient: LinearGradient(
            colors: [
              controller.dailyExercise.color.withAlpha(150),
              controller.dailyExercise.color.withAlpha(100),
              controller.dailyExercise.color.withAlpha(40),
              controller.dailyExercise.color.withAlpha(20),
            ],
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
          ),
          borderColor: controller.dailyExercise.color,
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
    return GetBuilder<StatisticsController>(
        init: controller,
        tag: 'statistics_controller',
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
          elevation: 0,
          leading: InkWell(
            onTap: () {
              controller.goBack();
            },
            child: Icon(
              Icons.chevron_left,
              size: 20,
            ),
          ),
          title: MyText.titleMedium(
            "${controller.dailyExercise.name}'s stats",
            color: theme.colorScheme.onSurface,
            fontWeight: 600,
          ),
        ),
        body: Column(
          children: [
            MySpacing.height(24),
            MyContainer.rounded(
              color: controller.dailyExercise.color.withAlpha(40),
              child: Icon(
                controller.icon,
                size: 48,
                color: controller.dailyExercise.color,
              ),
            ),
            MySpacing.height(20),
            MyText.headlineSmall(
              controller.dailyExercise.achieveData.precise,
              fontWeight: 700,
            ),
            MySpacing.height(4),
            MyText.bodySmall(
              'Goal: ${controller.dailyExercise.goalData.precise} ${controller.dailyExercise.type}',
              fontWeight: 600,
              xMuted: true,
            ),
            MySpacing.height(20),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceEvenly,
              children: [
                Column(
                  children: [
                    MyContainer.rounded(
                      paddingAll: 12,
                      color: controller.dailyExercise.color.withAlpha(28),
                      child: Icon(
                        LucideIcons.clock,
                        size: 24,
                        color: controller.dailyExercise.color,
                      ),
                    ),
                    MySpacing.height(8),
                    MyText.bodyMedium(
                      '${controller.dailyExercise.time!.textFromSeconds(
                        withHours: true,
                      )}h ${controller.dailyExercise.time!.textFromSeconds(
                        withMinutes: true,
                      )}m',
                      fontWeight: 600,
                    ),
                    MySpacing.height(4),
                    MyText.bodySmall(
                      'Time',
                      fontWeight: 600,
                      xMuted: true,
                    ),
                  ],
                ),
                Column(
                  children: [
                    MyContainer.rounded(
                      paddingAll: 12,
                      color: controller.dailyExercise.color.withAlpha(28),
                      child: Icon(
                        LucideIcons.map_pin,
                        size: 24,
                        color: controller.dailyExercise.color,
                      ),
                    ),
                    MySpacing.height(8),
                    MyText.bodyMedium(
                      '${controller.dailyExercise.distance} km',
                      fontWeight: 600,
                    ),
                    MySpacing.height(4),
                    MyText.bodySmall(
                      'Distance',
                      fontWeight: 600,
                      xMuted: true,
                    ),
                  ],
                ),
                Column(
                  children: [
                    MyContainer.rounded(
                      paddingAll: 12,
                      color: controller.dailyExercise.color.withAlpha(28),
                      child: Icon(
                        LucideIcons.zap,
                        size: 24,
                        color: controller.dailyExercise.color,
                      ),
                    ),
                    MySpacing.height(8),
                    MyText.bodyMedium(
                      '${controller.dailyExercise.calories.precise} kcal',
                      fontWeight: 600,
                    ),
                    MySpacing.height(4),
                    MyText.bodySmall(
                      'Calories',
                      fontWeight: 600,
                      xMuted: true,
                    ),
                  ],
                ),
              ],
            ),
            MySpacing.height(32),
            Container(
                height: 300,
                padding: MySpacing.x(20),
                child: _buildSplineAreaChart()),
            MySpacing.height(16),
            MyText.bodyLarge(
              'Daily Statistics',
              fontWeight: 600,
              color: theme.colorScheme.onSurface,
            ),
          ],
        ),
      );
    }
  }
}
