import 'package:get/get.dart';
import 'package:home_helper_flutter_ui_kit/config/app_string.dart';
import '../config/app_image.dart';
import '../model/my_review_and_rating_model.dart';

class MyReviewAndRatingController extends GetxController{
  
  RxList<MyReviewAndRatingModel> myReviewAndRatingList = [
    MyReviewAndRatingModel( AppString.hairCutForMane, AppImage.haircutImage,  AppString.five, AppString.justGotAHairCutAndIMThrilled),
    MyReviewAndRatingModel( AppString.hairCutForKids,AppImage.hairCutKids, AppString.four, AppString.wowMyKidHairCutWasFantastic),
  ].obs;
  
}