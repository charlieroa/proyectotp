/*
* File : Cupertino Tabs
* Version : 1.0.0
* */

import 'package:flutkit/helpers/theme/app_theme.dart';
import 'package:flutkit/helpers/widgets/my_text.dart';
import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:flutter_lucide/flutter_lucide.dart';

class CupertinoTabWidget extends StatefulWidget {
  @override
  _CupertinoTabWidgetState createState() => _CupertinoTabWidgetState();
}

class _CupertinoTabWidgetState extends State<CupertinoTabWidget> {
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
    return CupertinoTabScaffold(
      tabBar: CupertinoTabBar(
        activeColor: theme.colorScheme.secondary,
        items: <BottomNavigationBarItem>[
          BottomNavigationBarItem(icon: Icon(LucideIcons.message_square)),
          BottomNavigationBarItem(icon: Icon(LucideIcons.text_align_end)),
        ],
      ),
      tabBuilder: (BuildContext context, int index) {
        return CupertinoTabView(
          builder: (BuildContext context) {
            return CupertinoPageScaffold(
              navigationBar: CupertinoNavigationBar(
                middle: MyText('Page 1 of tab $index'),
              ),
              child: Center(
                child: CupertinoButton(
                  child: MyText('Next page'),
                  onPressed: () {
                    Navigator.of(context).push(
                      CupertinoPageRoute<void>(
                        builder: (BuildContext context) {
                          return CupertinoPageScaffold(
                            navigationBar: CupertinoNavigationBar(
                              middle: MyText('Page 2 of tab $index'),
                            ),
                            child: Center(
                              child: CupertinoButton(
                                child: MyText('Back'),
                                onPressed: () {
                                  Navigator.of(context).pop();
                                },
                              ),
                            ),
                          );
                        },
                      ),
                    );
                  },
                ),
              ),
            );
          },
        );
      },
    );
  }
}
