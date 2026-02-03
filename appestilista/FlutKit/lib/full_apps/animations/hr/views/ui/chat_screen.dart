import 'package:flutkit/full_apps/animations/hr/controller/ui/chat_controller.dart';
import 'package:flutkit/helpers/theme/app_theme.dart';
import 'package:flutkit/helpers/utils/my_shadow.dart';
import 'package:flutkit/helpers/widgets/my_card.dart';
import 'package:flutkit/helpers/widgets/my_container.dart';
import 'package:flutkit/helpers/widgets/my_spacing.dart';
import 'package:flutkit/helpers/widgets/my_text.dart';
import 'package:flutkit/helpers/widgets/my_text_style.dart';
import 'package:flutkit/images.dart';
import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:flutter_lucide/flutter_lucide.dart';

class EmployeeChatScreen extends StatefulWidget {
  const EmployeeChatScreen({super.key});

  @override
  State<EmployeeChatScreen> createState() => _EmployeeChatScreenState();
}

class _EmployeeChatScreenState extends State<EmployeeChatScreen> {
  late ThemeData theme;
  static const List<String> list = <String>['One', 'Two', 'Three', 'Four'];
  EmployeeChatController chatController = Get.put(EmployeeChatController());
  String dropdownValue = list.first;

  @override
  void initState() {
    theme = AppTheme.employeeCommunication;
    super.initState();
  }

  final List<String> _simpleChoice = ["Create shortcut", "Clear chat"];

  @override
  Widget build(BuildContext context) {
    return GetBuilder<EmployeeChatController>(
      init: EmployeeChatController(),
      builder: (controller) {
        return Scaffold(
          body: Container(
            padding: MySpacing.top(MySpacing.safeAreaTop(context)),
            child: Column(
              children: [
                MyCard(
                  shadow: MyShadow(
                      elevation: 0.5, position: MyShadowPosition.bottom),
                  paddingAll: 0,
                  child: appBarWidget(),
                ),
                MySpacing.height(12),
                buildChats(),
                Container(
                  child: buildBottomBar(),
                )
              ],
            ),
          ),
        );
      },
    );
  }

