import 'package:flutter/material.dart';
import 'package:home_helper_flutter_ui_kit/config/app_color.dart';
import 'package:home_helper_flutter_ui_kit/config/app_string.dart';

import '../config/app_image.dart';

class OnBoarding {
  String? title1;
  String? title2;
  String? image;
  Color? color;
  OnBoarding({
    this.title1,
    this.title2,
    this.image,
    this.color,
  });
}

List<OnBoarding> onBoardingList = [
  OnBoarding(
      color: AppColor.onBoardingImage1BgColor,
      title1: "Bienvenido a TuPelukeria",
      title2: "La plataforma completa para gestionar tu salón de belleza",
      image: AppImage.onBoardingImage1),
  OnBoarding(
      color: AppColor.onBoardingImage2BgColor,
      title1: "Gestiona tus Citas",
      title2: "Acepta o rechaza citas pendientes de forma rápida y sencilla",
      image: AppImage.onBoardingImage2),
  OnBoarding(
      color: AppColor.onBoardingImage3BgColor,
      title1: "Controla tu Trabajo",
      title2: "Revisa tus ganancias, servicios realizados y mucho más",
      image: AppImage.onBoardingImage3),
];
List<OnBoarding> darkOnBoardingList = [
  OnBoarding(
      color: AppColor.onBoardingImage3BgColor,
      title1: "Bienvenido a TuPelukeria",
      title2: "La plataforma completa para gestionar tu salón de belleza",
      image: AppImage.onBoardingImage1),
  OnBoarding(
      color: AppColor.onBoardingImage1Bg,
      title1: "Gestiona tus Citas",
      title2: "Acepta o rechaza citas pendientes de forma rápida y sencilla",
      image: AppImage.onBoardingImage2),
  OnBoarding(
      color: AppColor.onBoardingImage1Bg,
      title1: "Controla tu Trabajo",
      title2: "Revisa tus ganancias, servicios realizados y mucho más",
      image: AppImage.onBoardingImage3),
];
