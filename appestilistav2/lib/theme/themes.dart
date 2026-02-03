import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:home_helper_flutter_ui_kit/config/app_icons.dart';
import 'package:home_helper_flutter_ui_kit/config/app_color.dart';
import 'package:home_helper_flutter_ui_kit/config/app_image.dart';

class AppTheme {
  AppTheme._({
    required this.starColor,
    required this.containerColor,
    required this.bottomSheetShadowColor,
    required this.textColor,
    required this.textColor2,
    required this.appBarShadowColor,
    required this.selectedBorder,
    required this.smallTextColor,
    required this.highLightColor,
    required this.selectedItemColor,
    required this.dividerColor,
    required this.textFieldColor,
    required this.buttonDisableColor,
    required this.progressBarColor,
    required this.appBarColor,
    required this.cardColor,
    required this.cardShadowColor,
    required this.hintColor,
    required this.secondaryColor,
    required this.primaryColor,
    required this.registrationStyle,
    required this.bottomShadow,
    required this.bottomColor,
    required this.menuColor,
    required this.radioColor,
    required this.tabBackground,
  });

  AppTheme.light()
      : this._(
            containerColor: AppColor.languageColor,
            starColor: AppColor.unSelectedStarColor,
            textColor2: AppColor.placeholderColor,
            bottomSheetShadowColor:
                AppColor.boxShadowColor.withOpacity(0.25),
            selectedBorder: AppColor.selectTimeColor,
            radioColor: AppColor.secondaryColor,
            progressBarColor: AppColor.progressBarColor,
            bottomColor: AppColor.whiteColor,
            menuColor: AppColor.secondaryColor,
            tabBackground: AppColor.loginBgImageColor,
            bottomShadow: AppColor.borderColor.withOpacity(0.25),
            primaryColor: AppColor.secondaryColor,
            secondaryColor: AppColor.primaryColorDarkMode,
            highLightColor: AppColor.onBoardingTextColor,
            buttonDisableColor: AppColor.disableColor,
            hintColor: AppColor.placeholderDarkMode,
            textFieldColor: AppColor.textFieldBorderColor,
            smallTextColor: AppColor.onBoardingTextColor,
            cardShadowColor: AppColor.boxShadowColor.withOpacity(0.1),
            appBarShadowColor:
                AppColor.appBarBoxShadowColor.withOpacity(0.10),
            dividerColor: AppColor.textFieldBorderColor,
            cardColor: AppColor.whiteColor,
            selectedItemColor: AppColor.whiteColor,
            textColor: AppColor.secondaryColor,
            appBarColor: AppColor.whiteColor,
            registrationStyle: const RegistrationStyle(
              checkBuilder: AppIcons.unFileDoneIcon,
              checkDoneBuilder: AppIcons.doneIcon,
              radioBuilder: AppIcons.emptyRound,
              radioBuilder2: AppIcons.fillRound,
              bannerBuilder: AppIcons.checkboxDoneIcon,
              logoBuilder: AppIcons.checkboxUnFillIcon,
              iconBuilder: AppIcons.notificationIcon,
              imageBuilder: AppImage.myCart,
              frameBuilder: AppImage.frame,
            ));

  AppTheme.dark()
      : this._(
            containerColor: AppColor.selectedDark,
            starColor: AppColor.placeholderDarkMode,
            textColor2: AppColor.textColorDarkMode,
            bottomSheetShadowColor: AppColor.transparent,
            selectedBorder: AppColor.selectedDark,
            progressBarColor: AppColor.progressBarColorDark,
            radioColor: AppColor.borderColorDarkMode,
            menuColor: AppColor.primaryColors,
            bottomColor: AppColor.primaryColorLightMode,
            tabBackground: AppColor.backgroundColorDarkMode,
            bottomShadow: AppColor.transparent,
            primaryColor: AppColor.placeholderDarkMode,
            secondaryColor: AppColor.borderColorDarkMode,
            buttonDisableColor: AppColor.disableColorDarkMode,
            highLightColor: AppColor.textColorDarkMode,
            smallTextColor: AppColor.placeholderDarkMode,
            textFieldColor: AppColor.borderColorDarkMode,
            cardColor: AppColor.secondaryColorDarkMode,
            hintColor: AppColor.placeholderDarkMode,
            cardShadowColor: AppColor.transparent,
            textColor: AppColor.textColorDarkMode,
            appBarShadowColor:
                AppColor.backgroundColorDarkMode.withOpacity(0.10),
            dividerColor: AppColor.borderColorDarkMode,
            selectedItemColor: AppColor.backgroundColorDarkMode,
            appBarColor: AppColor.secondaryColorDarkMode,
            registrationStyle: const RegistrationStyle(
                radioBuilder: AppIcons.emptyRoundDark,
                radioBuilder2: AppIcons.fillRoundDark,
                frameBuilder: AppIcons.frameDark,
                bannerBuilder: AppIcons.checkboxDoneIconDark,
                logoBuilder: AppIcons.checkboxUnFillIconDark,
                iconBuilder: AppIcons.notificationDark,
                imageBuilder: AppImage.myCartDark,
                checkBuilder: AppIcons.unFillDoneIconDark,
                checkDoneBuilder: AppIcons.doneIconDark));

