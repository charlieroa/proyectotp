/*
* File : Simple Chip
* Version : 1.0.0
* */

import 'package:flutkit/helpers/theme/app_theme.dart';
import 'package:flutkit/helpers/widgets/my_text.dart';
import 'package:flutter/material.dart';
import 'package:flutter_lucide/flutter_lucide.dart';

class SimpleChipWidget extends StatefulWidget {
  @override
  _SimpleChipWidgetState createState() => _SimpleChipWidgetState();
}

class _SimpleChipWidgetState extends State<SimpleChipWidget> {
  final GlobalKey<ScaffoldState> _scaffoldKey = GlobalKey<ScaffoldState>();
  final GlobalKey<ScaffoldMessengerState> scaffoldMessengerKey =
      GlobalKey<ScaffoldMessengerState>();

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
        key: _scaffoldKey,
        appBar: AppBar(
          elevation: 0,
          leading: InkWell(
            onTap: () => Navigator.of(context).pop(),
            child: Icon(
              LucideIcons.chevron_left,
              size: 20,
            ),
          ),
          title: MyText.titleMedium("Simple Chip", fontWeight: 600),
        ),
        body: Container(
            width: MediaQuery.of(context).size.width,
            color: theme.colorScheme.surface,
            child: Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: <Widget>[
                  Chip(
                    backgroundColor: theme.colorScheme.surface,
                    label: MyText.titleMedium('Simple',
                        color: theme.colorScheme.onSurface),
                  ),
                  Chip(
                    backgroundColor: theme.colorScheme.surface,
                    avatar: CircleAvatar(
                      backgroundColor: theme.colorScheme.primary,
                      child: MyText.titleMedium('L',
                          color: theme.colorScheme.onSecondary),
                    ),
                    label: MyText.titleMedium('Leading',
                        color: theme.colorScheme.onSurface),
                  ),
                  Chip(
                    deleteIconColor: theme.colorScheme.secondary,
                    backgroundColor: theme.colorScheme.surface,
                    onDeleted: () {
                      showSimpleSnackbar("Delete pressed");
                    },
                    label: MyText.titleMedium('Trailing',
                        color: theme.colorScheme.onSurface),
                  ),
                  Chip(
                    deleteIconColor: theme.colorScheme.secondary,
                    backgroundColor: theme.colorScheme.surface,
                    avatar: CircleAvatar(
                      backgroundColor: theme.colorScheme.primary,
                      child: MyText.titleMedium('S',
                          color: theme.colorScheme.onPrimary),
                    ),
                    onDeleted: () {
                      showSimpleSnackbar("Delete pressed");
                    },
                    label: MyText.titleMedium('Small',
                        color: theme.colorScheme.onSurface),
                  ),
                  Chip(
                    padding: EdgeInsets.all(8),
                    deleteIconColor: theme.colorScheme.secondary,
                    backgroundColor: theme.colorScheme.surface,
                    avatar: CircleAvatar(
                      backgroundColor: theme.colorScheme.primary,
                      child: MyText.titleSmall('M',
                          color: theme.colorScheme.onPrimary),
                    ),
                    onDeleted: () {
                      showSimpleSnackbar("Delete pressed");
                    },
                    label: MyText.titleMedium('Medium',
                        color: theme.colorScheme.onSurface),
                  ),
                  Chip(
                    padding: EdgeInsets.all(8),
                    deleteIcon: Icon(LucideIcons.delete),
                    backgroundColor: theme.colorScheme.surface,
                    deleteIconColor: theme.colorScheme.secondary,
                    onDeleted: () {
                      showSimpleSnackbar("Delete pressed");
                    },
                    label: MyText.titleMedium('Custom Icon',
                        color: theme.colorScheme.onSurface),
                  ),
                  Chip(
                    deleteButtonTooltipMessage: "Custom Message",
                    padding: EdgeInsets.all(8),
                    avatar: CircleAvatar(
                      backgroundColor: theme.colorScheme.primary,
                      child: MyText.titleSmall('H',
                          color: theme.colorScheme.onPrimary),
                    ),
                    deleteIconColor: theme.colorScheme.secondary,
                    backgroundColor: theme.colorScheme.surface,
                    onDeleted: () {
                      showSimpleSnackbar("Delete pressed");
                    },
                    label: MyText.titleMedium('Hold Delete',
                        color: theme.colorScheme.onSurface),
                  ),
                  Chip(
                    padding: EdgeInsets.all(8),
                    elevation: 10,
                    avatar: CircleAvatar(
                      backgroundColor: theme.colorScheme.primary,
                      child: MyText.titleSmall('E',
                          color: theme.colorScheme.onPrimary),
                    ),
                    deleteIconColor: theme.colorScheme.secondary,
                    backgroundColor: theme.colorScheme.surface,
                    onDeleted: () {
                      showSimpleSnackbar("Delete pressed");
                    },
                    label: MyText.titleMedium('Elevated',
                        color: theme.colorScheme.onSurface),
                  ),
                ],
              ),
            )));
  }

  void showSimpleSnackbar(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: MyText.titleSmall(message, color: theme.colorScheme.onPrimary),
        backgroundColor: theme.colorScheme.primary,
      ),
    );
  }
}
