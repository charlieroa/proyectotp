import 'package:flutkit/full_apps/other/fitness/models/recent_exercise.dart';
import 'package:flutkit/full_apps/other/fitness/models/spline_area_data.dart';
import 'package:flutkit/full_apps/other/fitness/views/relaxation_screen.dart';
import 'package:flutkit/full_apps/other/fitness/views/subscription_screen.dart';
import 'package:get/get.dart';

class HomeController extends GetxController {
  bool showLoading = true, uiLoading = true;
  List<RecentExercise>? exercises;

  final List<SplineAreaData> chartData = <SplineAreaData>[
    SplineAreaData(
      1,
      1.2
    ),
    SplineAreaData(
      2,
      1.0
    ),
    SplineAreaData(
      3,
      1.5
    ),
    SplineAreaData(
      4,
      2.2
    ),
    SplineAreaData(
      5,
      2.5
    ),
    SplineAreaData(
      6,
      2.6
    ),
    SplineAreaData(
      7,
      2.8
    ),
    SplineAreaData(
      8,
      3.0
    ),
    SplineAreaData(
      9,
      2.5
    ),
    SplineAreaData(
      10,
      1.8
    ),
  ];

  @override
  void onInit() {
    fetchData();
    super.onInit();
  }

  void fetchData() async {
    exercises = await RecentExercise.getDummyList();
    await Future.delayed(Duration(seconds: 1));
    showLoading = false;
    uiLoading = false;
    update();
  }

  void goToSubscriptionScreen() {
    Get.to(SubscriptionScreen());
  }

  void goToRelaxationScreen() {
    Get.to(RelaxationScreen());
  }
}
