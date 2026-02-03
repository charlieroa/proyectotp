import 'package:flutkit/full_apps/other/fitness/models/daily_exercise.dart';
import 'package:flutkit/full_apps/other/fitness/models/spline_area_data.dart';
import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:syncfusion_flutter_charts/charts.dart';

class StatisticsController extends GetxController {
  DailyExercise dailyExercise;
  IconData icon;

  StatisticsController(this.dailyExercise, this.icon);

  bool showLoading = true, uiLoading = true;

  @override
  void onInit() {
    // super.save = false;
    fetchData();
    super.onInit();
  }

  void fetchData() async {
    await Future.delayed(Duration(seconds: 1));
    showLoading = false;
    uiLoading = false;
    update();
  }

  void goBack() {
    Get.back();
    // Navigator.pop(context);
  }

  List<ChartSeries<SplineAreaData, double>> getSplineAreaSeries() {
    return <ChartSeries<SplineAreaData, double>>[
      SplineAreaSeries<SplineAreaData, double>(
        dataSource: dailyExercise.chartData,
        gradient: LinearGradient(
          colors: [
            dailyExercise.color.withAlpha(150),
            dailyExercise.color.withAlpha(100),
            dailyExercise.color.withAlpha(40),
            dailyExercise.color.withAlpha(20),
          ],
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
        ),
        borderColor: dailyExercise.color,
        borderWidth: 2,
        xValueMapper: (SplineAreaData sales, _) => sales.calories,
        yValueMapper: (SplineAreaData sales, _) => sales.day,
      ),
    ];
  }
}
