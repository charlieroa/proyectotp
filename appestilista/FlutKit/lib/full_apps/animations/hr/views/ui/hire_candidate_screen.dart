import 'package:flutkit/full_apps/animations/hr/controller/ui/hire_candidate_controller.dart';
import 'package:flutkit/helpers/theme/app_theme.dart';
import 'package:flutkit/helpers/widgets/my_container.dart';
import 'package:flutkit/helpers/widgets/my_spacing.dart';
import 'package:flutkit/helpers/widgets/my_text.dart';
import 'package:flutkit/helpers/widgets/my_text_style.dart';
import 'package:flutkit/images.dart';
import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:flutter_lucide/flutter_lucide.dart';

class HireCandidateScreen extends StatefulWidget {
  const HireCandidateScreen({super.key});

  @override
  State<HireCandidateScreen> createState() => _HireCandidateScreenState();
}

class _HireCandidateScreenState extends State<HireCandidateScreen> {
  late ThemeData theme;
  late HireCandidateController controller;

  @override
  void initState() {
    theme = AppTheme.employeeCommunication;
    controller = HireCandidateController();
    super.initState();
  }

  @override
  Widget build(BuildContext context) {
    return GetBuilder<HireCandidateController>(
      tag: 'hire_controller',
      init: controller,
      builder: (controller) {
        return SafeArea(
          child: Scaffold(
            body: Padding(
              padding: MySpacing.fromLTRB(16, 28, 16, 16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  MyText.titleLarge("Discover Candidates", fontWeight: 600),
                  MySpacing.height(16),
                  TextField(
                    controller: controller.searchController,
                    onChanged: controller.searchHireList,
                    decoration: InputDecoration(
                        filled: true,
                        hintText: "Search people",
                        hintStyle: MyTextStyle.bodyMedium(fontWeight: 600),
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(8),
                          borderSide: BorderSide.none,
                        ),
                        prefixIcon: Icon(LucideIcons.search, size: 20),
                        contentPadding: MySpacing.xy(12, 12)),
                  ),
                  MySpacing.height(16),
                  Expanded(
                    child: controller.searchList.isNotEmpty
                        ? ListView.separated(
                            shrinkWrap: true,
                            itemCount: controller.searchList.length,
                            itemBuilder: (context, index) {
                              return MyContainer(
                                paddingAll: 0,
                                borderRadiusAll: 8,
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Padding(
                                      padding: MySpacing.only(
                                          right: 16, left: 16, top: 12),
                                      child: Row(
                                        mainAxisAlignment:
                                            MainAxisAlignment.spaceBetween,
                                        children: [
                                          MyText.bodyLarge(
                                              controller.searchList[index].name,
                                              fontWeight: 600),
                                          MyContainer.rounded(
                                            paddingAll: 2,
                                            clipBehavior:
                                                Clip.antiAliasWithSaveLayer,
                                            child: MyContainer.rounded(
                                              paddingAll: 0,
                                              clipBehavior:
                                                  Clip.antiAliasWithSaveLayer,
                                              child: Image.asset(
                                                Images.hrAvatars[index %
                                                    Images.hrAvatars.length],
                                                fit: BoxFit.cover,
                                                width: 32,
                                                height: 32,
                                              ),
                                            ),
                                          )
                                        ],
                                      ),
                                    ),
                                    Divider(),
                                    Padding(
                                      padding:
                                          MySpacing.only(right: 16, left: 16),
                                      child: MyText.bodyLarge(
                                          controller.searchList[index].title,
                                          fontWeight: 600),
                                    ),
                                    Divider(),
                                    Padding(
                                      padding:
                                          MySpacing.only(right: 16, left: 16),
                                      child: MyText.bodyMedium(
                                          "Skills: ${controller.searchList[index].skill}",
                                          fontWeight: 600),
                                    ),
                                    Divider(),
                                    Padding(
                                      padding: MySpacing.only(
                                          right: 16, left: 16, bottom: 12),
                                      child: Row(
                                        mainAxisAlignment:
                                            MainAxisAlignment.spaceBetween,
                                        children: [
                                          MyText.bodySmall(
                                            controller
                                                .searchList[index].jobType,
                                            fontWeight: 600,
                                          ),
                                          MyText.bodySmall(
                                            controller.searchList[index].time,
                                            fontWeight: 600,
                                          ),
                                        ],
                                      ),
                                    ),
                                  ],
                                ),
                              );
                            },
                            separatorBuilder: (context, index) {
                              return SizedBox(
                                height: 16,
                              );
                            },
                          )
                        : Center(
                            child: MyText.bodyLarge(
                              '"${controller.searchController.text}" Search result not found',
                              fontWeight: 600,
                              textAlign: TextAlign.center,
                            ),
                          ),
                  ),
                ],
              ),
            ),
          ),
        );
      },
    );
  }
}
