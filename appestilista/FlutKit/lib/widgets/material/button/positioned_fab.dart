/*
* File : Positioned FAB
* Version : 1.0.0
* */


import 'package:flutkit/helpers/theme/app_theme.dart';
import 'package:flutkit/helpers/widgets/my_spacing.dart';
import 'package:flutkit/helpers/widgets/my_text.dart';
import 'package:flutter/material.dart';

class PositionedFAB extends StatefulWidget {
  @override
  _PositionedFABState createState() => _PositionedFABState();
}

class _PositionedFABState extends State<PositionedFAB> {
  late ThemeData theme;
  late CustomTheme customTheme;

  @override
  void initState() {
    super.initState();
    theme = AppTheme.theme;
    customTheme = AppTheme.customTheme;
  }

  final GlobalKey<ScaffoldState> _scaffoldKey = GlobalKey<ScaffoldState>();

  int _radioValue = 1;
  int fabEndDocked = 1,
      fabEndFloat = 2,
      fabCenterDocked = 3,
      fabCenterFloat = 4,
      fabEndTop = 5,
      fabMiniStartTop = 6,
      fabStartTop = 7;

  FloatingActionButtonLocation _fabLocation =
      FloatingActionButtonLocation.endDocked;

  void _handleValueChange(int value) {
    setState(() {
      _radioValue = value;
      switch (value) {
        case 1:
          setState(() {
            _fabLocation = FloatingActionButtonLocation.endDocked;
          });
          break;
        case 2:
          setState(() {
            _fabLocation = FloatingActionButtonLocation.endFloat;
          });
          break;
        case 3:
          setState(() {
            _fabLocation = FloatingActionButtonLocation.centerDocked;
          });
          break;
        case 4:
          setState(() {
            _fabLocation = FloatingActionButtonLocation.centerFloat;
          });
          break;
        case 5:
          setState(() {
            _fabLocation = FloatingActionButtonLocation.endTop;
          });
          break;
        case 6:
          setState(() {
            _fabLocation = FloatingActionButtonLocation.miniStartTop;
          });
          break;
        case 7:
          setState(() {
            _fabLocation = FloatingActionButtonLocation.startTop;
          });
          break;
        default:
          setState(() {
            _fabLocation = FloatingActionButtonLocation.endDocked;
          });
          break;
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
        extendBody: true,
        key: _scaffoldKey,
        floatingActionButton: FloatingActionButton(
          onPressed: () {
            /* Click listener */
          },
          backgroundColor: theme.colorScheme.primary,
          child: Icon(Icons.add),
        ),
        floatingActionButtonLocation: _fabLocation,
        bottomNavigationBar: BottomAppBar(
          shape: CircularNotchedRectangle(),
          clipBehavior: Clip.none,
          color: customTheme.card,
          notchMargin: 4,
          elevation: 4,
          child: Container(
            height: 70,
          ),
        ),
        body: Column(
          children: <Widget>[
            RadioGroup<dynamic>(
              groupValue: _radioValue,
              onChanged: (value) {
                _handleValueChange(value);
              },
              child: Column(
                children: <Widget>[
                  _buildRadioItem(fabEndDocked, "End Docked"),
                  _buildRadioItem(fabEndFloat, "End Float"),
                  _buildRadioItem(fabCenterDocked, "Center Docked"),
                  _buildRadioItem(fabCenterFloat, "Center Float"),
                  _buildRadioItem(fabEndTop, "End Top"),
                  _buildRadioItem(fabMiniStartTop, "Mini Top"),
                  _buildRadioItem(fabStartTop, "Start Top"),
                ],
              ),
            ),
          ],
        )

    );
  }

  Widget _buildRadioItem(dynamic value, String label) {
    return GestureDetector(
      onTap: () {
        _handleValueChange(value);
      },
      child: Container(
        margin: MySpacing.xy(16, 8),
        child: Row(
          children: <Widget>[
            Radio<dynamic>(
              value: value,
              activeColor: theme.colorScheme.primary,
            ),
            MyText.titleSmall(
              label,
              color: theme.colorScheme.onSurface,
              letterSpacing: 0.15,
              fontWeight: 500,
            ),
          ],
        ),
      ),
    );
  }

}
