import 'package:flutkit/full_apps/animations/plant/controller/plant_home_controller.dart';
import 'package:flutkit/full_apps/animations/plant/model/plant_data.dart';
import 'package:flutkit/full_apps/animations/plant/views/plant_single_product.dart';
import 'package:flutkit/helpers/theme/app_theme.dart';
import 'package:flutkit/helpers/utils/my_shadow.dart';
import 'package:flutkit/helpers/widgets/my_card.dart';
import 'package:flutkit/helpers/widgets/my_container.dart';
import 'package:flutkit/helpers/widgets/my_spacing.dart';
import 'package:flutkit/helpers/widgets/my_text.dart';
import 'package:flutter/material.dart';
import 'package:get/get.dart';

class PlantHomeScreen extends StatefulWidget {
  final BuildContext rootContext;

  const PlantHomeScreen({super.key, required this.rootContext});

  @override
  State<PlantHomeScreen> createState() => _PlantHomeScreenState();
}

class _PlantHomeScreenState extends State<PlantHomeScreen>
    with TickerProviderStateMixin {
  late PlantHomeController controller;

  @override
  void initState() {
    controller = PlantHomeController();
    super.initState();
  }

  @override
  Widget build(BuildContext context) {
    return GetBuilder<PlantHomeController>(
      init: controller,
      tag: 'plant_home_controller',
      builder: (controller) {
        return Scaffold(
          appBar: AppBar(
            elevation: 1,
            automaticallyImplyLeading: false,
            title: MyText.titleMedium(
              'Products',
              fontWeight: 600,
            ),
            centerTitle: true,
          ),
          body: Padding(
            padding: MySpacing.fromLTRB(16, 16, 16, 0),
            child: ListView(
              clipBehavior: Clip.antiAliasWithSaveLayer,
              physics: BouncingScrollPhysics(
                  decelerationRate: ScrollDecelerationRate.normal),
              children: [
                MyContainer(
                  paddingAll: 0,
                  padding: MySpacing.xy(12, 12),
                  borderRadiusAll: 12,
                  height: 100,
                  color: AppTheme.plantTheme.colorScheme.primary.withAlpha(60),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Column(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          MyText.bodyMedium(
                            'Sales',
                            fontSize: 20,
                            fontWeight: 600,
                            color: AppTheme.plantTheme.colorScheme.primary,
                          ),
                          MyText.titleLarge(
                            '50% off',
                            fontWeight: 600,
                            muted: true,
                          ),
                          MyText.bodyMedium(
                            '1 - 10 September 2024',
                            fontWeight: 600,
                            xMuted: true,
                          )
                        ],
                      ),
                      Image.asset(
                        'assets/images/full_apps/plant/images/16.png',
                        fit: BoxFit.cover,
                      )
                    ],
                  ),
                ),
                MySpacing.height(16),
                Column(
                  children: buildProducts(),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  List<Widget> buildProducts() {
    List<Widget> list = [];

    for (Plant plants in controller.plant) {
      list.add(getSingleProducts(plants));
      list.add(MySpacing.height(12));
    }
    return list;
  }

  Widget getSingleProducts(Plant plant) {
    return PlantSingleContainer(plant: plant);
  }
}

class PlantSingleContainer extends StatefulWidget {
  final Plant plant;

  const PlantSingleContainer({super.key, required this.plant});

  @override
  State<PlantSingleContainer> createState() => _PlantSingleContainerState();
}

class _PlantSingleContainerState extends State<PlantSingleContainer> {
  bool isLiked = false;

  @override
  Widget build(BuildContext context) {
    return MyCard(
      onTap: () {
        Get.to(
            duration: Duration(milliseconds: 600),
            transition: Transition.fade,
            PlantSingleProduct(widget.plant, '${UniqueKey()}'));
      },
      shadow: MyShadow(elevation: 1),
      paddingAll: 12,
      borderRadiusAll: 12,
      child: Row(
        children: [
          MyContainer(
            borderRadiusAll: 12,
            clipBehavior: Clip.antiAliasWithSaveLayer,
            paddingAll: 0,
            color: widget.plant.color,
            child: Hero(
              tag: widget.plant.image,
              child: Image.asset(
                widget.plant.image,
                height: 90,
                width: 90,
                fit: BoxFit.contain,
              ),
            ),
          ),
          MySpacing.width(16),
          Expanded(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.end,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                MyText.titleMedium(
                  widget.plant.title,
                  fontWeight: 600,
                ),
                MySpacing.height(4),
                MyText.bodySmall(
                  "\$ ${widget.plant.price}",
                  fontSize: 16,
                  fontWeight: 600,
                ),
                MySpacing.height(4),
                MyText.titleMedium(
                  widget.plant.description,
                  overflow: TextOverflow.ellipsis,
                  maxLines: 2,
                  fontWeight: 600,
                  fontSize: 12,
                  muted: true,
                ),
              ],
            ),
          ),
          Padding(
            padding: MySpacing.bottom(40),
            child: IconButton(
              onPressed: () {
                setState(() {
                  isLiked = !isLiked;
                });
              },
              icon: Icon(
                !isLiked ? Icons.favorite_outline : Icons.favorite,
                size: 24,
                color: AppTheme.plantTheme.colorScheme.primary,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
