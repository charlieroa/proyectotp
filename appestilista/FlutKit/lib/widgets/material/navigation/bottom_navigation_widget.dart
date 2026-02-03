/*
* File : Bottom Navigation widget
* Version : 1.0.0
* Description :
* */


import 'package:flutkit/helpers/extensions/widgets_extension.dart';
import 'package:flutkit/helpers/theme/app_theme.dart';
import 'package:flutkit/helpers/widgets/my_text.dart';
import 'package:flutter/material.dart';
import 'package:flutter_lucide/flutter_lucide.dart';

class BottomNavigationWidget extends StatefulWidget {
  @override
  _BottomNavigationWidgetState createState() => _BottomNavigationWidgetState();
}

class _BottomNavigationWidgetState extends State<BottomNavigationWidget> {
  int _currentIndex = 0;
  late ThemeData theme;

  @override
  void initState() {
    super.initState();
    theme = AppTheme.theme;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        leading: IconButton(
          onPressed: () => Navigator.of(context).pop(),
          icon: Icon(LucideIcons.chevron_left).autoDirection(),
        ),
        title: MyText.titleMedium("Bottom Navigation", fontWeight: 600),
      ),
      body: Column(
        mainAxisAlignment: MainAxisAlignment.spaceEvenly,
        children: [
          Container(
            color: theme.colorScheme.surface,
            child: Center(
              child: _currentIndex == 0
                  ? Icon(Icons.chat,
                      color: theme.colorScheme.onSurface, size: 80)
                  : Icon(Icons.call,
                      color: theme.colorScheme.onSurface, size: 80),
            ),
          ),
          
        ],
      ),
      bottomNavigationBar: BottomNavigationBar(
        /*----------- Build Bottom Navigation Tab here ---------------*/
        currentIndex: _currentIndex,
        backgroundColor: theme.bottomAppBarTheme.color,
        selectedIconTheme: IconThemeData(color: theme.primaryColor),
        selectedItemColor: theme.primaryColor,
        unselectedIconTheme:
            IconThemeData(color: theme.colorScheme.onSurface),
        unselectedItemColor: theme.colorScheme.onSurface,
        onTap: onTapped,
        items: const [
          /*----------- Build Bottom Navigation Content here ---------------*/
          BottomNavigationBarItem(icon: Icon(Icons.chat), label: 'CHAT'),
          BottomNavigationBarItem(
            icon: Icon(Icons.call),
            label: 'CALL',
          )
        ],
      ),
    );
  }

  void onTapped(int value) {
    setState(() {
      _currentIndex = value;
    });
  }
}
