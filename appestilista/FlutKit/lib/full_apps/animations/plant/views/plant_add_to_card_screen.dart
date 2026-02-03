import 'package:flutkit/full_apps/animations/plant/controller/plant_add_to_card_controller.dart';

import 'package:flutkit/helpers/theme/app_theme.dart';
import 'package:flutkit/helpers/widgets/my_button.dart';
import 'package:flutkit/helpers/widgets/my_container.dart';
import 'package:flutkit/helpers/widgets/my_spacing.dart';
import 'package:flutkit/helpers/widgets/my_text.dart';
import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:flutter_lucide/flutter_lucide.dart';

class PlantAddToCardScreen extends StatefulWidget {
  const PlantAddToCardScreen({super.key});

  @override
  State<PlantAddToCardScreen> createState() => _PlantAddToCardScreenState();
}

class _PlantAddToCardScreenState extends State<PlantAddToCardScreen>
    with TickerProviderStateMixin {
  late PlantAddToCardController controller;
  late OutlineInputBorder outlineInputBorder;

  @override
  void initState() {
    controller = PlantAddToCardController();
    outlineInputBorder = OutlineInputBorder(
      borderRadius: BorderRadius.all(
        Radius.circular(12),
      ),
    );
    super.initState();
  }

  @override
  Widget build(BuildContext context) {
    return GetBuilder<PlantAddToCardController>(
      init: controller,
      tag: 'plant_add_to_card_controller',
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
                  onPressed: () {},
                  child: MyText.bodyMedium(
                    'Pay',
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
            title: MyText.titleMedium('Add Card Detail'),
            centerTitle: true,
            leading: IconButton(
              onPressed: () => Navigator.of(context).pop(),
              icon: Icon(LucideIcons.move_left),
            ),
          ),
          body: Padding(
            padding: MySpacing.xy(20, 12),
            child: ListView(
              children: [
                buildCreditCard(),
                MySpacing.height(12),
                buildCardFields(),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget buildCardFields() {
    return Column(
      children: [
        Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            MyText.bodyMedium('Card Number', fontWeight: 600),
            MySpacing.height(8),
            TextFormField(
              clipBehavior: Clip.antiAliasWithSaveLayer,
              controller: controller.cardNumberController,
              decoration: InputDecoration(
                contentPadding: MySpacing.xy(12, 16),
                fillColor: theme.colorScheme.surface,
                border: outlineInputBorder,
                enabledBorder: outlineInputBorder,
                errorBorder: outlineInputBorder,
                focusedErrorBorder: outlineInputBorder,
                focusedBorder: outlineInputBorder,
                disabledBorder: outlineInputBorder,
                floatingLabelBehavior: FloatingLabelBehavior.never,
                filled: true,
                isDense: true,
              ),
              keyboardType: TextInputType.number,
            ),
          ],
        ),
        MySpacing.height(12),
        Row(
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  MyText.bodyMedium(
                    'Expire Date',
                    fontWeight: 600,
                  ),
                  MySpacing.height(8),
                  TextFormField(
                    clipBehavior: Clip.antiAliasWithSaveLayer,
                    controller: controller.expiryDateController,
                    decoration: InputDecoration(
                      contentPadding: MySpacing.xy(12, 16),
                      fillColor: theme.colorScheme.surface,
                      border: outlineInputBorder,
                      enabledBorder: outlineInputBorder,
                      errorBorder: outlineInputBorder,
                      focusedErrorBorder: outlineInputBorder,
                      focusedBorder: outlineInputBorder,
                      disabledBorder: outlineInputBorder,
                      floatingLabelBehavior: FloatingLabelBehavior.never,
                      filled: true,
                      isDense: true,
                    ),
                    keyboardType: TextInputType.number,
                  ),
                ],
              ),
            ),
            MySpacing.width(12),
            Expanded(
                child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                MyText.bodyMedium(
                  'Secure Code',
                  fontWeight: 600,
                ),
                MySpacing.height(8),
                TextFormField(
                  clipBehavior: Clip.antiAliasWithSaveLayer,
                  controller: controller.secureCodeController,
                  decoration: InputDecoration(
                    contentPadding: MySpacing.xy(12, 16),
                    fillColor: theme.colorScheme.surface,
                    border: outlineInputBorder,
                    enabledBorder: outlineInputBorder,
                    errorBorder: outlineInputBorder,
                    focusedErrorBorder: outlineInputBorder,
                    focusedBorder: outlineInputBorder,
                    disabledBorder: outlineInputBorder,
                    floatingLabelBehavior: FloatingLabelBehavior.never,
                    filled: true,
                    isDense: true,
                  ),
                  keyboardType: TextInputType.number,
                ),
              ],
            ))
          ],
        ),
        MySpacing.height(12),
        Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            MyText.bodyMedium(
              'Name On Card',
              fontWeight: 600,
            ),
            MySpacing.height(8),
            TextFormField(
              clipBehavior: Clip.antiAliasWithSaveLayer,
              controller: controller.nameOnCardController,
              decoration: InputDecoration(
                contentPadding: MySpacing.xy(12, 16),
                fillColor: theme.colorScheme.surface,
                border: outlineInputBorder,
                enabledBorder: outlineInputBorder,
                errorBorder: outlineInputBorder,
                focusedErrorBorder: outlineInputBorder,
                focusedBorder: outlineInputBorder,
                disabledBorder: outlineInputBorder,
                floatingLabelBehavior: FloatingLabelBehavior.never,
                filled: true,
                isDense: true,
              ),
              keyboardType: TextInputType.number,
            ),
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
      color: AppTheme.plantTheme.colorScheme.primary,
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
                letterSpacing: 4,
                fontSize: 20,
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
}