  final Color selectedItemColor;
  final Color dividerColor;
  final Color buttonDisableColor;
  final Color starColor;
  final Color containerColor;
  final Color appBarColor;
  final Color bottomSheetShadowColor;

  final Color selectedBorder;
  final Color textColor;
  final Color cardColor;
  final Color appBarShadowColor;
  final Color cardShadowColor;
  final Color textColor2;
  final Color smallTextColor;
  final Color textFieldColor;
  final Color hintColor;
  final Color highLightColor;
  final Color secondaryColor;
  final Color radioColor;
  final Color progressBarColor;

  final Color primaryColor;
  final Color bottomShadow;

  final Color tabBackground;
  final Color bottomColor;
  final Color menuColor;

  final RegistrationStyle registrationStyle;

  ThemeData get themeData => ThemeData(
        primaryColor: selectedItemColor,
        cardColor: cardColor,
        dividerColor: dividerColor,
        hintColor: hintColor,
        textTheme: TextTheme(titleMedium: TextStyle(color: smallTextColor)),
        colorScheme: const ColorScheme.light().copyWith(
          primary: primaryColor,
          secondary: secondaryColor,
          tertiary: textFieldColor,
          tertiaryContainer: bottomColor,
          secondaryContainer: tabBackground,
          surface: menuColor,
          shadow: bottomShadow,
        ),
        unselectedWidgetColor: highLightColor,
        secondaryHeaderColor: progressBarColor,
        disabledColor: radioColor,
        cardTheme: CardTheme(
          shadowColor: cardShadowColor,
          color: textColor2,
        ),
        appBarTheme: AppBarTheme(
          shadowColor: appBarShadowColor,
          foregroundColor: selectedBorder,
          backgroundColor: appBarColor,
          titleTextStyle: TextStyle(color: textColor),
          systemOverlayStyle: SystemUiOverlayStyle(
            statusBarColor: bottomSheetShadowColor,
          ),
        ),
        tabBarTheme: TabBarTheme(
          labelColor: buttonDisableColor,
        ),
        expansionTileTheme: ExpansionTileThemeData(
          iconColor: starColor,
          textColor: containerColor,
        ),
        extensions: [
          registrationStyle,
        ],
      );
}

class RegistrationStyle extends ThemeExtension<RegistrationStyle> {
  const RegistrationStyle({
    required this.radioBuilder,
    required this.radioBuilder2,
    required this.imageBuilder,
    required this.bannerBuilder,
    required this.logoBuilder,
    required this.checkBuilder,
    required this.checkDoneBuilder,
    required this.iconBuilder,
    required this.frameBuilder,
  });

  final String bannerBuilder;

  final String iconBuilder;
  final String logoBuilder;
  final String checkBuilder;
  final String checkDoneBuilder;
  final String frameBuilder;
  final String imageBuilder;
  final String radioBuilder;
  final String radioBuilder2;

  @override
  ThemeExtension<RegistrationStyle> copyWith({
    WidgetBuilder? bannerBuilder,
    WidgetBuilder? logoBuilder,
    WidgetBuilder? iconBuilder,
    WidgetBuilder? imageBuilder,
    WidgetBuilder? radioBuilder,
    ElevatedButtonThemeData? elevatedButtonTheme,
    Color? scaffoldBackgroundColor,
  }) =>
      RegistrationStyle(
        bannerBuilder: this.bannerBuilder,
        logoBuilder: this.logoBuilder,
        iconBuilder: this.iconBuilder,
        imageBuilder: this.imageBuilder,
        radioBuilder: this.radioBuilder,
        radioBuilder2: radioBuilder2,
        frameBuilder: frameBuilder,
        checkBuilder: checkBuilder,
        checkDoneBuilder: checkDoneBuilder,
      );

  @override
  ThemeExtension<RegistrationStyle> lerp(
    ThemeExtension<RegistrationStyle>? other,
    double t,
  ) {
    if (other is! RegistrationStyle) {
      return this;
    }
    return other;
  }
}
