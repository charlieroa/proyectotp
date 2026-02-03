import 'package:flutkit/full_apps/animations/hr/controller/ui/home_controller.dart';
import 'package:flutkit/helpers/theme/app_theme.dart';
import 'package:flutkit/helpers/utils/my_shadow.dart';
import 'package:flutkit/helpers/widgets/my_card.dart';
import 'package:flutkit/helpers/widgets/my_container.dart';
import 'package:flutkit/helpers/widgets/my_spacing.dart';
import 'package:flutkit/helpers/widgets/my_text.dart';
import 'package:flutkit/helpers/widgets/my_text_style.dart';
import 'package:flutkit/images.dart';
import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:flutter_lucide/flutter_lucide.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  late ThemeData theme;
  late HomeController controller;

  @override
  void initState() {
    theme = AppTheme.employeeCommunication;
    controller = HomeController();
    super.initState();
  }

  @override
  Widget build(BuildContext context) {
    return GetBuilder<HomeController>(
      tag: 'home_controller',
      init: controller,
      builder: (controller) {
        return SafeArea(
          child: Scaffold(
            body: Padding(
              padding: MySpacing.fromLTRB(16, 28, 16, 12),
              child: SingleChildScrollView(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        RichText(
                          text: TextSpan(
                            children: [
                              TextSpan(
                                  text: "Hello, ${controller.greeting}\n",
                                  style: MyTextStyle.titleLarge(
                                      fontWeight: 600, muted: true)),
                              TextSpan(
                                  text: "Madeleine",
                                  style:
                                      MyTextStyle.titleLarge(fontWeight: 700)),
                            ],
                          ),
                        ),
                        Spacer(),
                        MyCard.bordered(
                          onTap: () => controller.goToProfile(),
                          borderRadiusAll: 100,
                          paddingAll: 2,
                          shadow: MyShadow(elevation: 5),
                          child: MyContainer.rounded(
                            paddingAll: 0,
                            height: 70,
                            child: Image.asset(
                              Images.profile1,
                              fit: BoxFit.cover,
                            ),
                          ),
                        )
                      ],
                    ),
                    MySpacing.height(20),
                    MyContainer(
                      color: theme.colorScheme.primary,
                      borderRadiusAll: 8,
                      padding: MySpacing.xy(12, 12),
                      clipBehavior: Clip.antiAliasWithSaveLayer,
                      child: Row(
                        children: [
                          Expanded(
                            child: MyText.bodyMedium(
                              "You have 2 people to be hired",
                              fontWeight: 600,
                              letterSpacing: 0.5,
                              overflow: TextOverflow.ellipsis,
                              color: theme.colorScheme.onPrimary,
                            ),
                          ),
                          MyContainer.bordered(
                            onTap: () {},
                            borderRadiusAll: 8,
                            padding: MySpacing.xy(8, 8),
                            clipBehavior: Clip.antiAliasWithSaveLayer,
                            child: MyText.bodyMedium(
                              "Check Now",
                              fontWeight: 600,
                            ),
                          )
                        ],
                      ),
                    ),
                    MySpacing.height(20),
                    Wrap(
                      runSpacing: 14,
                      spacing: 14,
                      crossAxisAlignment: WrapCrossAlignment.start,
                      runAlignment: WrapAlignment.start,
                      alignment: WrapAlignment.start,
                      clipBehavior: Clip.antiAliasWithSaveLayer,
                      children: [
                        buildEmployeeSummary(LucideIcons.user_minus,
                            theme.colorScheme.primary, '0', 'Leaves'),
                        buildEmployeeSummary(LucideIcons.dollar_sign,
                            CustomTheme.green, '2', 'Salary'),
                        buildEmployeeSummary(LucideIcons.calendar_days,
                            CustomTheme.blue, '3', 'Half Day'),
                        buildEmployeeSummary(LucideIcons.hand_helping,
                            CustomTheme.orange, '6', 'Advance Salary'),
                      ],
                    ),
                    MySpacing.height(20),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        MyText.bodyLarge("Your Employee", fontWeight: 600),
                        InkWell(
                          onTap: () {
                            controller.goToEmployee();
                          },
                          child: MyText.bodyLarge(
                            "See All",
                            decoration: TextDecoration.underline,
                            fontWeight: 600,
                          ),
                        )
                      ],
                    ),
                    MySpacing.height(12),
                    SizedBox(
                      height: 100,
                      child: SingleChildScrollView(
                        clipBehavior: Clip.antiAliasWithSaveLayer,
                        scrollDirection: Axis.horizontal,
                        child: Row(
                          children: [
                            ListView.separated(
                              shrinkWrap: true,
                              clipBehavior: Clip.antiAliasWithSaveLayer,
                              scrollDirection: Axis.horizontal,
                              itemCount: controller.employeeList.length,
                              itemBuilder: (context, index) {
                                return MyContainer(
                                  width: 265,
                                  height: 100,
                                  clipBehavior: Clip.antiAliasWithSaveLayer,
                                  child: Row(
                                    children: [
                                      MyCard(
                                        borderRadiusAll: 100,
                                        shadow: MyShadow(elevation: 4),
                                        paddingAll: 4,
                                        child: MyContainer.rounded(
                                          height: 60,
                                          width: 60,
                                          clipBehavior:
                                              Clip.antiAliasWithSaveLayer,
                                          paddingAll: 0,
                                          child: Image.asset(
                                            Images.hrAvatars[index %
                                                Images.hrAvatars.length],
                                            fit: BoxFit.cover,
                                          ),
                                        ),
                                      ),
                                      MySpacing.width(12),
                                      Column(
                                        mainAxisAlignment:
                                            MainAxisAlignment.center,
                                        crossAxisAlignment:
                                            CrossAxisAlignment.start,
                                        children: [
                                          MyText.bodyLarge(
                                            controller.employeeList[index].name,
                                            fontWeight: 600,
                                          ),
                                          MySpacing.height(4),
                                          MyText.bodyMedium(
                                            controller.employeeList[index].role,
                                            fontWeight: 600,
                                            muted: true,
                                          ),
                                        ],
                                      ),
                                    ],
                                  ),
                                );
                              },
                              separatorBuilder: (context, index) {
                                return SizedBox(width: 12);
                              },
                            ),
                          ],
                        ),
                      ),
                    ),
                    MySpacing.height(20),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        MyText.bodyLarge("Recent Employee", fontWeight: 600),
                        InkWell(
                          onTap: () {
                            controller.goToEmployee();
                          },
                          child: MyText.bodyLarge(
                            "See All",
                            decoration: TextDecoration.underline,
                            fontWeight: 600,
                          ),
                        )
                      ],
                    ),
                    MySpacing.height(12),
                    SizedBox(
                      height: 100,
                      child: ListView.separated(
                        shrinkWrap: true,
                        clipBehavior: Clip.antiAliasWithSaveLayer,
                        scrollDirection: Axis.horizontal,
                        itemCount: controller.resentEmployeeList.length,
                        itemBuilder: (context, index) {
                          return MyContainer(
                            width: 265,
                            height: 100,
                            clipBehavior: Clip.antiAliasWithSaveLayer,
                            child: Row(
                              children: [
                                MyCard(
                                  borderRadiusAll: 100,
                                  shadow: MyShadow(elevation: 4),
                                  paddingAll: 4,
                                  child: MyContainer.rounded(
                                    height: 60,
                                    width: 60,
                                    clipBehavior: Clip.antiAliasWithSaveLayer,
                                    paddingAll: 0,
                                    child: Image.asset(
                                      Images.hrAvatars[
                                          index % Images.hrAvatars.length + 2],
                                      fit: BoxFit.cover,
                                    ),
                                  ),
                                ),
                                MySpacing.width(12),
                                Column(
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    MyText.bodyLarge(
                                      controller.resentEmployeeList[index].name,
                                      fontWeight: 600,
                                    ),
                                    MySpacing.height(4),
                                    MyText.bodyMedium(
                                      controller.resentEmployeeList[index].role,
                                      fontWeight: 600,
                                      muted: true,
                                    ),
                                  ],
                                ),
                              ],
                            ),
                          );
                        },
                        separatorBuilder: (context, index) {
                          return SizedBox(width: 12);
                        },
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        );
      },
    );
  }

  Widget buildEmployeeSummary(
      IconData icon, Color color, String title, String name) {
    return MyContainer(
      width: MediaQuery.of(context).size.width / 2.3,
      height: 110,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Row(
            children: [
              MyContainer.rounded(
                paddingAll: 8,
                clipBehavior: Clip.antiAliasWithSaveLayer,
                color: color.withAlpha(36),
                child: Icon(
                  icon,
                  color: color,
                ),
              ),
              Spacer(),
              MyText.bodyLarge(
                title,
                fontSize: 24,
                color: color,
                fontWeight: 600,
              )
            ],
          ),
          MyText.bodyLarge(
            name,
            fontWeight: 600,
            muted: true,
          )
        ],
      ),
    );
  }
}
