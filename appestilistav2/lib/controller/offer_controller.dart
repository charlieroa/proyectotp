import 'package:get/get.dart';
import 'package:home_helper_flutter_ui_kit/config/app_string.dart';

import '../model/offer_model.dart';

class OfferController extends GetxController {
  List<OfferModel> offerList = [
    OfferModel(title: AppString.per30, subTitle: AppString.offer1),
    OfferModel(title: AppString.per60, subTitle: AppString.offer2),
    OfferModel(title: AppString.per50, subTitle: AppString.offer3),
    OfferModel(title: AppString.per25, subTitle: AppString.offer1),
    OfferModel(title: AppString.per60, subTitle: AppString.offer4),
  ];
}
