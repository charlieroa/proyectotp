import 'package:flutkit/full_apps/animations/plant/controller/plant_payment_detail_controller.dart';

import 'package:flutkit/helpers/theme/app_theme.dart';
import 'package:flutkit/helpers/utils/my_shadow.dart';
import 'package:flutkit/helpers/widgets/my_button.dart';
import 'package:flutkit/helpers/widgets/my_card.dart';
import 'package:flutkit/helpers/widgets/my_container.dart';
import 'package:flutkit/helpers/widgets/my_spacing.dart';
import 'package:flutkit/helpers/widgets/my_text.dart';
import 'package:flutkit/images.dart';
import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:flutter_lucide/flutter_lucide.dart';

class PlantPaymentDetailScreen extends StatefulWidget {
  const PlantPaymentDetailScreen({super.key});

  @override
  State<PlantPaymentDetailScreen> createState() =>
      _PlantPaymentDetailScreenState();
}

class _PlantPaymentDetailScreenState extends State<PlantPaymentDetailScreen>
    with TickerProviderStateMixin {
  late PlantPaymentDetailController controller;

  @override
  void initState() {
    controller = PlantPaymentDetailController();
    super.initState();
  }

  @override
  Widget build(BuildContext context) {
    return GetBuilder<PlantPaymentDetailController>(
      init: controller,
      tag: 'plant_payment_detail_controller',
      builder: (controller) {
        return Scaffold(
          floatingActionButtonLocation:
              FloatingActionButtonLocation.centerFloat,
          floatingActionButton: Padding(
            padding: MySpacing.x(20),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                MyButton.block(
                  elevation: 0,
                  padding: MySpacing.y(20),
                  borderRadiusAll: 8,
                  backgroundColor: AppTheme.plantTheme.colorScheme.primary,
                  onPressed: () {
                    showSnackBarWithPayment();
                  },
                  child: MyText.bodyMedium(
                    'Proceed To Payment',
                    fontWeight: 600,
                    fontSize: 16,
                    color: AppTheme.plantTheme.colorScheme.surface,
                  ),
                ),

              ],
            ),
          ),
          appBar: AppBar(
            elevation: 1,
            title: MyText.titleMedium('Payment Detail'),
            centerTitle: true,
            leading: IconButton(
              onPressed: () => Navigator.of(context).pop(),
              icon: Icon(LucideIcons.move_left),
            ),
          ),
          body: Padding(
            padding: MySpacing.xy(12, 12),
            child: buildBody(),
          ),
        );
      },
    );
  }

  Widget buildBody() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        MyCard(
            padding: MySpacing.xy(20, 12),
            shadow: MyShadow(elevation: 1, darkShadow: true),
            borderRadiusAll: 8,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    MyText.bodyMedium(
                      'Credit Card',
                      fontSize: 16,
                      fontWeight: 600,
                    ),
                    Icon(
                      LucideIcons.move_right,
                      // color: AppTheme.plantTheme.colorScheme.surface,
                      size: 18,
                    )
                  ],
                ),
                MySpacing.height(12),
                buildPaymentCart(),
                MySpacing.height(16),
                buildCreditCard(),
                MySpacing.height(8),
                Center(
                  child: InkWell(
                    onTap: () {
                      controller.gotoAddToCardScreen();
                    },
                    child: MyText.bodyMedium(
                      'Add Card',
                      fontWeight: 600,
                      color: AppTheme.plantTheme.colorScheme.primary,
                    ),
                  ),
                )
              ],
            )),
        MySpacing.height(12),
        buildPaymentDetail('Google Pay'),
        MySpacing.height(12),
        buildPaymentDetail('Debit Card'),
        MySpacing.height(12),
        buildPaymentDetail('Mobile Banking'),
      ],
    );
  }

  Widget buildPaymentCart() {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Column(
          children: [
            MyContainer.bordered(
              height: 44,
              width: 60,
              paddingAll: 0,
              clipBehavior: Clip.antiAliasWithSaveLayer,
              onTap: () {
                controller.selectCard(1);
              },
              borderRadiusAll: 12,
              border: Border.all(
                  width: 2,
                  color: controller.selectedPaymentCart == 1
                      ? AppTheme.plantTheme.colorScheme.primary
                      : Colors.transparent),
              child: ClipRRect(
                borderRadius: BorderRadius.circular(12),
                clipBehavior: Clip.antiAliasWithSaveLayer,
                child: Image.asset(
                  Images.visaCard,
                  fit: BoxFit.cover,
                ),
              ),
            ),
            IconButton(
                constraints: BoxConstraints(maxHeight: 20, minHeight: 10),
                iconSize: 20,
                onPressed: () {
                  controller.selectCard(1);
                },
                icon: Icon(
                  controller.selectedPaymentCart == 1
                      ? LucideIcons.circle_check
                      : LucideIcons.circle,
                  color: controller.selectedPaymentCart == 1
                      ? AppTheme.plantTheme.colorScheme.primary
                      : Colors.black,
                )),
          ],
        ),
        Column(
          children: [
            MyContainer.bordered(
              height: 44,
              width: 60,
              paddingAll: 0,
              clipBehavior: Clip.antiAliasWithSaveLayer,
              onTap: () {
                controller.selectCard(2);
              },
              borderRadiusAll: 12,
              border: Border.all(
                  width: 2,
                  color: controller.selectedPaymentCart == 2
                      ? AppTheme.plantTheme.colorScheme.primary
                      : Colors.transparent),
              child: ClipRRect(
                borderRadius: BorderRadius.circular(12),
                clipBehavior: Clip.antiAliasWithSaveLayer,
                child: Image.asset(
                  Images.masterCard,
                  fit: BoxFit.cover,
                ),
              ),
            ),
            IconButton(
                constraints: BoxConstraints(maxHeight: 20, minHeight: 10),
                iconSize: 20,
                onPressed: () {
                  controller.selectCard(2);
                },
                icon: Icon(
                  controller.selectedPaymentCart == 2
                      ? LucideIcons.circle_check
                      : LucideIcons.circle,
                  color: controller.selectedPaymentCart == 2
                      ? AppTheme.plantTheme.colorScheme.primary
                      : Colors.black,
                )),
          ],
        ),
        Column(
          children: [
            MyContainer.bordered(
              height: 44,
              width: 60,
              paddingAll: 0,
              clipBehavior: Clip.antiAliasWithSaveLayer,
              onTap: () {
                controller.selectCard(3);
              },
              borderRadiusAll: 12,
              border: Border.all(
                  width: 2,
                  color: controller.selectedPaymentCart == 3
                      ? AppTheme.plantTheme.colorScheme.primary
                      : Colors.transparent),
              child: ClipRRect(
                borderRadius: BorderRadius.circular(12),
                clipBehavior: Clip.antiAliasWithSaveLayer,
                child: Image.asset(
                  Images.ruPayCard,
                  fit: BoxFit.cover,
                ),
              ),
            ),
            IconButton(
                constraints: BoxConstraints(maxHeight: 20, minHeight: 10),
                iconSize: 20,
                onPressed: () {
                  controller.selectCard(3);
                },
                icon: Icon(
                  controller.selectedPaymentCart == 3
                      ? LucideIcons.circle_check
                      : LucideIcons.circle,
                  color: controller.selectedPaymentCart == 3
                      ? AppTheme.plantTheme.colorScheme.primary
                      : Colors.black,
                )),
          ],
        ),
      ],
    );
  }

  Widget buildCreditCard() {
    return MyContainer(
      paddingAll: 0,
      padding: MySpacing.xy(12, 12),
      borderRadiusAll: 12,
      clipBehavior: Clip.antiAliasWithSaveLayer,
      height: 200,
      color: Colors.black.withAlpha(180),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              MyText.bodyMedium(
                'Payment Details',
                color: AppTheme.plantTheme.colorScheme.surface,
                fontWeight: 800,
                fontSize: 16,
              ),
            ],
          ),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              MyText.bodyMedium(
                'Card Number',
                color: AppTheme.plantTheme.colorScheme.surface,
                fontSize: 12,
                fontWeight: 600,
              ),
              MyText.bodyLarge(
                '4589 6584 2157 4723',
                letterSpacing: 5,
                color: AppTheme.plantTheme.colorScheme.surface,
                fontWeight: 600,
              )
            ],
          ),
          Row(
            mainAxisAlignment: MainAxisAlignment.end,
            children: [
              Column(
                mainAxisAlignment: MainAxisAlignment.end,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  MyText.bodyMedium(
                    'Expiry',
                    fontSize: 12,
                    color: AppTheme.plantTheme.colorScheme.surface,
                    fontWeight: 600,
                  ),
                  MyText.bodyMedium(
                    '08 / 30',
                    color: AppTheme.plantTheme.colorScheme.surface,
                    fontWeight: 600,
                  ),
                ],
              ),
            ],
          ),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              MyText.bodyMedium(
                'ROSEANNE PARK',
                fontSize: 16,
                fontWeight: 600,
                letterSpacing: 3,
                color: AppTheme.plantTheme.colorScheme.surface,
              ),
              MyText.titleMedium(
                'VISA',
                textAlign: TextAlign.end,
                color: AppTheme.plantTheme.colorScheme.surface,
                fontWeight: 800,
                fontSize: 16,
              )
            ],
          ),
        ],
      ),
    );
  }

  Widget buildPaymentDetail(String name) {
    return MyCard(
      onTap: () => showSnackBarWithPayment(),
      shadow: MyShadow(elevation: 1, darkShadow: true),
      borderRadiusAll: 8,
      // color: AppTheme.plantTheme.colorScheme.primary,
      child: Row(
        children: [
          Expanded(
              child: MyText.bodyMedium(
            name,
            // color: AppTheme.plantTheme.colorScheme.surface,
            fontSize: 16,
            fontWeight: 600,
            muted: true,
          )),
          Icon(
            LucideIcons.move_right,
            // color: AppTheme.plantTheme.colorScheme.surface,
            size: 18,
          )
        ],
      ),
    );
  }

  void showSnackBarWithPayment() {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        elevation: 0,
        duration: Duration(milliseconds: 800),
        clipBehavior: Clip.antiAliasWithSaveLayer,
        content: Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            MyText.titleSmall("Payment Successful",
                fontWeight: 600,
                color: AppTheme.plantTheme.colorScheme.onPrimary),
            Icon(
              LucideIcons.badge_check,
              size: 20,
              color: AppTheme.plantTheme.colorScheme.surface,
            ),
          ],
        ),
        backgroundColor: AppTheme.plantTheme.colorScheme.primary,
        behavior: SnackBarBehavior.fixed,
      ),
    );
  }
}
