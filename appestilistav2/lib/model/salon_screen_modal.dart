import 'package:home_helper_flutter_ui_kit/config/app_image.dart';

class SalonSliderModel {
  String? image;
  String? darkImage;
  String? title;
  String? subTitle;
  String? button;

  SalonSliderModel(
      {this.image, this.title, this.button, this.subTitle, this.darkImage});
}

List<SalonSliderModel> salonSliderList = [
  SalonSliderModel(image: AppImage.salonImg),
  SalonSliderModel(image: AppImage.salonImg),
  SalonSliderModel(image: AppImage.salonImg),
  SalonSliderModel(image: AppImage.salonImg),
  SalonSliderModel(image: AppImage.salonImg),
];
