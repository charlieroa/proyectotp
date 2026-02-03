import 'package:flutkit/apps/auth/forgot_password1_screen.dart';
import 'package:flutkit/apps/auth/forgot_password2_screen.dart';
import 'package:flutkit/apps/auth/login1_screen.dart';
import 'package:flutkit/apps/auth/login2_screen.dart';
import 'package:flutkit/apps/auth/login_register_screen.dart';
import 'package:flutkit/apps/auth/otp_verification_screen.dart';
import 'package:flutkit/apps/auth/register1_screen.dart';
import 'package:flutkit/apps/auth/register2_screen.dart';
import 'package:flutkit/apps/chat/chat_facebook_page.dart';
import 'package:flutkit/apps/chat/chat_home_screen.dart';
import 'package:flutkit/apps/chat/chat_whatsapp_page.dart';
import 'package:flutkit/apps/course/course_full_app.dart';
import 'package:flutkit/apps/dashboard/lms_dashboard_screen.dart';
import 'package:flutkit/apps/dashboard/seller_dashboard_screen.dart';
import 'package:flutkit/apps/event/event_full_app.dart';
import 'package:flutkit/apps/food/food_on_boarding_screen.dart';
import 'package:flutkit/apps/handyman/handyman_full_app.dart';
import 'package:flutkit/apps/health/health_full_app.dart';
import 'package:flutkit/apps/hotel/hotel_login_screen.dart';
import 'package:flutkit/apps/hotel/hotel_onboarding_screen.dart';
import 'package:flutkit/apps/hotel/hotel_password_screen.dart';
import 'package:flutkit/apps/hotel/hotel_profile_screen.dart';
import 'package:flutkit/apps/hotel/hotel_register_screen.dart';
import 'package:flutkit/apps/mail/mail_home_screen.dart';
import 'package:flutkit/apps/music/music_login_screen.dart';
import 'package:flutkit/apps/music/music_onboarding_screen.dart';
import 'package:flutkit/apps/music/music_password_screen.dart';
import 'package:flutkit/apps/music/music_register_screen.dart';
import 'package:flutkit/apps/news/news_categery_screen.dart';
import 'package:flutkit/apps/other/about_app_screen.dart';
import 'package:flutkit/apps/other/empty_cart_screen.dart';
import 'package:flutkit/apps/other/faq_question_screen.dart';
import 'package:flutkit/apps/other/maintenance_screen.dart';
import 'package:flutkit/apps/other/no_internet_screen.dart';
import 'package:flutkit/apps/other/page_not_found_screen.dart';
import 'package:flutkit/apps/other/product_sold_out_screen.dart';
import 'package:flutkit/apps/other/terms_screen.dart';
import 'package:flutkit/apps/profile/company_profile_screen.dart';
import 'package:flutkit/apps/profile/edit_profile_screen.dart';
import 'package:flutkit/apps/profile/profile_screen.dart';
import 'package:flutkit/apps/quiz/quiz_customize_screen.dart';
import 'package:flutkit/apps/quiz/quiz_question_type1_screen.dart';
import 'package:flutkit/apps/quiz/quiz_question_type2_screen.dart';
import 'package:flutkit/apps/setting/account_setting_screen.dart';
import 'package:flutkit/apps/setting/basic_setting_screen.dart';
import 'package:flutkit/apps/setting/notification_setting_screen.dart';
import 'package:flutkit/apps/setting/privacy_security_setting_screen.dart';
import 'package:flutkit/apps/shopping/shopping_login_screen.dart';
import 'package:flutkit/apps/shopping/shopping_onboarding_screen.dart';
import 'package:flutkit/apps/shopping/shopping_password_screen.dart';
import 'package:flutkit/apps/shopping/shopping_profile_screen.dart';
import 'package:flutkit/apps/shopping/shopping_register_screen.dart';
import 'package:flutkit/apps/social/social_full_app.dart';
import 'package:flutkit/apps/wallet/wallet_crypto_screen.dart';
import 'package:flutkit/apps/wallet/wallet_home_screen.dart';
import 'package:flutkit/apps/wallet/wallet_payment_screen.dart';
import 'package:flutkit/helpers/theme/app_notifier.dart';
import 'package:flutkit/helpers/theme/app_theme.dart';
import 'package:flutkit/helpers/widgets/my_container.dart';
import 'package:flutkit/helpers/widgets/my_spacing.dart';
import 'package:flutkit/helpers/widgets/my_text.dart';
import 'package:flutkit/homes/single_grid_item.dart';
import 'package:flutter/material.dart';
import 'package:flutter_lucide/flutter_lucide.dart';
import 'package:provider/provider.dart';

