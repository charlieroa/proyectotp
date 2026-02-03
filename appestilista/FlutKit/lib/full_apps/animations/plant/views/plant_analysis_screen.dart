import 'package:flutkit/full_apps/animations/plant/controller/analysis_controller.dart';

import 'package:flutkit/helpers/theme/app_theme.dart';
import 'package:flutkit/helpers/widgets/my_container.dart';
import 'package:flutkit/helpers/widgets/my_spacing.dart';
import 'package:flutkit/helpers/widgets/my_text.dart';
import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:flutter_lucide/flutter_lucide.dart';
import 'package:syncfusion_flutter_charts/charts.dart';

class AnalysisScreen extends StatefulWidget {
  const AnalysisScreen({super.key});

  @override
  State<AnalysisScreen> createState() => _AnalysisScreenState();
}

class _AnalysisScreenState extends State<AnalysisScreen> {
  late AnalysisController controller;
  @override
  void initState() {
    controller = AnalysisController();
    super.initState();
  }

  @override
  Widget build(BuildContext context) {
    return GetBuilder<AnalysisController>(
      init: controller,
      tag: 'analysis_controller',
      builder: (controller) {
        return Scaffold(
          appBar: AppBar(
            elevation: 1,
            title: MyText.titleMedium(
              'Plant Analysis',
              fontSize: 20,
              fontWeight: 600,
            ),
            automaticallyImplyLeading: false,
            centerTitle: true,
          ),
          body: Padding(
            padding: MySpacing.xy(20, 16),
            child: Column(
              children: [
                buildWaterAnalysis(),
                MySpacing.height(12),
                MyContainer(
                  borderRadiusAll: 8,
                  child: Column(
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          MyText.titleMedium('Last Activity'),
                          MyText.titleMedium('See All'),
                        ],
                      ),
                      Divider(
                        height: 40,
                        thickness: 2,
                      ),
                      buildActivity(
                        LucideIcons.droplet,
                        'Plant Lighting',
                        '1 Day ago',
                      ),
                      MySpacing.height(16),
                      buildActivity(
                        LucideIcons.scissors,
                        'Plant Prune',
                        '5 Day ago',
                      ),
                      MySpacing.height(16),
                      buildActivity(
                        LucideIcons.search,
                        'Plant Inspect',
                        '1 Day ago',
                      ),
                    ],
                  ),
                ),

              ],
            ),
          ),
        );
      },
    );
  }

  Widget buildWaterAnalysis() {
    return MyContainer(
        height: 300,
        color: AppTheme.plantTheme.colorScheme.primary.withAlpha(80),
        borderRadiusAll: 8,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(child: MyText.titleMedium('Watering')),
                Icon(
                  LucideIcons.clock,
                  size: 16,
                )
              ],
            ),
            MySpacing.height(8),
            MyText.bodyMedium('3 Days'),
            MySpacing.height(12),
            Expanded(
              child: SfCartesianChart(
                plotAreaBorderWidth: 0,
                tooltipBehavior: TooltipBehavior(enable: true),
                series: [
                  SplineSeries<ChartData, int>(
                    color: AppTheme.plantTheme.colorScheme.primary,
                    dataSource: controller.chartData,
                    xValueMapper: (ChartData data, _) => data.x,
                    yValueMapper: (ChartData data, _) => data.y,
                  ),
                ],
              ),
            ),
          ],
        ));
  }

  Widget buildActivity(
      IconData icon, String activityTitle, String activitySubTitle) {
    return Row(
      children: [
        MyContainer.rounded(
          paddingAll: 8,
          color: AppTheme.plantTheme.colorScheme.primary.withAlpha(38),
          child: Icon(
            icon,
            size: 16,
            color: AppTheme.plantTheme.colorScheme.primary,
          ),
        ),
        MySpacing.width(12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              MyText.titleMedium(
                activityTitle,
                fontWeight: 600,
              ),
              MyText.bodySmall(
                activitySubTitle,
                muted: true,
              )
            ],
          ),
        ),
        Icon(LucideIcons.move_right)
      ],
    );
  }
}
