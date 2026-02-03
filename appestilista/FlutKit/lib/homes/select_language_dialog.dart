import 'package:flutkit/helpers/localizations/language.dart';
import 'package:flutkit/helpers/theme/app_notifier.dart';
import 'package:flutkit/helpers/theme/app_theme.dart';
import 'package:flutkit/helpers/widgets/my_text.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

class SelectLanguageDialog extends StatefulWidget {
  const SelectLanguageDialog({super.key});

  @override
  _SelectLanguageDialogState createState() => _SelectLanguageDialogState();
}

class _SelectLanguageDialogState extends State<SelectLanguageDialog> {
  late ThemeData themeData;

  late Language currentLanguage;

  @override
  void initState() {
    super.initState();
    currentLanguage = Language.currentLanguage;
  }

  Future<void> handleRadioValueChange(Language language) async {
    setState(() {
      currentLanguage = language;
    });
    Provider.of<AppNotifier>(context, listen: false).changeLanguage(language);
    Navigator.pop(context);
  }

  @override
  Widget build(BuildContext context) {
    return Consumer<AppNotifier>(
      builder: (BuildContext context, AppNotifier value, Widget? child) {
        themeData = AppTheme.theme;

        return Dialog(
          child: Container(
            padding: EdgeInsets.only(top: 16, bottom: 16),
            child: RadioGroup<Language>(
              groupValue: currentLanguage,
              onChanged: (Language? language) {
                if (language != null) {
                  handleRadioValueChange(language);
                }
              },
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: Language.languages.map((language) {
                  return InkWell(
                    onTap: () => handleRadioValueChange(language),
                    child: Container(
                      padding: EdgeInsets.symmetric(horizontal: 16),
                      child: Row(
                        children: <Widget>[
                          Radio<Language>(
                            value: language,
                            visualDensity: VisualDensity.compact,
                            activeColor: themeData.colorScheme.primary,
                          ),
                          MyText.titleSmall(language.languageName, fontWeight: 600),
                        ],
                      ),
                    ),
                  );
                }).toList(),
              ),
            ),
          ),
        );
      },
    );
  }
}
