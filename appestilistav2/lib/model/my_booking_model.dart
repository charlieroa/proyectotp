import 'package:get/get.dart';

class MyBookingModel {
  String? title;
  String? image;
  String? darkImage;
  String? name;
  String? callType;
  String? price;
  String? subTitle;
  RxBool? isSelected = false.obs;

  MyBookingModel(
      {this.title,
      this.image,
      this.name,
      this.callType,
      this.subTitle,
      this.price,
      this.darkImage});
}
