import 'package:flutkit/full_apps/other/fitness/models/charts_sample_data.dart';
import 'package:flutkit/full_apps/other/fitness/models/daily_exercise.dart';
import 'package:flutkit/full_apps/other/fitness/models/spline_area_data.dart';
import 'package:flutkit/full_apps/other/fitness/views/statistics_screen.dart';
import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:syncfusion_flutter_charts/charts.dart';

class AnalyticsController extends GetxController {
  bool showLoading = true, uiLoading = true;
  List<DailyExercise>? dailyExercises;

  List<IconData> icons = [
    Icons.directions_run,
    Icons.fitness_center,
    Icons.directions_bike,
  ];

  List<ChartSampleData> chartData = [];

  @override
  void onInit() {
    fetchData();
    super.onInit();
  }

  void fetchData() async {
    dailyExercises = await DailyExercise.getDummyList();
    chartData.clear();
    for (DailyExercise dailyExercise in dailyExercises!) {
      chartData.add(ChartSampleData(
          x: '',
          y: dailyExercise.achieveData! * 100 ~/ dailyExercise.goalData!,
          text: dailyExercise.name,
          xValue: null,
          pointColor: dailyExercise.color));
    }
    await Future.delayed(Duration(seconds: 1));
    showLoading = false;
    uiLoading = false;
    update();
  }

  void goToStatisticsScreen(DailyExercise dailyExercise, IconData icon) {
    Get.to(StatisticsScreen(dailyExercise, icon));
    // Navigator.push(
    //   context,
    //   MaterialPageRoute(
    //     builder: (context) => StatisticsScreen(dailyExercise, icon),
    //   ),
    // );
  }

  List<ChartSeries<SplineAreaData, double>> getAreaSeries(
      Color color, List<SplineAreaData> data) {
    return [
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
      ),
    ];
  }
}
