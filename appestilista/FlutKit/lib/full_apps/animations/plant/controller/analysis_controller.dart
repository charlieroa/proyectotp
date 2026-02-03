import 'package:get/get.dart';

class ChartData {
  ChartData(this.x, this.y);
  final int x;
  final double? y;
}

class AnalysisController extends GetxController {
  final List<ChartData> chartData = [
    ChartData(2010, 1),
    ChartData(2011, 5),
    ChartData(2012, 2),
    ChartData(2013, 9),
    ChartData(2014, 2)
  ];
}
