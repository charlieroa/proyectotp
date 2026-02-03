 import 'package:flutter/material.dart';

commonDivider({double? height, Color? color}){
  return Divider(
    height: height,
    endIndent: 1,
    indent: 1,
    color: color,
    thickness: 0.5,
  );
 }