  Widget buildChats() {
    return Expanded(
        child: Container(
      margin: MySpacing.horizontal(16),
      child: ListView.builder(
        controller: chatController.scrollController,
        padding: MySpacing.zero,
        itemCount:
            (chatController.employeeChatModelData?.messages ?? []).length,
        itemBuilder: (context, index) {
          final message =
              (chatController.employeeChatModelData?.messages ?? [])[index];
          final isSent = message.fromMe == true;
          final theme = isSent ? CustomTheme.grey : CustomTheme.brown;
          return Row(
            mainAxisAlignment:
                isSent ? MainAxisAlignment.end : MainAxisAlignment.start,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              if (!isSent)
                Column(
                  children: [
                    MyContainer.rounded(
                      height: 32,
                      width: 32,
                      paddingAll: 0,
                      child: Image.asset(
                        Images.hrAvatars[6],
                        fit: BoxFit.cover,
                      ),
                    ),
                    MySpacing.height(8),
                    MyText.bodySmall(
                      "${message.sendAt.hour}-${message.sendAt.minute}",
                      fontSize: 8,
                      muted: true,
                      fontWeight: 600,
                    ),
                  ],
                ),
              MySpacing.width(12),
              Expanded(
                child: Wrap(
                  alignment: isSent ? WrapAlignment.end : WrapAlignment.start,
                  children: [
                    MyContainer(
                      padding: EdgeInsets.all(8),
                      margin: EdgeInsets.only(
                          left: isSent
                              ? MediaQuery.of(context).size.width * 0.20
                              : 0,
                          right: isSent
                              ? 0
                              : MediaQuery.of(context).size.width * 0.20,
                          bottom: 16),
                      color: theme.withAlpha(20),
                      borderRadius: BorderRadius.only(
                        bottomLeft: Radius.circular(8),
                        topLeft: Radius.circular(isSent ? 8 : 0),
                        bottomRight: Radius.circular(8),
                        topRight: Radius.circular(isSent ? 0 : 8),
                      ),
                      child: MyText.bodyMedium(
                        message.message,
                        fontWeight: 600,
                        color: isSent ? CustomTheme.grey : CustomTheme.brown,
                        overflow: TextOverflow.clip,
                      ),
                    ),
                  ],
                ),
              ),
              MySpacing.width(12),
              if (chatController.employeeChatModelData != null && isSent)
                Column(
                  children: [
                    MyContainer.rounded(
                      height: 32,
                      width: 32,
                      paddingAll: 0,
                      child: Image.asset(
                        Images.hrAvatars[6],
                        fit: BoxFit.cover,
                      ),
                    ),
                    MySpacing.height(4),
                    MyText.bodySmall(
                      "${message.sendAt.hour}-${message.sendAt.minute}",
                      fontSize: 8,
                      muted: true,
                      fontWeight: 600,
                    ),
                  ],
                ),
            ],
          );
        },
      ),
    ));
  }

  Widget buildBottomBar() {
    return MyCard(
      borderRadiusAll: 8,
      shadow: MyShadow(elevation: 0.5),
      child: Align(
        alignment: Alignment.bottomCenter,
        child: Row(
          children: [
            Expanded(
              child: TextFormField(
                controller: chatController.messageController,
                decoration: InputDecoration(
                  hintText: "Type your message here",
                  hintStyle:
                      MyTextStyle.bodyLarge(fontWeight: 600, muted: true),
                  contentPadding: MySpacing.all(16),
                  focusedBorder: OutlineInputBorder(
                    borderSide: BorderSide(color: theme.colorScheme.primary),
                    borderRadius: BorderRadius.all(
                      Radius.circular(8),
                    ),
                  ),
                  border: OutlineInputBorder(
                    borderSide: BorderSide(color: theme.colorScheme.primary),
                    borderRadius: BorderRadius.all(
                      Radius.circular(8),
                    ),
                  ),
                  suffixIcon: MyContainer(
                      onTap: () {
                        chatController.messageController.value.text.isNotEmpty
                            ? chatController.sendMessage()
                            : null;
                      },
                      margin: MySpacing.only(left: 12),
                      paddingAll: 0,
                      height: 60,
                      width: 60,
                      clipBehavior: Clip.antiAliasWithSaveLayer,
                      color: theme.colorScheme.primary.withAlpha(40),
                      borderRadius: BorderRadius.only(
                          topRight: Radius.circular(8),
                          bottomRight: Radius.circular(8)),
                      child: Icon(
                        LucideIcons.send,
                        color: theme.colorScheme.primary,
                      )),
                  prefixIcon: MyContainer(
                    paddingAll: 0,
                    margin: MySpacing.only(right: 12),
                    height: 60,
                    width: 50,
                    clipBehavior: Clip.antiAliasWithSaveLayer,
                    color: theme.colorScheme.secondary.withAlpha(40),
                    borderRadius: BorderRadius.only(
                      topLeft: Radius.circular(8),
                      bottomLeft: Radius.circular(8),
                    ),
                    child: Icon(
                      LucideIcons.mic,
                      color: theme.colorScheme.secondary,
                    ),
                  ),
                  suffixIconConstraints:
                      BoxConstraints(maxHeight: 60, maxWidth: 60),
                  prefixIconConstraints: BoxConstraints(maxHeight: 60),
                ),
                cursorColor: theme.colorScheme.primary,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget appBarWidget() {
    return MyContainer(
      padding: MySpacing.fromLTRB(16, 4, 4, 4),
      color: theme.scaffoldBackgroundColor,
      child: Row(
        children: [
          InkWell(
            onTap: () {
              Navigator.pop(context);
            },
            child: Icon(
              LucideIcons.move_left,
            ),
          ),
          MySpacing.width(12),
          Stack(
            alignment: Alignment.bottomRight,
            children: [
              MyContainer.rounded(
                height: 32,
                width: 32,
                paddingAll: 0,
                clipBehavior: Clip.antiAliasWithSaveLayer,
                child: Image.asset(
                  Images.hrAvatars[8],
                  fit: BoxFit.cover,
                ),
              ),
              Positioned(
                bottom: 1,
                child: MyContainer.rounded(
                  paddingAll: 2,
                  child: MyContainer.rounded(
                    paddingAll: 4,
                    color: chatController.employeeChatModelData!.status == true
                        ? CustomTheme.green
                        : CustomTheme.red,
                  ),
                ),
              ),
            ],
          ),
          Container(
            margin: MySpacing.left(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                MyText.bodyLarge(chatController.employeeChatModelData!.name,
                    fontWeight: 600),
                MyText.bodySmall(
                    chatController.employeeChatModelData!.status == true
                        ? "Online"
                        : "Offline",
                    muted: true,
                    fontWeight: 600),
              ],
            ),
          ),
          Expanded(
            child: Container(
              alignment: Alignment.centerRight,
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  InkWell(
                    onTap: () {},
                    child: Container(
                      padding: MySpacing.all(4),
                      child: Icon(
                        LucideIcons.phone,
                        size: 18,
                      ),
                    ),
                  ),
                  InkWell(
                    onTap: () {},
                    child: Container(
                      margin: MySpacing.left(8),
                      padding: MySpacing.all(4),
                      child: Icon(
                        LucideIcons.video,
                        size: 22,
                      ),
                    ),
                  ),
                  Container(
                    margin: MySpacing.left(4),
                    child: PopupMenuButton(
                      itemBuilder: (BuildContext context) {
                        return _simpleChoice.map((String choice) {
                          return PopupMenuItem(
                            value: choice,
                            child: MyText.bodyMedium(
                              choice,
                              letterSpacing: 0.15,
                            ),
                          );
                        }).toList();
                      },
                      icon: Icon(
                        LucideIcons.ellipsis_vertical,
                      ),
                    ),
                  )
                ],
              ),
            ),
          )
        ],
      ),
    );
  }
}
