/*
* File : Basic Setting
* Version : 1.0.0
* */


import 'package:flutkit/helpers/theme/app_theme.dart';
import 'package:flutkit/helpers/widgets/my_spacing.dart';
import 'package:flutkit/helpers/widgets/my_text.dart';
import 'package:flutkit/helpers/widgets/my_text_style.dart';
import 'package:flutter/material.dart';
import 'package:flutter_lucide/flutter_lucide.dart';

class BasicSettingScreen extends StatefulWidget {
  const BasicSettingScreen({super.key});

  @override
  State<BasicSettingScreen> createState() => _BasicSettingScreenState();
}

class _BasicSettingScreenState extends State<BasicSettingScreen> {
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
    return Scaffold(
        appBar: AppBar(
          elevation: 0,
          leading: IconButton(
            onPressed: () => Navigator.of(context).pop(),
            icon: Icon(
              LucideIcons.chevron_left,
              size: 20,
              color: theme.colorScheme.onSurface,
            ),
          ),
          centerTitle: true,
          title: MyText.titleLarge("Setting", fontWeight: 600),
        ),
        backgroundColor: theme.colorScheme.surface,
        body: ListView(
          padding: MySpacing.nTop(20),
          children: <Widget>[
            TextFormField(
              style: MyTextStyle.bodyLarge(
                  letterSpacing: 0.1, color: theme.colorScheme.onSurface),
              decoration: InputDecoration(
                hintText: "Search",
                hintStyle: MyTextStyle.titleSmall(
                    letterSpacing: 0.1, color: theme.colorScheme.onSurface),
                border: OutlineInputBorder(
                    borderRadius: BorderRadius.all(
                      Radius.circular(8.0),
                    ),
                    borderSide: BorderSide.none),
                enabledBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.all(
                      Radius.circular(8.0),
                    ),
                    borderSide: BorderSide.none),
                focusedBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.all(
                      Radius.circular(8.0),
                    ),
                    borderSide: BorderSide.none),
                filled: true,
                fillColor: customTheme.card,
                prefixIcon: Icon(LucideIcons.search,
                    size: 22,
                    color: Theme.of(context).colorScheme.onSurface),
                isDense: true,
                contentPadding: EdgeInsets.all(0),
              ),
              keyboardType: TextInputType.emailAddress,
              textCapitalization: TextCapitalization.sentences,
            ),
            MySpacing.height(12),
            Container(
              padding: EdgeInsets.symmetric(vertical: 8, horizontal: 0),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.center,
                children: <Widget>[
                  Icon(LucideIcons.user_cog,
                      size: 24, color: theme.colorScheme.onSurface),
                  Expanded(
                    child: Container(
                      margin: EdgeInsets.only(left: 16),
                      child: MyText.titleMedium("Account", fontWeight: 600),
                    ),
                  ),
                  Icon(LucideIcons.chevron_right,
                      size: 24, color: theme.colorScheme.onSurface),
                ],
              ),
            ),
            Divider(
              thickness: 0.3,
            ),
            Container(
              padding: EdgeInsets.symmetric(vertical: 8, horizontal: 0),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.center,
                children: <Widget>[
                  Icon(
                    LucideIcons.bell_ring,
                    size: 22,
                    color: theme.colorScheme.onSurface,
                  ),
                  Expanded(
                    child: Container(
                      margin: EdgeInsets.only(left: 16),
                      child:
                          MyText.titleMedium("Notifications", fontWeight: 600),
                    ),
                  ),
                  Icon(LucideIcons.chevron_right,
                      size: 24, color: theme.colorScheme.onSurface),
                ],
              ),
            ),
            Divider(
              thickness: 0.3,
            ),
            Container(
              padding: EdgeInsets.symmetric(vertical: 8, horizontal: 0),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.center,
                children: <Widget>[
                  Icon(LucideIcons.eye,
                      size: 22, color: theme.colorScheme.onSurface),
                  Expanded(
                    child: Container(
                      margin: EdgeInsets.only(left: 16),
                      child: MyText.titleMedium("Appearance", fontWeight: 600),
                    ),
                  ),
                  Icon(LucideIcons.chevron_right,
                      size: 24, color: theme.colorScheme.onSurface),
                ],
              ),
            ),
            Divider(
              thickness: 0.3,
            ),
            Container(
              padding: EdgeInsets.symmetric(vertical: 8, horizontal: 0),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.center,
                children: <Widget>[
                  Icon(LucideIcons.lock,
                      size: 24, color: theme.colorScheme.onSurface),
                  Expanded(
                    child: Container(
                      margin: EdgeInsets.only(left: 16),
                      child: MyText.titleMedium("Privacy & Security",
                          fontWeight: 600),
                    ),
                  ),
                  Icon(LucideIcons.chevron_right,
                      size: 24, color: theme.colorScheme.onSurface),
                ],
              ),
            ),
            Divider(
              thickness: 0.3,
            ),
            Container(
              padding: EdgeInsets.symmetric(vertical: 8, horizontal: 0),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.center,
                children: <Widget>[
                  Icon(LucideIcons.smile,
                      size: 24, color: theme.colorScheme.onSurface),
                  Expanded(
                    child: Container(
                      margin: EdgeInsets.only(left: 16),
                      child:
                          MyText.titleMedium("Help & Support", fontWeight: 600),
                    ),
                  ),
                  Icon(LucideIcons.chevron_right,
                      size: 24, color: theme.colorScheme.onSurface),
                ],
              ),
            ),
            Divider(
              thickness: 0.3,
            ),
            Container(
              padding: EdgeInsets.symmetric(vertical: 8, horizontal: 0),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.center,
                children: <Widget>[
                  Icon(LucideIcons.circle_question_mark,
                      size: 24, color: theme.colorScheme.onSurface),
                  Expanded(
                    child: Container(
                      margin: EdgeInsets.only(left: 16),
                      child: MyText.titleMedium("About", fontWeight: 600),
                    ),
                  ),
                  Icon(LucideIcons.chevron_right,
                      size: 24, color: theme.colorScheme.onSurface),
                ],
              ),
            ),
            Divider(
              thickness: 0.3,
            ),

          ],
        ));
  }
}
