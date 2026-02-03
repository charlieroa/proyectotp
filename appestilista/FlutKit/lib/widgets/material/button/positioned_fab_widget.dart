import 'package:flutkit/helpers/theme/app_theme.dart';
import 'package:flutkit/helpers/widgets/my_container.dart';
import 'package:flutkit/helpers/widgets/my_text.dart';
import 'package:flutter/material.dart';
import 'package:flutter_lucide/flutter_lucide.dart';

enum FabPosition { endDocked, endFloat, centerDocked, centerFloat, endTop, miniStartTop, startTop }

class PositionedFABWidget extends StatefulWidget {
  @override
  _PositionedFABWidgetState createState() => _PositionedFABWidgetState();
}

class _PositionedFABWidgetState extends State<PositionedFABWidget> {
  late CustomTheme customTheme;
  late ThemeData theme;

  final GlobalKey<ScaffoldState> _scaffoldKey = GlobalKey<ScaffoldState>();

  FabPosition _selectedPosition = FabPosition.endDocked;

  final Map<FabPosition, String> fabLabels = {
    FabPosition.endDocked: 'End Docked',
    FabPosition.endFloat: 'End Float',
    FabPosition.centerDocked: 'Center Docked',
    FabPosition.centerFloat: 'Center Float',
    FabPosition.endTop: 'End Top',
    FabPosition.miniStartTop: 'Mini Top',
    FabPosition.startTop: 'Start Top',
  };

  @override
  void initState() {
    super.initState();
    customTheme = AppTheme.customTheme;
    theme = AppTheme.theme;
  }

  void _handleValueChange(FabPosition value) {
    setState(() {
      _selectedPosition = value;
    });
  }

  FloatingActionButtonLocation get _fabLocation {
    switch (_selectedPosition) {
      case FabPosition.endDocked:
        return FloatingActionButtonLocation.endDocked;
      case FabPosition.endFloat:
        return FloatingActionButtonLocation.endFloat;
      case FabPosition.centerDocked:
        return FloatingActionButtonLocation.centerDocked;
      case FabPosition.centerFloat:
        return FloatingActionButtonLocation.centerFloat;
      case FabPosition.endTop:
        return FloatingActionButtonLocation.endTop;
      case FabPosition.miniStartTop:
        return FloatingActionButtonLocation.miniStartTop;
      case FabPosition.startTop:
        return FloatingActionButtonLocation.startTop;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      key: _scaffoldKey,
      extendBody: true,
      appBar: AppBar(
        elevation: 0,
        leading: InkWell(onTap: () => Navigator.of(context).pop(), child: Icon(LucideIcons.chevron_left, size: 20)),
        title: MyText.titleMedium("Positioned FAB", fontWeight: 700),
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () {
          // Click listener
        },
        backgroundColor: theme.colorScheme.primary,
        child: Icon(Icons.add),
      ),
      floatingActionButtonLocation: _fabLocation,
      bottomNavigationBar: BottomAppBar(
        shape: CircularNotchedRectangle(),
        color: customTheme.card,
        clipBehavior: Clip.none,
        notchMargin: 4,
        elevation: 4,
        child: SizedBox(height: 70),
      ),
      body: ListView(
        padding: const EdgeInsets.symmetric(vertical: 8),
        children: fabLabels.entries.map((entry) {
          return _buildOption(entry.key, entry.value);
        }).toList(),
      ),
    );
  }

  Widget _buildOption(FabPosition value, String label) {
    return MyContainer.bordered(
      onTap: () => _handleValueChange(value),
      margin: EdgeInsets.fromLTRB(16, 16, 16, 8),
      paddingAll: 0,
      borderRadiusAll: 4,
      child: Row(
        children: <Widget>[
          Radio<FabPosition>(value: value),
          SizedBox(width: 8),
          MyText.titleSmall(label, color: theme.colorScheme.onSurface, letterSpacing: 0.15, fontWeight: 500),
        ],
      ),
    );
  }
}
