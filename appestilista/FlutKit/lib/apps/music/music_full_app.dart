/*
* File : Music App
* Version : 1.0.0
* */

import 'package:flutkit/apps/music/music_home_screen.dart';
import 'package:flutkit/apps/music/music_player_screen.dart';
import 'package:flutkit/apps/music/music_playlist_screen.dart';
import 'package:flutkit/apps/music/music_podcast_screen.dart';
import 'package:flutkit/apps/music/music_profile_screen.dart';
import 'package:flutkit/helpers/theme/app_theme.dart';
import 'package:flutkit/helpers/utils/my_shadow.dart';
import 'package:flutkit/helpers/widgets/my_card.dart';
import 'package:flutter/material.dart';
import 'package:flutter_lucide/flutter_lucide.dart';

class MusicFullApp extends StatefulWidget {
  const MusicFullApp({super.key});

  @override
  State<MusicFullApp> createState() => _MusicFullAppPageState();
}

class _MusicFullAppPageState extends State<MusicFullApp>
    with SingleTickerProviderStateMixin {
  int _currentIndex = 1;

  TabController? _tabController;

  void _handleTabSelection() {
    setState(() {
      _currentIndex = _tabController!.index;
    });
  }

  @override
  void initState() {
    _tabController = TabController(length: 4, vsync: this, initialIndex: 1);
    _tabController!.addListener(_handleTabSelection);
    _tabController!.animation!.addListener(() {
      final aniValue = _tabController!.animation!.value;
      if (aniValue - _currentIndex > 0.5) {
        setState(() {
          _currentIndex = _currentIndex + 1;
        });
      } else if (aniValue - _currentIndex < -0.5) {
        setState(() {
          _currentIndex = _currentIndex - 1;
        });
      }
    });
    super.initState();
    customTheme = AppTheme.customTheme;
    theme = AppTheme.theme;
  }

  void onTapped(int value) {
    setState(() {
      _currentIndex = value;
    });
  }

  @override
  dispose() {
    super.dispose();
    _tabController!.dispose();
  }

  late CustomTheme customTheme;
  late ThemeData theme;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      bottomNavigationBar: BottomAppBar(
          elevation: 0,
          shape: CircularNotchedRectangle(),
          child: MyCard(
            shadow: MyShadow(elevation: 8),
            color: theme.colorScheme.surface,
            padding: EdgeInsets.only(top: 12, bottom: 12),
            child: TabBar(
              controller: _tabController,
              indicator: BoxDecoration(),
              indicatorSize: TabBarIndicatorSize.tab,
              indicatorColor: theme.colorScheme.primary,
              tabs: <Widget>[
                Container(
                  child: (_currentIndex == 0)
                      ? Column(
                          mainAxisSize: MainAxisSize.min,
                          children: <Widget>[
                            Icon(
                              LucideIcons.music,
                              color: theme.colorScheme.primary,
                            ),
                            Container(
                              margin: EdgeInsets.only(top: 4),
                              decoration: BoxDecoration(
                                  color: theme.primaryColor,
                                  borderRadius:
                                      BorderRadius.all(Radius.circular(2.5))),
                              height: 5,
                              width: 5,
                            )
                          ],
                        )
                      : Icon(
                          LucideIcons.music,
                          color: theme.colorScheme.onSurface,
                        ),
                ),
                Container(
                    margin: EdgeInsets.only(right: 24),
                    child: (_currentIndex == 1)
                        ? Column(
                            mainAxisSize: MainAxisSize.min,
                            children: <Widget>[
                              Icon(
                                LucideIcons.square_chart_gantt,
                                color: theme.colorScheme.primary,
                              ),
                              Container(
                                margin: EdgeInsets.only(top: 4),
                                decoration: BoxDecoration(
                                    color: theme.primaryColor,
                                    borderRadius:
                                        BorderRadius.all(Radius.circular(2.5))),
                                height: 5,
                                width: 5,
                              )
                            ],
                          )
                        : Icon(
                            LucideIcons.square_chart_gantt,
                            color: theme.colorScheme.onSurface,
                          )),
                Container(
                    margin: EdgeInsets.only(left: 24),
                    child: (_currentIndex == 2)
                        ? Column(
                            mainAxisSize: MainAxisSize.min,
                            children: <Widget>[
                              Icon(
                                LucideIcons.list_music,
                                color: theme.colorScheme.primary,
                              ),
                              Container(
                                margin: EdgeInsets.only(top: 4),
                                decoration: BoxDecoration(
                                    color: theme.primaryColor,
                                    borderRadius:
                                        BorderRadius.all(Radius.circular(2.5))),
                                height: 5,
                                width: 5,
                              )
                            ],
                          )
                        : Icon(
                            LucideIcons.list_music,
                            color: theme.colorScheme.onSurface,
                          )),
                Container(
                    child: (_currentIndex == 3)
                        ? Column(
                            mainAxisSize: MainAxisSize.min,
                            children: <Widget>[
                              Icon(
                                LucideIcons.user,
                                color: theme.colorScheme.primary,
                              ),
                              Container(
                                margin: EdgeInsets.only(top: 4),
                                decoration: BoxDecoration(
                                    color: theme.primaryColor,
                                    borderRadius:
                                        BorderRadius.all(Radius.circular(2.5))),
                                height: 5,
                                width: 5,
                              )
                            ],
                          )
                        : Icon(
                            LucideIcons.user,
                            color: theme.colorScheme.onSurface,
                          )),
              ],
            ),
          )),
      floatingActionButton: Hero(
        tag: 'music-fab',
        child: Container(
          decoration: BoxDecoration(
            borderRadius: BorderRadius.all(Radius.circular(32)),
            boxShadow: [
              BoxShadow(
                color: theme.colorScheme.primary.withAlpha(50),
                blurRadius: 6,
                spreadRadius: 2,
                offset: Offset(0, 2),
              ),
            ],
          ),
          child: FloatingActionButton(
            heroTag: null,
            tooltip: "Music Player",
            materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
            onPressed: () {
              Navigator.push(
                  context,
                  PageRouteBuilder(
                      transitionDuration: Duration(milliseconds: 400),
                      pageBuilder: (_, _, _) => MusicPlayerScreen()));
            },
            backgroundColor: theme.colorScheme.primary,
            elevation: 0,
            child: Icon(
              LucideIcons.play,
              size: 30,
              color: theme.colorScheme.onPrimary,
            ),
          ),
        ),
      ),
      floatingActionButtonLocation: FloatingActionButtonLocation.centerDocked,
      body: TabBarView(
        controller: _tabController,
        children: <Widget>[
          MusicHomeScreen(),
          MusicPodcastScreen(),
          MusicPlayListScreen(),
          MusicProfileScreen()
        ],
      ),
    );
  }
}
