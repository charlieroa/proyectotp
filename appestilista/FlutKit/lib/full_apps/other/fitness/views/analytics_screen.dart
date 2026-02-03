import 'package:flutkit/full_apps/other/fitness/controllers/analytics_controller.dart';
import 'package:flutkit/full_apps/other/fitness/models/charts_sample_data.dart';
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
import 'package:syncfusion_flutter_charts/charts.dart';

class AnalyticsScreen extends StatefulWidget {
  AnalyticsScreen({super.key});

  @override
  _AnalyticsScreenState createState() => _AnalyticsScreenState();
}

class _AnalyticsScreenState extends State<AnalyticsScreen> {
  late ThemeData theme;
  late CustomTheme customTheme;

  late AnalyticsController controller;

  List<RadialBarSeries<ChartSampleData, String>> _getRadialBarSeries() {
    final List<RadialBarSeries<ChartSampleData, String>> list = <RadialBarSeries<ChartSampleData, String>>[
      RadialBarSeries<ChartSampleData, String>(
          animationDuration: 1000,
          maximumValue: 100,
          radius: '100%',
          gap: '10%',
          innerRadius: '30%',
          dataSource: controller.chartData,
          cornerStyle: CornerStyle.bothCurve,
          xValueMapper: (ChartSampleData data, _) => data.x as String,
          yValueMapper: (ChartSampleData data, _) => data.y,
          pointColorMapper: (ChartSampleData data, _) => data.pointColor,
          dataLabelMapper: (ChartSampleData data, _) => data.text,
          dataLabelSettings: DataLabelSettings(isVisible: false))
    ];
    return list;
  }

  @override
  void initState() {
    super.initState();
    theme = AppTheme.theme;
    customTheme = AppTheme.customTheme;

    controller = AnalyticsController();
  }

  SfCircularChart _buildAngleRadialBarChart() {
    return SfCircularChart(
      margin: EdgeInsets.zero,
      legend: Legend(
          isVisible: true,
          width: "400",
          itemPadding: 0,
          position: LegendPosition.bottom,
          legendItemBuilder: (String legendText, dynamic series, dynamic point, int seriesIndex) {
            return Container(
              width: 110,
              margin: MySpacing.top(16),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(
                    controller.icons[seriesIndex],
                    size: 20,
                    color: controller.chartData[seriesIndex].pointColor,
                  ),
                  MySpacing.width(8),
                  MyText.labelMedium(controller.chartData[seriesIndex].text!),
                ],
              ),
            );
          },
          overflowMode: LegendItemOverflowMode.none),
      series: _getRadialBarSeries(),
    );
  }

  List<Widget> _buildSingleExerciseList() {
    List<Widget> list = [];

    for (int i = 0; i < controller.dailyExercises!.length; i++) {
      list.add(_buildSingleDailyExercise(controller.dailyExercises![i], controller.icons[i]));
    }
    return list;
  }

  Widget _buildSingleDailyExercise(DailyExercise dailyExercise, IconData icon) {
    return MyContainer(
      onTap: () {
        controller.goToStatisticsScreen(dailyExercise, icon);
      },
      padding: MySpacing.x(12),
      borderRadiusAll: 4,
      margin: MySpacing.bottom(20),
      child: Row(
        children: [
          Icon(
            icon,
            size: 24,
            color: dailyExercise.color,
          ),
          MySpacing.width(16),
          Expanded(
            child: Row(
              children: [
                MyText.bodyMedium(
                  dailyExercise.achieveData.precise,
                  fontSize: 16,
                  fontWeight: 600,
                ),
                MySpacing.width(4),
                MyText.labelMedium(
                  dailyExercise.type,
                  fontSize: 12,
                  fontWeight: 600,
                  xMuted: true,
                ),
              ],
            ),
          ),
          MySpacing.width(16),
          MyContainer(
              borderRadiusAll: 4,
              paddingAll: 0,
              margin: MySpacing.bottom(16),
              height: 50,
              width: 90,
              child: _buildSingleChart(dailyExercise.color, dailyExercise.chartData)),
        ],
      ),
    );
  }

  SfCartesianChart _buildSingleChart(Color color, List<SplineAreaData> data) {
    return SfCartesianChart(
      plotAreaBorderWidth: 0,
      margin: EdgeInsets.zero,
      primaryXAxis:
          NumericAxis(isVisible: false, interval: 1, majorGridLines: MajorGridLines(width: 0), edgeLabelPlacement: EdgeLabelPlacement.shift),
      primaryYAxis: NumericAxis(isVisible: false, axisLine: AxisLine(width: 0), majorTickLines: MajorTickLines(size: 0)),
      series: [
        SplineAreaSeries<SplineAreaData, double>(
          dataSource: data,
          gradient: LinearGradient(
            colors: [
              color.withAlpha(150),
              color.withAlpha(100),
              color.withAlpha(40),
              color.withAlpha(20),
            ],
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
          ),
          borderColor: color,
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
    return GetBuilder<AnalyticsController>(
        init: controller,
        tag: 'analytics_controller',
        builder: (controller) {
          return _buildBody();
        });
  }

  Widget _buildBody() {
    if (controller.uiLoading) {
      return Scaffold(
        body: Padding(
          padding: MySpacing.top(MySpacing.safeAreaTop(context) + 16),
          child: LoadingEffect.getSearchLoadingScreen(context),
        ),
      );
    } else {
      return Scaffold(
        appBar: AppBar(
          title: MyText.bodyLarge(
            'Today, Wed 1 Aug',
            fontWeight: 600,
          ),
          centerTitle: true,
          automaticallyImplyLeading: false,
          elevation: 0,
        ),
        body: ListView(
          padding: MySpacing.fromLTRB(20, 8, 20, 0),
          children: [
            MyContainer(
              borderRadiusAll: 4,
              padding: MySpacing.xy(16, 16),
              color: customTheme.fitnessPrimary.withAlpha(28),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      MyText.labelMedium(
                        'Total calories',
                        xMuted: true,
                        letterSpacing: 0.3,
                      ),
                      MySpacing.height(6),
                      MyText.bodyLarge(
                        '789 Cal',
                        fontWeight: 700,
                      ),
                    ],
                  ),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      MyText.labelMedium(
                        'Active calories',
                        xMuted: true,
                        letterSpacing: 0.3,
                      ),
                      MySpacing.height(6),
                      Row(
                        children: [
                          Icon(
                            Icons.local_fire_department,
                            color: customTheme.fitnessPrimary,
                            size: 20,
                          ),
                          MySpacing.width(2),
                          MyText.bodyLarge(
                            '423 Cal',
                            fontWeight: 700,
                          ),
                        ],
                      ),
                    ],
                  ),
                ],
              ),
            ),
            MySpacing.height(16),
            _buildAngleRadialBarChart(),
            MySpacing.height(20),
            Column(
              children: _buildSingleExerciseList(),
            ),
          ],
        ),
      );
    }
  }
}
