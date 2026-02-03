import 'dart:collection';

import 'package:flutkit/helpers/theme/app_theme.dart';
import 'package:flutkit/helpers/widgets/my_button.dart';
import 'package:flutkit/helpers/widgets/my_container.dart';
import 'package:flutkit/helpers/widgets/my_spacing.dart';
import 'package:flutkit/helpers/widgets/my_text.dart';
import 'package:flutkit/helpers/widgets/my_text_style.dart';
import 'package:flutter/material.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:flutter_lucide/flutter_lucide.dart';

class ShoppingAddressScreen extends StatefulWidget {
  @override
  _ShoppingAddressScreenState createState() => _ShoppingAddressScreenState();
}

class _ShoppingAddressScreenState extends State<ShoppingAddressScreen> {
  late GoogleMapController mapController;

  BitmapDescriptor? pinLocationIcon;
  int? _radioValue = 1;

  bool loaded = false;

  final Set<Marker> _markers = HashSet();
  final LatLng _center = const LatLng(45.521563, -122.677433);

  late ThemeData theme;

  @override
  void initState() {
    super.initState();

    theme = AppTheme.theme;
    WidgetsBinding.instance.addPostFrameCallback((_) => changeLoaded());
  }

  void changeLoaded() {
    setState(() {
      loaded = true;
    });
  }

  Marker marker = Marker(markerId: MarkerId('1'), position: LatLng(45.521563, -122.677433));

  void _onMapCreated(GoogleMapController controller) {
    mapController = controller;
    setState(() {
      _markers.add(marker);
    });
  }

  void changeLocation(double zoom, LatLng latLng) {
    double newZoom = zoom > 15 ? zoom : 15;
    setState(() {
      mapController.animateCamera(CameraUpdate.newCameraPosition(CameraPosition(target: latLng, zoom: newZoom)));
      _markers.clear();
      _markers.add(Marker(markerId: MarkerId('1'), position: latLng));
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Column(
        children: <Widget>[
          Expanded(
            child: loaded
                ? GoogleMap(
                    onMapCreated: _onMapCreated,
                    markers: _markers,
                    onTap: (latLong) {
                      mapController.getZoomLevel().then((value) => {changeLocation(value, latLong)});
                    },
                    initialCameraPosition: CameraPosition(target: _center, zoom: 11.0),
                  )
                : Container(),
          ),
          MyContainer(
            paddingAll: 16,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: <Widget>[
                Row(
                  children: <Widget>[
                    RadioGroup<int>(
                      groupValue: _radioValue,
                      onChanged: (int? value) {
                        if (value != null) {
                          setState(() {
                            _radioValue = value;
                          });
                        }
                      },
                      child: Row(
                        children: <Widget>[
                          GestureDetector(
                            onTap: () {
                              setState(() {
                                _radioValue = 1;
                              });
                            },
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: <Widget>[
                                Radio<int>(value: 1, visualDensity: VisualDensity.compact, activeColor: theme.colorScheme.primary),
                                MyText.titleSmall("Office", fontWeight: 600),
                              ],
                            ),
                          ),
                          MySpacing.width(8),
                          GestureDetector(
                            onTap: () {
                              setState(() {
                                _radioValue = 2;
                              });
                            },
                            child: Row(
                              children: <Widget>[
                                Radio<int>(value: 2, visualDensity: VisualDensity.compact, activeColor: theme.colorScheme.primary),
                                MyText.titleSmall("Home", fontWeight: 600),
                              ],
                            ),
                          ),
                          MySpacing.width(8),
                          GestureDetector(
                            onTap: () {
                              setState(() {
                                _radioValue = 3;
                              });
                            },
                            child: Row(
                              children: <Widget>[
                                Radio<int>(value: 3, visualDensity: VisualDensity.compact, activeColor: theme.colorScheme.primary),
                                MyText.titleSmall("Other", fontWeight: 600),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                MyContainer.bordered(
                  marginAll: 8,
                  paddingAll: 0,
                  borderRadiusAll: 8,
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: <Widget>[
                      TextFormField(
                        style: MyTextStyle.bodyMedium(),
                        decoration: InputDecoration(
                          hintStyle: MyTextStyle.bodyMedium(),
                          hintText: "Address 1",
                          border: OutlineInputBorder(borderRadius: BorderRadius.all(Radius.circular(8)), borderSide: BorderSide.none),
                          enabledBorder: OutlineInputBorder(
                            borderRadius: BorderRadius.all(Radius.circular(8)),
                            borderSide: BorderSide.none,
                          ),
                          focusedBorder: OutlineInputBorder(
                            borderRadius: BorderRadius.all(Radius.circular(8)),
                            borderSide: BorderSide.none,
                          ),
                          prefixIcon: Icon(LucideIcons.map_pin, size: 24),
                        ),
                        textCapitalization: TextCapitalization.sentences,
                      ),
                      Divider(height: 0),
                      TextFormField(
                        style: MyTextStyle.bodyMedium(),
                        decoration: InputDecoration(
                          hintStyle: MyTextStyle.bodyMedium(),
                          hintText: "Delivery Note",
                          border: OutlineInputBorder(borderRadius: BorderRadius.all(Radius.circular(8)), borderSide: BorderSide.none),
                          enabledBorder: OutlineInputBorder(
                            borderRadius: BorderRadius.all(Radius.circular(8)),
                            borderSide: BorderSide.none,
                          ),
                          focusedBorder: OutlineInputBorder(
                            borderRadius: BorderRadius.all(Radius.circular(8)),
                            borderSide: BorderSide.none,
                          ),
                          prefixIcon: Icon(LucideIcons.info, size: 24),
                        ),
                        textCapitalization: TextCapitalization.sentences,
                      ),
                    ],
                  ),
                ),
                MySpacing.height(16),
                Row(
                  crossAxisAlignment: CrossAxisAlignment.center,
                  children: <Widget>[
                    InkWell(
                      onTap: () {
                        Navigator.of(context).pop();
                      },
                      child: Icon(LucideIcons.chevron_left, color: theme.colorScheme.onSurface, size: 24),
                    ),
                    Expanded(
                      child: Center(
                        child: MyButton(
                          elevation: 2,
                          borderRadiusAll: 4,
                          onPressed: () {
                            Navigator.pop(context);
                          },
                          backgroundColor: theme.colorScheme.primary,
                          child: MyText.bodyMedium(
                            "Save Address".toUpperCase(),
                            fontWeight: 600,
                            letterSpacing: 0.5,
                            color: theme.colorScheme.onPrimary,
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
