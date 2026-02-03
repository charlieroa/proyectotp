import 'dart:io';

import 'package:get/get.dart';
import 'package:home_helper_flutter_ui_kit/config/app_string.dart';
import 'package:home_helper_flutter_ui_kit/model/my_booking_model.dart';
import 'package:image_picker/image_picker.dart';

import '../config/app_image.dart';

class MyBookingController extends GetxController {
  RxList<File?> selectedImagesImage = <File?>[].obs;
  RxList allImage = [].obs;
  void selectImagesFromGallery3() async {
    final List<XFile> images = await ImagePicker().pickMultiImage(
      imageQuality: 60,
    );

    for (XFile image in images) {
      if (selectedImagesImage.length < 10) {
        selectedImagesImage.add(File(image.path));
        update();
      }
    }
  }

  RxList<MyBookingModel> myBookingList = [
    MyBookingModel(
      title: AppString.hairCutForMane,
      image: AppImage.haircutImage,
    ),
    MyBookingModel(
      title: AppString.haircutForkidsAnd1more,
      image: AppImage.hairCutKids,
    ),
    MyBookingModel(
      title: AppString.tanReductionMask,
      image: AppImage.faceCareImg,
    ),
    MyBookingModel(
      title: AppString.faceMassage,
      image: AppImage.massageImg1,
    ),
  ].obs;
  RxList<MyBookingModel> bookingStatusList1 = [
    MyBookingModel(title: AppString.pending, image: AppImage.haircutImage),
    MyBookingModel(title: AppString.completed, image: AppImage.hairCutKids),
    MyBookingModel(title: AppString.cancelled, image: AppImage.faceCareImg),
  ].obs;
  RxList<MyBookingModel> reviewList = [
    MyBookingModel(title: AppString.rate5),
    MyBookingModel(title: AppString.rate4),
    MyBookingModel(title: AppString.rate3),
    MyBookingModel(title: AppString.rate2),
    MyBookingModel(title: AppString.rate1),
  ].obs;
  RxList<MyBookingModel> bookingStatusList2 = [
    MyBookingModel(title: AppString.last30Days, image: AppImage.haircutImage),
    MyBookingModel(title: AppString.last3Months, image: AppImage.haircutImage),
    MyBookingModel(
      title: AppString.year2023,
      image: AppImage.haircutImage,
    ),
    MyBookingModel(
      title: AppString.year2022,
      image: AppImage.hairCutKids,
    ),
    MyBookingModel(
      title: AppString.year2021,
      image: AppImage.faceCareImg,
    ),
    MyBookingModel(
      title: AppString.year2020,
      image: AppImage.massageImg1,
    ),
    MyBookingModel(
      title: AppString.year2019,
      image: AppImage.massageImg1,
    ),
    MyBookingModel(
      title: AppString.year2018,
      image: AppImage.massageImg1,
    ),
    MyBookingModel(
      title: AppString.year2017,
      image: AppImage.massageImg1,
    )
  ].obs;
}