class AppsHome extends StatefulWidget {
  @override
  _AppsHomeState createState() => _AppsHomeState();
}

class _AppsHomeState extends State<AppsHome> {
  late CustomTheme customTheme;
  late ThemeData theme;

  @override
  void initState() {
    super.initState();
    customTheme = AppTheme.customTheme;
    theme = AppTheme.theme;
  }

  @override
  Widget build(BuildContext context) {
    return Consumer<AppNotifier>(
      builder: (BuildContext context, AppNotifier value, Widget? child) {
        return ListView(
          padding: MySpacing.fromLTRB(20, 0, 20, 80),
          shrinkWrap: true,
          physics: ClampingScrollPhysics(),
          children: <Widget>[
            MyText.titleSmall(
              "APPS",
              fontWeight: 700,
              muted: true,
            ),
            GridView.count(
                shrinkWrap: true,
                physics: ClampingScrollPhysics(),
                crossAxisCount: 2,
                padding: MySpacing.top(20),
                mainAxisSpacing: 20,
                childAspectRatio: 3 / 2,
                crossAxisSpacing: 20,
                children: <Widget>[
                  SinglePageItem(
                    title: "Shopping",
                    iconData: LucideIcons.store,
                    navigation: ShoppingOnboardingScreen(),
                  ),
                  SinglePageItem(
                    iconData: Icons.health_and_safety_outlined,
                    title: "Health",
                    navigation: HealthFullApp(),
                  ),
                  SinglePageItem(
                    title: "Food",
                    iconData: LucideIcons.utensils_crossed,
                    navigation: FoodOnboardingScreen(),
                  ),
                  SinglePageItem(
                    title: "Hotel",
                    iconData: LucideIcons.bed,
                    navigation: HotelOnboardingScreen(),
                  ),
                  SinglePageItem(
                    iconData: Icons.local_library_outlined,
                    title: "Course",
                    navigation: CourseFullApp(),
                  ),
                  SinglePageItem(
                    iconData: LucideIcons.instagram,
                    title: "Social",
                    navigation: SocialFullApp(),
                  ),
                  SinglePageItem(
                    title: "Event",
                    iconData: LucideIcons.square_chart_gantt,
                    navigation: EventFullApp(),
                  ),
                  SinglePageItem(
                    title: "Music",
                    iconData: LucideIcons.music,
                    navigation: MusicOnboardingScreen(),
                  ),
                  SinglePageItem(
                    title: "Chat",
                    iconData: LucideIcons.messages_square,
                    navigation: ChatHomeScreen(),
                  ),
                  SinglePageItem(
                    iconData: Icons.engineering_outlined,
                    title: "Handyman",
                    navigation: HandymanFullApp(),
                  ),
                  SinglePageItem(
                    iconData: LucideIcons.newspaper,
                    title: "News",
                    navigation: NewsCategoryScreen(),
                  ),
                ]),
            MySpacing.height(20),
            MyText.titleSmall(
              "PAGES",
              fontWeight: 700,
              muted: true,
            ),
            GridView.count(
                shrinkWrap: true,
                physics: ClampingScrollPhysics(),
                crossAxisCount: 2,
                padding: MySpacing.top(20),
                mainAxisSpacing: 20,
                childAspectRatio: 3 / 2,
                crossAxisSpacing: 20,
                children: <Widget>[
                  SingleGridItem(
                    title: "Quiz",
                    iconData: LucideIcons.scroll_text,
                    isComingSoon: true,
                    comingSoonText: "Quiz app is coming soon",
                    items: [
                      SinglePageItem(
                        iconData: LucideIcons.scroll_text,
                        title: "Customize",
                        navigation: QuizCustomizeScreen(),
                      ),
                      SinglePageItem(
                        iconData: LucideIcons.scroll_text,
                        title: "Question 1",
                        navigation: QuizQuestionType1Screen(),
                      ),
                      SinglePageItem(
                        iconData: LucideIcons.scroll_text,
                        title: "Question 2",
                        navigation: QuizQuestionType2Screen(),
                      ),
                    ],
                  ),
                  SinglePageItem(
                    title: "Mail",
                    iconData: LucideIcons.mail,
                    navigation: MailHomeScreen(),
                  ),
                  SingleGridItem(
                    title: "Authentication",
                    iconData: LucideIcons.scan_face,
                    items: <SinglePageItem>[
                      SinglePageItem(
                        title: "Login 1",
                        navigation: ShoppingLoginScreen(),
                        iconData: LucideIcons.scan_face,
                      ),
                      SinglePageItem(
                        title: "Login 2",
                        iconData: LucideIcons.scan_face,
                        navigation: HotelLoginScreen(),
                      ),
                      SinglePageItem(
                        title: "Login 3",
                        iconData: LucideIcons.scan_face,
                        navigation: MusicLoginScreen(),
                      ),
                      SinglePageItem(
                        title: "Login 4",
                        iconData: LucideIcons.scan_face,
                        navigation: Login1Screen(),
                      ),
                      SinglePageItem(
                        title: "Login 5",
                        iconData: LucideIcons.scan_face,
                        navigation: Login2Screen(),
                      ),
                      SinglePageItem(
                        title: "Register 1",
                        iconData: LucideIcons.scan_face,
                        navigation: ShoppingRegisterScreen(),
                      ),
                      SinglePageItem(
                        title: "Register 2",
                        iconData: LucideIcons.scan_face,
                        navigation: HotelRegisterScreen(),
                      ),
                      SinglePageItem(
                        title: "Register 3",
                        iconData: LucideIcons.scan_face,
                        navigation: MusicRegisterScreen(),
                      ),
                      SinglePageItem(
                        title: "Register 4",
                        iconData: LucideIcons.scan_face,
                        navigation: Register1Screen(),
                      ),
                      SinglePageItem(
                        title: "Register 5",
                        iconData: LucideIcons.scan_face,
                        navigation: Register2Screen(),
                      ),
                      SinglePageItem(
                        title: "Reset Password 1",
                        iconData: LucideIcons.scan_face,
                        navigation: ShoppingPasswordScreen(),
                      ),
                      SinglePageItem(
                        title: "Reset Password 2",
                        iconData: LucideIcons.scan_face,
                        navigation: HotelPasswordScreen(),
                      ),
                      SinglePageItem(
                        title: "Reset Password 3",
                        iconData: LucideIcons.scan_face,
                        navigation: MusicPasswordScreen(),
                      ),
                      SinglePageItem(
                        title: "Reset Password 4",
                        iconData: LucideIcons.scan_face,
                        navigation: ForgotPassword1Screen(),
                      ),
                      SinglePageItem(
                        title: "Reset Password 5",
                        iconData: LucideIcons.scan_face,
                        navigation: ForgotPassword2Screen(),
                      ),
                      SinglePageItem(
                        title: "Login & Register",
                        iconData: LucideIcons.scan_face,
                        navigation: LoginRegisterScreen(),
                      ),
                      SinglePageItem(
                        title: "OTP Verification",
                        iconData: LucideIcons.scan_face,
                        navigation: OTPVerificationScreen(),
                      ),
                    ],
                  ),
                  SingleGridItem(
                    title: "Settings",
                    iconData: LucideIcons.settings,
                    items: <SinglePageItem>[
                      SinglePageItem(
                        title: "Basic",
                        iconData: LucideIcons.settings,
                        navigation: BasicSettingScreen(),
                      ),
                      SinglePageItem(
                        title: "Account",
                        iconData: LucideIcons.settings,
                        navigation: AccountSettingScreen(),
                      ),
                      SinglePageItem(
                        title: "Notification",
                        iconData: LucideIcons.settings,
                        navigation: NotificationSettingScreen(),
                      ),
                      SinglePageItem(
                        title: "Privacy",
                        iconData: LucideIcons.settings,
                        navigation: PrivacySecuritySettingScreen(),
                      ),
                    ],
                  ),
                  SingleGridItem(
                    title: "Profile",
                    iconData: LucideIcons.circle_user,
                    items: <SinglePageItem>[
                      SinglePageItem(
                        title: "Social",
                        iconData: LucideIcons.circle_user,
                        navigation: ProfileScreen(),
                      ),
                      SinglePageItem(
                        title: "Company",
                        iconData: LucideIcons.circle_user,
                        navigation: CompanyProfileScreen(),
                      ),
                      SinglePageItem(
                        title: "Shopping",
                        iconData: LucideIcons.circle_user,
                        navigation: ShoppingProfileScreen(),
                      ),
                      SinglePageItem(
                        title: "Hotel",
                        iconData: LucideIcons.circle_user,
                        navigation: HotelProfileScreen(),
                      ),
                      SinglePageItem(
                        title: "Edit",
                        iconData: LucideIcons.circle_user,
                        navigation: EditProfileScreen(),
                      ),
                    ],
                  ),
                  SingleGridItem(
                    title: "Dashboard",
                    iconData: LucideIcons.layout_dashboard,
                    items: <SinglePageItem>[
                      SinglePageItem(
                        title: "LMS",
                        iconData: LucideIcons.layout_dashboard,
                        navigation: LMSDashboardScreen(),
                      ),
                      SinglePageItem(
                        title: "Seller",
                        iconData: LucideIcons.layout_dashboard,
                        navigation: SellerDashboardScreen(),
                      ),
                    ],
                  ),
                  SingleGridItem(
                    title: "Wallet",
                    iconData: LucideIcons.wallet,
                    items: <SinglePageItem>[
                      SinglePageItem(
                        title: "Home",
                        iconData: LucideIcons.wallet,
                        navigation: WalletHomeScreen(),
                      ),
                      SinglePageItem(
                        title: "Payment",
                        iconData: LucideIcons.wallet,
                        navigation: WalletPaymentScreen(),
                      ),
                      SinglePageItem(
                        title: "Crypto",
                        iconData: LucideIcons.wallet,
                        navigation: WalletCryptoScreen(),
                      ),
                    ],
                  ),
                  SingleGridItem(
                    title: "Other",
                    iconData: LucideIcons.dice_1,
                    items: <SinglePageItem>[
                      SinglePageItem(
                        title: "Whatsapp",
                        iconData: LucideIcons.messages_square,
                        navigation: ChatWhatsAppPage(),
                      ),
                      SinglePageItem(
                        title: "Facebook",
                        iconData: LucideIcons.messages_square,
                        navigation: ChatFacebookScreen(),
                      ),
                      SinglePageItem(
                        title: "About App",
                        iconData: LucideIcons.dice_1,
                        navigation: AboutAppScreen(),
                      ),
                      SinglePageItem(
                        title: "Empty cart",
                        iconData: LucideIcons.dice_1,
                        navigation: EmptyCartScreen(),
                      ),
                      SinglePageItem(
                        title: "FAQ",
                        iconData: LucideIcons.dice_1,
                        navigation: FAQQuestionScreen(),
                      ),
                      SinglePageItem(
                        title: "Maintenance",
                        iconData: LucideIcons.dice_1,
                        navigation: MaintenanceScreen(),
                      ),
                      SinglePageItem(
                        title: "No internet",
                        iconData: LucideIcons.dice_1,
                        navigation: NoInternetScreen(),
                      ),
                      SinglePageItem(
                        title: "Page not found",
                        iconData: LucideIcons.dice_1,
                        navigation: PageNotFoundScreen(),
                      ),
                      SinglePageItem(
                        title: "Sold out",
                        iconData: LucideIcons.dice_1,
                        navigation: ProductSoldOutScreen(),
                      ),
                      SinglePageItem(
                        title: "Terms",
                        iconData: LucideIcons.dice_1,
                        navigation: TermsScreen(),
                      ),
                    ],
                  ),
                ]),
            MyContainer(
              margin: MySpacing.y(20),
              borderRadiusAll: 4,
              color: theme.colorScheme.primary.withAlpha(24),
              child: Center(
                child: MyText.bodyMedium("More Apps are coming soon...",
                    fontWeight: 600, color: theme.colorScheme.primary),
              ),
            ),
          ],
        );
      },
    );
  }
}
