import 'package:flutkit/helpers/theme/app_notifier.dart';
import 'package:flutkit/helpers/theme/theme_type.dart';
import 'package:flutkit/helpers/widgets/my_text.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import 'package:flutkit/helpers/theme/app_theme.dart';

class SelectThemeDialog extends StatefulWidget {
  @override
  _SelectThemeDialogState createState() => _SelectThemeDialogState();
}

class _SelectThemeDialogState extends State<SelectThemeDialog> {
  late ThemeData themeData;

  late ThemeType selectedTheme;

  @override
  void initState() {
    super.initState();
    selectedTheme = AppTheme.themeType;
  }

  void _handleRadioValueChange(ThemeType themeType) {
    setState(() {
      selectedTheme = themeType;
    });
    Provider.of<AppNotifier>(context, listen: false).updateTheme(themeType);
    Navigator.of(context).pop();
  }

  @override
  Widget build(BuildContext context) {
    themeData = Theme.of(context);
    return Consumer<AppNotifier>(
      builder: (BuildContext context, AppNotifier value, Widget? child) {
        return Dialog(
          child: Container(
            padding: EdgeInsets.only(top: 16, bottom: 16),
            child: RadioGroup<ThemeType>(
              groupValue: selectedTheme,
              onChanged: (ThemeType? themeType) {
                if (themeType != null) {
                  _handleRadioValueChange(themeType);
                }
              },
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: <Widget>[
                  InkWell(
                    onTap: () => _handleRadioValueChange(ThemeType.light),
                    child: Container(
                      padding: EdgeInsets.symmetric(horizontal: 16),
                      child: Row(
                        children: <Widget>[
                          Radio<ThemeType>(
                            value: ThemeType.light,
                            visualDensity: VisualDensity.compact,
                            activeColor: themeData.colorScheme.primary,
                          ),
                          MyText.titleSmall("Light Theme"),
                          Container(
                            margin: EdgeInsets.only(left: 16),
                            width: 22,
                            height: 22,
                            decoration: BoxDecoration(
                              border: Border.all(color: themeData.colorScheme.onSurface, width: 1),
                              color: AppTheme.lightTheme.colorScheme.surface,
                              borderRadius: BorderRadius.all(Radius.circular(11)),
                            ),
                          ),
                          Container(
                            margin: EdgeInsets.only(left: 8),
                            width: 22,
                            height: 22,
                            decoration: BoxDecoration(
                              border: Border.all(color: themeData.colorScheme.onSurface, width: 1),
                              color: AppTheme.lightTheme.colorScheme.primary,
                              borderRadius: BorderRadius.all(Radius.circular(11)),
                            ),
                          ),
                          Container(
                            margin: EdgeInsets.only(left: 8),
                            width: 22,
                            height: 22,
                            decoration: BoxDecoration(
                              border: Border.all(color: themeData.colorScheme.onSurface, width: 1),
                              color: AppTheme.lightTheme.colorScheme.secondary,
                              borderRadius: BorderRadius.all(Radius.circular(11)),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                  InkWell(
                    onTap: () => _handleRadioValueChange(ThemeType.dark),
                    child: Container(
                      padding: EdgeInsets.symmetric(horizontal: 16),
                      child: Row(
                        children: <Widget>[
                          Radio<ThemeType>(
                            value: ThemeType.dark,
                            visualDensity: VisualDensity.compact,
                            activeColor: themeData.colorScheme.secondary,
                          ),
                          MyText.titleSmall("Dark Theme"),
                          Container(
                            margin: EdgeInsets.only(left: 16),
                            width: 22,
                            height: 22,
                            decoration: BoxDecoration(
                              border: Border.all(color: themeData.colorScheme.onSurface, width: 1),
                              color: AppTheme.darkTheme.colorScheme.surface,
                              borderRadius: BorderRadius.all(Radius.circular(11)),
                            ),
                          ),
                          Container(
                            margin: EdgeInsets.only(left: 8),
                            width: 22,
                            height: 22,
                            decoration: BoxDecoration(
                              border: Border.all(color: themeData.colorScheme.onSurface, width: 1),
                              color: AppTheme.darkTheme.colorScheme.primary,
                              borderRadius: BorderRadius.all(Radius.circular(11)),
                            ),
                          ),
                          Container(
                            margin: EdgeInsets.only(left: 8),
                            width: 22,
                            height: 22,
                            decoration: BoxDecoration(
                              border: Border.all(color: themeData.colorScheme.onSurface, width: 1),
                              color: AppTheme.darkTheme.colorScheme.secondary,
                              borderRadius: BorderRadius.all(Radius.circular(11)),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                  Container(margin: EdgeInsets.only(top: 8), child: MyText.bodyMedium("More themes are coming soon...")),
                ],
              ),
            ),
          ),
        );
      },
    );
  }
}
