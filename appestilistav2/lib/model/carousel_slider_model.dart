import 'package:home_helper_flutter_ui_kit/config/app_image.dart';

class CarouselSliderModel {
  String? image;

  CarouselSliderModel({this.image});
}

List<CarouselSliderModel> carouselSliderList = [
  CarouselSliderModel(image: AppImage.carouseSlider1),
  CarouselSliderModel(image: AppImage.carouseSlider2),
  CarouselSliderModel(image: AppImage.carouseSlider3),
];
