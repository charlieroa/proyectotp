/*
* File : Account Setting
* Version : 1.0.0
* */


import 'package:flutkit/helpers/theme/app_theme.dart';
import 'package:flutkit/helpers/widgets/my_spacing.dart';
import 'package:flutkit/helpers/widgets/my_text.dart';
import 'package:flutkit/helpers/widgets/my_text_style.dart';
import 'package:flutter/material.dart';
import 'package:flutter_lucide/flutter_lucide.dart';

class AccountSettingScreen extends StatefulWidget {
  const AccountSettingScreen({super.key});

  @override
  State<AccountSettingScreen> createState() => _AccountSettingScreenState();
}

class _AccountSettingScreenState extends State<AccountSettingScreen> {
  bool _passwordVisible = false;
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
          backgroundColor: theme.scaffoldBackgroundColor,
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
          title: MyText.titleMedium("Account Setting", fontWeight: 600),
        ),
        body: ListView(
          padding: MySpacing.nTop(20),
          children: <Widget>[
            MyText.bodyLarge("Personal information",
                fontWeight: 600, letterSpacing: 0),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: <Widget>[
                Container(
                  margin: EdgeInsets.only(top: 16),
                  child: TextFormField(
                    style: MyTextStyle.titleSmall(
                        letterSpacing: 0,
                        color: theme.colorScheme.onSurface,
                        fontWeight: 500),
                    decoration: InputDecoration(
                      hintText: "Email",
                      hintStyle: MyTextStyle.titleSmall(
                          letterSpacing: 0,
                          color: theme.colorScheme.onSurface,
                          fontWeight: 500),
                      border: OutlineInputBorder(
                          borderRadius: BorderRadius.all(
                            Radius.circular(4),
                          ),
                          borderSide: BorderSide.none),
                      enabledBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.all(
                            Radius.circular(4),
                          ),
                          borderSide: BorderSide.none),
                      focusedBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.all(
                            Radius.circular(4),
                          ),
                          borderSide: BorderSide.none),
                      filled: true,
                      fillColor: customTheme.card,
                      prefixIcon: Icon(
                        LucideIcons.mail,
                        size: 22,
                      ),
                      isDense: true,
                      contentPadding: EdgeInsets.all(0),
                    ),
                    keyboardType: TextInputType.emailAddress,
                    textCapitalization: TextCapitalization.sentences,
                  ),
                ),
                Container(
                  margin: EdgeInsets.only(top: 12),
                  child: TextFormField(
                    style: MyTextStyle.titleSmall(
                        letterSpacing: 0,
                        color: theme.colorScheme.onSurface,
                        fontWeight: 500),
                    decoration: InputDecoration(
                      hintText: "Number",
                      hintStyle: MyTextStyle.titleSmall(
                          letterSpacing: 0,
                          color: theme.colorScheme.onSurface,
                          fontWeight: 500),
                      border: OutlineInputBorder(
                          borderRadius: BorderRadius.all(
                            Radius.circular(4),
                          ),
                          borderSide: BorderSide.none),
                      enabledBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.all(
                            Radius.circular(4),
                          ),
                          borderSide: BorderSide.none),
                      focusedBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.all(
                            Radius.circular(4),
                          ),
                          borderSide: BorderSide.none),
                      filled: true,
                      fillColor: customTheme.card,
                      prefixIcon: Icon(
                        LucideIcons.phone,
                        size: 22,
                      ),
                      isDense: true,
                      contentPadding: EdgeInsets.all(0),
                    ),
                    keyboardType: TextInputType.number,
                  ),
                ),
              ],
            ),
            Container(
              margin: EdgeInsets.only(top: 24, bottom: 0),
              child: MyText.bodyLarge("Company information",
                  fontWeight: 600, letterSpacing: 0),
            ),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: <Widget>[
                Container(
                  margin: EdgeInsets.only(top: 16),
                  child: TextFormField(
                    style: MyTextStyle.titleSmall(
                        letterSpacing: 0,
                        color: theme.colorScheme.onSurface,
                        fontWeight: 500),
                    decoration: InputDecoration(
                      hintText: "Name",
                      hintStyle: MyTextStyle.titleSmall(
                          letterSpacing: 0,
                          color: theme.colorScheme.onSurface,
                          fontWeight: 500),
                      border: OutlineInputBorder(
                          borderRadius: BorderRadius.all(
                            Radius.circular(4),
                          ),
                          borderSide: BorderSide.none),
                      enabledBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.all(
                            Radius.circular(4),
                          ),
                          borderSide: BorderSide.none),
                      focusedBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.all(
                            Radius.circular(4),
                          ),
                          borderSide: BorderSide.none),
                      filled: true,
                      fillColor: customTheme.card,
                      prefixIcon: Icon(
                        Icons.domain,
                        size: 22,
                      ),
                      isDense: true,
                      contentPadding: EdgeInsets.all(0),
                    ),
                    textCapitalization: TextCapitalization.sentences,
                  ),
                ),
                Container(
                  margin: EdgeInsets.only(top: 12),
                  child: TextFormField(
                    style: MyTextStyle.titleSmall(
                        letterSpacing: 0,
                        color: theme.colorScheme.onSurface,
                        fontWeight: 500),
                    decoration: InputDecoration(
                      hintText: "Job Title",
                      hintStyle: MyTextStyle.titleSmall(
                          letterSpacing: 0,
                          color: theme.colorScheme.onSurface,
                          fontWeight: 500),
                      border: OutlineInputBorder(
                          borderRadius: BorderRadius.all(
                            Radius.circular(4),
                          ),
                          borderSide: BorderSide.none),
                      enabledBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.all(
                            Radius.circular(4),
                          ),
                          borderSide: BorderSide.none),
                      focusedBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.all(
                            Radius.circular(4),
                          ),
                          borderSide: BorderSide.none),
                      filled: true,
                      fillColor: customTheme.card,
                      prefixIcon: Icon(
                        LucideIcons.briefcase,
                        size: 22,
                      ),
                      isDense: true,
                      contentPadding: EdgeInsets.all(0),
                    ),
                    textCapitalization: TextCapitalization.sentences,
                  ),
                ),
                Container(
                  margin: EdgeInsets.only(top: 12),
                  child: TextFormField(
                    style: MyTextStyle.titleSmall(
                        letterSpacing: 0,
                        color: theme.colorScheme.onSurface,
                        fontWeight: 500),
                    decoration: InputDecoration(
                      hintText: "Website",
                      hintStyle: MyTextStyle.titleSmall(
                          letterSpacing: 0,
                          color: theme.colorScheme.onSurface,
                          fontWeight: 500),
                      border: OutlineInputBorder(
                          borderRadius: BorderRadius.all(
                            Radius.circular(4),
                          ),
                          borderSide: BorderSide.none),
                      enabledBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.all(
                            Radius.circular(4),
                          ),
                          borderSide: BorderSide.none),
                      focusedBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.all(
                            Radius.circular(4),
                          ),
                          borderSide: BorderSide.none),
                      filled: true,
                      fillColor: customTheme.card,
                      prefixIcon: Icon(
                        LucideIcons.languages,
                        size: 22,
                      ),
                      isDense: true,
                      contentPadding: EdgeInsets.all(0),
                    ),
                    textCapitalization: TextCapitalization.sentences,
                  ),
                ),
              ],
            ),
            Container(
              margin: EdgeInsets.only(top: 24),
              child: MyText.bodyLarge("Change Password",
                  fontWeight: 600, letterSpacing: 0),
            ),
            Container(
              margin: EdgeInsets.only(top: 16),
              child: TextFormField(
                style: MyTextStyle.titleSmall(
                    letterSpacing: 0,
                    color: theme.colorScheme.onSurface,
                    fontWeight: 500),
                decoration: InputDecoration(
                  hintText: "Old Password",
                  hintStyle: MyTextStyle.titleSmall(
                      letterSpacing: 0,
                      color: theme.colorScheme.onSurface,
                      fontWeight: 500),
                  border: OutlineInputBorder(
                      borderRadius: BorderRadius.all(
                        Radius.circular(4),
                      ),
                      borderSide: BorderSide.none),
                  enabledBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.all(
                        Radius.circular(4),
                      ),
                      borderSide: BorderSide.none),
                  focusedBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.all(
                        Radius.circular(4),
                      ),
                      borderSide: BorderSide.none),
                  filled: true,
                  fillColor: customTheme.card,
                  prefixIcon: Icon(LucideIcons.lock),
                  suffixIcon: IconButton(
                    icon: Icon(_passwordVisible
                        ? LucideIcons.eye
                        : LucideIcons.eye_off),
                    onPressed: () {
                      setState(() {
                        _passwordVisible = !_passwordVisible;
                      });
                    },
                  ),
                  isDense: true,
                  contentPadding: EdgeInsets.all(0),
                ),
                textCapitalization: TextCapitalization.sentences,
                obscureText: _passwordVisible,
              ),
            ),
            Container(
              margin: EdgeInsets.only(top: 12),
              child: TextFormField(
                style: MyTextStyle.titleSmall(
                    letterSpacing: 0,
                    color: theme.colorScheme.onSurface,
                    fontWeight: 500),
                decoration: InputDecoration(
                  hintText: " Password",
                  hintStyle: MyTextStyle.titleSmall(
                      letterSpacing: 0,
                      color: theme.colorScheme.onSurface,
                      fontWeight: 500),
                  border: OutlineInputBorder(
                      borderRadius: BorderRadius.all(
                        Radius.circular(4),
                      ),
                      borderSide: BorderSide.none),
                  enabledBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.all(
                        Radius.circular(4),
                      ),
                      borderSide: BorderSide.none),
                  focusedBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.all(
                        Radius.circular(4),
                      ),
                      borderSide: BorderSide.none),
                  filled: true,
                  fillColor: customTheme.card,
                  prefixIcon: Icon(LucideIcons.lock),
                  suffixIcon: IconButton(
                    icon: Icon(_passwordVisible
                        ? LucideIcons.eye
                        : LucideIcons.eye_off),
                    onPressed: () {
                      setState(() {
                        _passwordVisible = !_passwordVisible;
                      });
                    },
                  ),
                  isDense: true,
                  contentPadding: EdgeInsets.all(0),
                ),
                textCapitalization: TextCapitalization.sentences,
                obscureText: _passwordVisible,
              ),
            ),
            Container(
              margin: EdgeInsets.only(top: 24),
              child: Center(
                child: Container(
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.all(Radius.circular(4)),
                    boxShadow: [
                      BoxShadow(
                        color: theme.colorScheme.primary.withAlpha(28),
                        blurRadius: 4,
                        offset: Offset(0, 1),
                      ),
                    ],
                  ),
                  child: ElevatedButton(
                    onPressed: () {
                      Navigator.pop(context);
                    },
                    style: ButtonStyle(
                        elevation: WidgetStatePropertyAll(0),
                        padding:
                            WidgetStateProperty.all(MySpacing.xy(20, 12))),
                    child: MyText.bodyMedium("SAVE",
                        fontWeight: 600, color: theme.colorScheme.onPrimary),
                  ),
                ),
              ),
            ),

          ],
        ));
  }
}
