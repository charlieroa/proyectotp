import 'package:flutkit/full_apps/animations/food/models/review.dart';
import 'package:get/get.dart';

class ReviewController extends GetxController {
  List<Review> reviews=[];

  @override
  void onInit() {
    Review.dummyList.then((value) {
      reviews = value;
      update();
    });
    super.onInit();
  }


  void goBack() {
    Get.back();
  }

}
