/*
* File : Shopping Delivery
* Version : 1.0.0
* */

import 'package:flutkit/apps/shopping/shopping_payment_screen.dart';

import 'package:flutkit/helpers/extensions/extensions.dart';
import 'package:flutkit/helpers/theme/app_theme.dart';
import 'package:flutkit/helpers/widgets/my_button.dart';
import 'package:flutkit/helpers/widgets/my_container.dart';
import 'package:flutkit/helpers/widgets/my_spacing.dart';
import 'package:flutkit/helpers/widgets/my_text.dart';
import 'package:flutkit/helpers/widgets/my_text_style.dart';
import 'package:flutter/material.dart';
import 'package:flutter_lucide/flutter_lucide.dart';

class ShoppingDeliveryAddressScreen extends StatefulWidget {
  const ShoppingDeliveryAddressScreen({super.key});

  @override
  State<ShoppingDeliveryAddressScreen> createState() =>
      _ShoppingDeliveryAddressScreenState();
}

class _ShoppingDeliveryAddressScreenState
    extends State<ShoppingDeliveryAddressScreen> {
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
          leading: IconButton(
            onPressed: () => Navigator.of(context).pop(),
            icon: Icon(LucideIcons.chevron_left).autoDirection(),
          ),
          title: MyText.titleMedium("Delivery Address", fontWeight: 600),
          centerTitle: true,
        ),
        body: Center(
          child: ListView(
            shrinkWrap: true,
            children: <Widget>[
              MyContainer.bordered(
                paddingAll: 0,
                marginAll: 20,
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: <Widget>[
                    TextFormField(
                      style: MyTextStyle.titleSmall(
                          fontWeight: 500, letterSpacing: 0.2),
                      decoration: InputDecoration(
                        hintStyle: MyTextStyle.titleSmall(
                            fontWeight: 500,
                            letterSpacing: 0,
                            color:
                                theme.colorScheme.onSurface.withAlpha(180)),
                        hintText: "Address 1",
                        border: OutlineInputBorder(
                            borderRadius: BorderRadius.all(
                              Radius.circular(8.0),
                            ),
                            borderSide: BorderSide.none),
                        enabledBorder: OutlineInputBorder(
                            borderRadius: BorderRadius.all(
                              Radius.circular(8.0),
                            ),
                            borderSide: BorderSide.none),
                        focusedBorder: OutlineInputBorder(
                            borderRadius: BorderRadius.all(
                              Radius.circular(8.0),
                            ),
                            borderSide: BorderSide.none),
                        prefixIcon: Icon(LucideIcons.map_pin, size: 24),
                      ),
                      textCapitalization: TextCapitalization.sentences,
                    ),
                    Divider(
                      height: 0,
                    ),
                    TextFormField(
                      style: MyTextStyle.titleSmall(
                          fontWeight: 500, letterSpacing: 0.2),
                      decoration: InputDecoration(
                        hintStyle: MyTextStyle.titleSmall(
                            fontWeight: 500,
                            letterSpacing: 0,
                            color:
                                theme.colorScheme.onSurface.withAlpha(180)),
                        hintText: "Address 2",
                        border: OutlineInputBorder(
                            borderRadius: BorderRadius.all(
                              Radius.circular(8.0),
                            ),
                            borderSide: BorderSide.none),
                        enabledBorder: OutlineInputBorder(
                            borderRadius: BorderRadius.all(
                              Radius.circular(8.0),
                            ),
                            borderSide: BorderSide.none),
                        focusedBorder: OutlineInputBorder(
                            borderRadius: BorderRadius.all(
                              Radius.circular(8.0),
                            ),
                            borderSide: BorderSide.none),
                        prefixIcon: Icon(
                          LucideIcons.map,
                          size: 24,
                        ),
                      ),
                      textCapitalization: TextCapitalization.sentences,
                    ),
                    Divider(
                      height: 0,
                    ),
                    Row(
                      children: <Widget>[
                        Expanded(
                          flex: 1,
                          child: TextFormField(
                            style: MyTextStyle.titleSmall(
                                fontWeight: 500, letterSpacing: 0.2),
                            decoration: InputDecoration(
                              hintStyle: MyTextStyle.titleSmall(
                                  fontWeight: 500,
                                  letterSpacing: 0,
                                  color: theme.colorScheme.onSurface
                                      .withAlpha(180)),
                              hintText: "City",
                              border: OutlineInputBorder(
                                  borderRadius: BorderRadius.all(
                                    Radius.circular(8.0),
                                  ),
                                  borderSide: BorderSide.none),
                              enabledBorder: OutlineInputBorder(
                                  borderRadius: BorderRadius.all(
                                    Radius.circular(8.0),
                                  ),
                                  borderSide: BorderSide.none),
                              focusedBorder: OutlineInputBorder(
                                  borderRadius: BorderRadius.all(
                                    Radius.circular(8.0),
                                  ),
                                  borderSide: BorderSide.none),
                              prefixIcon: Icon(
                                LucideIcons.building,
                                size: 24,
                              ),
                            ),
                            textCapitalization: TextCapitalization.sentences,
                          ),
                        ),
                        Expanded(
                          flex: 1,
                          child: Padding(
                            padding: EdgeInsets.only(left: 8),
                            child: TextFormField(
                              style: MyTextStyle.titleSmall(
                                  fontWeight: 500, letterSpacing: 0.2),
                              decoration: InputDecoration(
                                hintStyle: MyTextStyle.titleSmall(
                                    fontWeight: 500,
                                    letterSpacing: 0,
                                    color: theme.colorScheme.onSurface
                                        .withAlpha(180)),
                                hintText: "PIN",
                                border: OutlineInputBorder(
                                    borderRadius: BorderRadius.all(
                                      Radius.circular(8.0),
                                    ),
                                    borderSide: BorderSide.none),
                                enabledBorder: OutlineInputBorder(
                                    borderRadius: BorderRadius.all(
                                      Radius.circular(8.0),
                                    ),
                                    borderSide: BorderSide.none),
                                focusedBorder: OutlineInputBorder(
                                    borderRadius: BorderRadius.all(
                                      Radius.circular(8.0),
                                    ),
                                    borderSide: BorderSide.none),
                                prefixIcon: Icon(
                                  LucideIcons.rectangle_ellipsis,
                                  size: 24,
                                ),
                              ),
                              textCapitalization: TextCapitalization.sentences,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              MyContainer.bordered(
                paddingAll: 0,
                marginAll: 20,
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: <Widget>[
                    TextFormField(
                      style: MyTextStyle.titleSmall(
                          fontWeight: 500, letterSpacing: 0.2),
                      decoration: InputDecoration(
                        hintStyle: MyTextStyle.titleSmall(
                            fontWeight: 500,
                            letterSpacing: 0,
                            color:
                                theme.colorScheme.onSurface.withAlpha(180)),
                        hintText: "Email",
                        border: OutlineInputBorder(
                            borderRadius: BorderRadius.all(
                              Radius.circular(8.0),
                            ),
                            borderSide: BorderSide.none),
                        enabledBorder: OutlineInputBorder(
                            borderRadius: BorderRadius.all(
                              Radius.circular(8.0),
                            ),
                            borderSide: BorderSide.none),
                        focusedBorder: OutlineInputBorder(
                            borderRadius: BorderRadius.all(
                              Radius.circular(8.0),
                            ),
                            borderSide: BorderSide.none),
                        prefixIcon: Icon(LucideIcons.mail, size: 24),
                      ),
                      keyboardType: TextInputType.emailAddress,
                    ),
                    Divider(
                      height: 0,
                    ),
                    TextFormField(
                      style: MyTextStyle.titleSmall(
                          fontWeight: 500, letterSpacing: 0.2),
                      decoration: InputDecoration(
                        hintStyle: MyTextStyle.titleSmall(
                            fontWeight: 500,
                            letterSpacing: 0,
                            color:
                                theme.colorScheme.onSurface.withAlpha(180)),
                        hintText: "Contact",
                        border: OutlineInputBorder(
                            borderRadius: BorderRadius.all(
                              Radius.circular(8.0),
                            ),
                            borderSide: BorderSide.none),
                        enabledBorder: OutlineInputBorder(
                            borderRadius: BorderRadius.all(
                              Radius.circular(8.0),
                            ),
                            borderSide: BorderSide.none),
                        focusedBorder: OutlineInputBorder(
                            borderRadius: BorderRadius.all(
                              Radius.circular(8.0),
                            ),
                            borderSide: BorderSide.none),
                        prefixIcon: Icon(
                          LucideIcons.phone,
                          size: 24,
                        ),
                      ),
                      keyboardType: TextInputType.number,
                    ),
                    Divider(
                      height: 0,
                    ),
                    TextFormField(
                      style: MyTextStyle.titleSmall(
                          fontWeight: 500, letterSpacing: 0.2),
                      decoration: InputDecoration(
                        hintStyle: MyTextStyle.titleSmall(
                            fontWeight: 500,
                            letterSpacing: 0,
                            color:
                                theme.colorScheme.onSurface.withAlpha(180)),
                        hintText: "Delivery note",
                        border: OutlineInputBorder(
                            borderRadius: BorderRadius.all(
                              Radius.circular(8.0),
                            ),
                            borderSide: BorderSide.none),
                        enabledBorder: OutlineInputBorder(
                            borderRadius: BorderRadius.all(
                              Radius.circular(8.0),
                            ),
                            borderSide: BorderSide.none),
                        focusedBorder: OutlineInputBorder(
                            borderRadius: BorderRadius.all(
                              Radius.circular(8.0),
                            ),
                            borderSide: BorderSide.none),
                        prefixIcon: Icon(
                          LucideIcons.info,
                          size: 24,
                        ),
                      ),
                      textCapitalization: TextCapitalization.sentences,
                    ),
                  ],
                ),
              ),
              Center(
                child: MyButton(
                    padding: MySpacing.x(40),
                    elevation: 0,
                    borderRadiusAll: 4,
                    onPressed: () {
                      Navigator.push(
                          context,
                          MaterialPageRoute(
                              builder: (context) => ShoppingPaymentScreen()));
                    },
                    child: MyText.bodyMedium("NEXT",
                        fontWeight: 600,
                        color: theme.colorScheme.onPrimary,
                        letterSpacing: 0.5)),
              ),

            ],
          ),
        ));
  }
}
