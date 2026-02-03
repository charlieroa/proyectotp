/*
* File : Mail Compose
* Version : 1.0.0
* */


import 'package:flutkit/helpers/theme/app_theme.dart';
import 'package:flutkit/helpers/widgets/my_text.dart';
import 'package:flutter/material.dart';
import 'package:flutter_lucide/flutter_lucide.dart';

class MailComposeScreen extends StatefulWidget {
  const MailComposeScreen({super.key});

  @override
  State<MailComposeScreen> createState() => _MailComposeScreenState();
}

class _MailComposeScreenState extends State<MailComposeScreen> {
  final List<String> _simpleChoice = [
    "Schedule send",
    "Confidential Mode",
    "Discard",
    "Settings",
    "help and feedback"
  ];
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
        title: MyText('Compose', fontWeight: 600, letterSpacing: 0.15),
        leading: Material(
            child: InkWell(
                onTap: () {
                  Navigator.of(context).pop();
                },
                child: Icon(LucideIcons.chevron_left,
                    size: 20,
                    color: Theme.of(context).colorScheme.onSurface))),
        actions: <Widget>[
          Container(
            margin: EdgeInsets.only(right: 24),
            child: Material(
                child: InkWell(
                    child: Icon(LucideIcons.paperclip,
                        size: 20,
                        color: Theme.of(context).colorScheme.onSurface))),
          ),
          Material(
              child: InkWell(
                  onTap: () {
                    Navigator.of(context).pop();
                  },
                  child: Icon(LucideIcons.send,
                      size: 20,
                      color: Theme.of(context).colorScheme.onSurface))),
          Material(
            child: InkWell(
              child: PopupMenuButton(
                  itemBuilder: (BuildContext context) {
                    return _simpleChoice.map((String choice) {
                      return PopupMenuItem(
                        value: choice,
                        child: MyText(
                          choice,
                        ),
                      );
                    }).toList();
                  },
                  icon: Icon(LucideIcons.ellipsis_vertical,
                      size: 20,
                      color: Theme.of(context).colorScheme.onSurface),
                  color: Theme.of(context).colorScheme.surface),
            ),
          )
        ],
      ),
      body: ListView(
        children: [
          Container(
            color: Theme.of(context).colorScheme.surface,
            padding: EdgeInsets.only(top: 16, bottom: 16),
            child: Column(
              children: <Widget>[
                Container(
                  padding: EdgeInsets.only(left: 16, right: 16, bottom: 8),
                  child: Row(
                    children: <Widget>[
                      SizedBox(
                          width: 60,
                          child: MyText.bodyLarge(
                            "From",
                          )),
                      Expanded(
                        flex: 1,
                        child: TextFormField(
                          decoration: InputDecoration(
                            border: InputBorder.none,
                            enabledBorder: InputBorder.none,
                            focusedBorder: InputBorder.none,
                          ),
                          keyboardType: TextInputType.emailAddress,
                          controller:
                              TextEditingController(text: "nat@gmail.com"),
                        ),
                      ),
                      Icon(
                        LucideIcons.chevron_down,
                        color: Theme.of(context).colorScheme.onSurface,
                      ),
                    ],
                  ),
                ),
                Divider(
                  color: Theme.of(context).dividerColor,
                  thickness: 1,
                  height: 0,
                ),
                Container(
                  padding:
                      EdgeInsets.only(left: 16, right: 16, top: 8, bottom: 8),
                  child: Row(
                    children: <Widget>[
                      SizedBox(
                        width: 60,
                        child: MyText.bodyLarge(
                          "To",
                        ),
                      ),
                      Expanded(
                        flex: 1,
                        child: TextFormField(
                          decoration: InputDecoration(
                            border: InputBorder.none,
                            enabledBorder: InputBorder.none,
                            focusedBorder: InputBorder.none,
                          ),
                          keyboardType: TextInputType.emailAddress,
                        ),
                      ),
                      Icon(LucideIcons.chevron_down,
                          color: Theme.of(context).colorScheme.onSurface)
                    ],
                  ),
                ),
                Divider(
                  color: Theme.of(context).dividerColor,
                  thickness: 1,
                  height: 0,
                ),
                Container(
                  padding:
                      EdgeInsets.only(left: 16, right: 16, top: 8, bottom: 8),
                  child: Row(
                    children: <Widget>[
                      Expanded(
                        flex: 1,
                        child: TextFormField(
                          decoration: InputDecoration(
                              border: InputBorder.none,
                              enabledBorder: InputBorder.none,
                              focusedBorder: InputBorder.none,
                              hintText: "Subject"),
                        ),
                      ),
                    ],
                  ),
                ),
                Divider(
                  color: Theme.of(context).dividerColor,
                  thickness: 1,
                  height: 0,
                ),
                Container(
                  padding:
                      EdgeInsets.only(left: 16, right: 16, top: 8, bottom: 8),
                  child: Row(
                    children: <Widget>[
                      Expanded(
                        flex: 1,
                        child: TextFormField(
                          decoration: InputDecoration(
                              border: InputBorder.none,
                              enabledBorder: InputBorder.none,
                              focusedBorder: InputBorder.none,
                              hintText: "Compose email"),
                          maxLines: 10,
                          minLines: 1,
                          keyboardType: TextInputType.multiline,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),

        ],
      ),
    );
  }
}
