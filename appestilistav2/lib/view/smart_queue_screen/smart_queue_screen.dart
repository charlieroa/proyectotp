import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:home_helper_flutter_ui_kit/config/app_color.dart';
import 'package:home_helper_flutter_ui_kit/config/app_size.dart';
import 'package:home_helper_flutter_ui_kit/config/font_family.dart';
import 'package:home_helper_flutter_ui_kit/services/api_service.dart';

class SmartQueueScreen extends StatefulWidget {
  const SmartQueueScreen({Key? key}) : super(key: key);

  @override
  State<SmartQueueScreen> createState() => _SmartQueueScreenState();
}

class _SmartQueueScreenState extends State<SmartQueueScreen>
    with SingleTickerProviderStateMixin {
  Map<String, dynamic>? _smartQueueData;
  bool _isLoading = true;
  late AnimationController _animationController;
  late Animation<double> _pulseAnimation;

  @override
  void initState() {
    super.initState();
    _animationController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1500),
    )..repeat(reverse: true);
    
    _pulseAnimation = Tween<double>(begin: 0.98, end: 1.02).animate(
      CurvedAnimation(parent: _animationController, curve: Curves.easeInOut),
    );
    
    _loadData();
  }

  @override
  void dispose() {
    _animationController.dispose();
    super.dispose();
  }

  Future<void> _loadData() async {
    setState(() => _isLoading = true);
    try {
      final data = await ApiService.getSmartQueue();
      setState(() {
        _smartQueueData = data;
        _isLoading = false;
      });
    } catch (e) {
      setState(() => _isLoading = false);
      Get.snackbar('Error', 'Error al cargar fichero inteligente: ${e.toString()}');
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Theme.of(context).primaryColor,
      appBar: PreferredSize(
        preferredSize: const Size.fromHeight(kToolbarHeight),
        child: Container(
          decoration: BoxDecoration(
            boxShadow: [
              BoxShadow(
                color: Theme.of(context).appBarTheme.shadowColor!,
                spreadRadius: AppSize.height0,
                blurRadius: AppSize.height14,
                offset: const Offset(
                  AppSize.height0,
                  AppSize.height4,
                ),
              ),
            ],
          ),
          child: AppBar(
            scrolledUnderElevation: 0.0,
            shadowColor: Theme.of(context).appBarTheme.shadowColor,
            backgroundColor: Theme.of(context).appBarTheme.backgroundColor,
            centerTitle: false,
            automaticallyImplyLeading: false,
            title: Text(
              'Fichero Inteligente',
              style: TextStyle(
                fontFamily: FontFamily.mulishBold,
                fontSize: AppSize.height18,
                fontStyle: FontStyle.normal,
                fontWeight: FontWeight.w700,
                color: Theme.of(context)
                    .appBarTheme
                    .titleTextStyle
                    ?.color,
              ),
            ),
          ),
        ),
      ),
      body: _isLoading
          ? Center(
              child: CircularProgressIndicator(
                color: AppColor.primaryColorLightMode,
              ),
            )
          : RefreshIndicator(
              onRefresh: _loadData,
              color: AppColor.primaryColorLightMode,
              child: SingleChildScrollView(
                physics: const AlwaysScrollableScrollPhysics(),
                child: Padding(
                  padding: const EdgeInsets.all(AppSize.height20),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Display principal
                      _buildMainDisplay(),
                      const SizedBox(height: AppSize.height24),
                      // Siguiente estilista disponible
                      _buildNextAvailableCard(),
                      const SizedBox(height: AppSize.height24),
                      // Cola por servicio
                      _buildQueueByService(),
                    ],
                  ),
                ),
              ),
            ),
    );
  }

  Widget _buildMainDisplay() {
    final pending = _smartQueueData?['pending_appointments'] ?? {};
    final hasPending = pending['has_pending'] ?? false;
    final position = pending['position'];
    final isNext = pending['is_next'] ?? false;
    final totalInQueue = pending['total_in_queue'] ?? 0;
    final message = pending['message'] ?? '';

    return AnimatedBuilder(
      animation: _pulseAnimation,
      builder: (context, child) {
        return Transform.scale(
          scale: isNext ? _pulseAnimation.value : 1.0,
          child: Container(
            padding: const EdgeInsets.all(AppSize.height24),
            decoration: BoxDecoration(
              color: AppColor.primaryColorLightMode,
              borderRadius: BorderRadius.circular(AppSize.height12),
            ),
            child: Column(
              children: [
                Row(
                  children: [
                    Icon(
                      isNext ? Icons.check_circle : Icons.queue,
                      color: AppColor.whiteColor,
                      size: AppSize.height24,
                    ),
                    const SizedBox(width: AppSize.height12),
                    Text(
                      'Tu Turno',
                      style: TextStyle(
                        fontFamily: FontFamily.mulishBold,
                        fontSize: AppSize.height18,
                        color: AppColor.whiteColor,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: AppSize.height24),
                if (hasPending) ...[
                  if (isNext) ...[
                    // Eres el próximo
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: AppSize.height24,
                        vertical: AppSize.height20,
                      ),
                      decoration: BoxDecoration(
                        color: AppColor.whiteColor.withOpacity(0.2),
                        borderRadius: BorderRadius.circular(AppSize.height12),
                      ),
                      child: Column(
                        children: [
                          Icon(
                            Icons.arrow_upward,
                            color: Colors.green.shade300,
                            size: AppSize.height48,
                          ),
                          const SizedBox(height: AppSize.height12),
                          Text(
                            '¡Eres el próximo!',
                            style: TextStyle(
                              fontFamily: FontFamily.mulishBold,
                              fontSize: AppSize.height22,
                              color: AppColor.whiteColor,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ] else ...[
                    // Mostrar posición
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: AppSize.height32,
                        vertical: AppSize.height24,
                      ),
                      decoration: BoxDecoration(
                        color: AppColor.whiteColor.withOpacity(0.2),
                        borderRadius: BorderRadius.circular(AppSize.height12),
                      ),
                      child: Column(
                        children: [
                          Text(
                            'Posición',
                            style: TextStyle(
                              fontFamily: FontFamily.mulishMedium,
                              fontSize: AppSize.height14,
                              color: AppColor.whiteColor.withOpacity(0.9),
                            ),
                          ),
                          const SizedBox(height: AppSize.height8),
                          Text(
                            position.toString(),
                            style: TextStyle(
                              fontFamily: FontFamily.mulishBold,
                              fontSize: AppSize.height64,
                              color: AppColor.whiteColor,
                              fontWeight: FontWeight.w900,
                            ),
                          ),
                          const SizedBox(height: AppSize.height8),
                          Text(
                            'de $totalInQueue',
                            style: TextStyle(
                              fontFamily: FontFamily.mulishMedium,
                              fontSize: AppSize.height16,
                              color: AppColor.whiteColor.withOpacity(0.9),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ] else ...[
                  // No hay citas pendientes
                  Container(
                    padding: const EdgeInsets.all(AppSize.height24),
                    decoration: BoxDecoration(
                      color: AppColor.whiteColor.withOpacity(0.2),
                      borderRadius: BorderRadius.circular(AppSize.height12),
                    ),
                    child: Column(
                      children: [
                        Icon(
                          Icons.event_available,
                          color: AppColor.whiteColor.withOpacity(0.8),
                          size: AppSize.height48,
                        ),
                        const SizedBox(height: AppSize.height12),
                        Text(
                          'Sin citas pendientes',
                          style: TextStyle(
                            fontFamily: FontFamily.mulishBold,
                            fontSize: AppSize.height18,
                            color: AppColor.whiteColor,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
                const SizedBox(height: AppSize.height16),
                Text(
                  message,
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontFamily: FontFamily.mulishMedium,
                    fontSize: AppSize.height14,
                    color: AppColor.whiteColor.withOpacity(0.9),
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildNextAvailableCard() {
    final nextAvailable = _smartQueueData?['next_available_stylist'];
    final isMe = nextAvailable?['is_me'] ?? false;

    if (nextAvailable == null) {
      return const SizedBox.shrink();
    }

    return Container(
      padding: const EdgeInsets.all(AppSize.height20),
      decoration: BoxDecoration(
        color: Theme.of(context).cardColor,
        borderRadius: BorderRadius.circular(AppSize.height12),
        border: Border.all(
          color: Theme.of(context).cardTheme.shadowColor!,
        ),
        boxShadow: [
          BoxShadow(
            color: Theme.of(context).cardTheme.shadowColor!,
            spreadRadius: AppSize.height0,
            blurRadius: AppSize.height18,
            offset: const Offset(
              AppSize.height0,
              AppSize.height4,
            ),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(
                Icons.person_outline,
                color: Theme.of(context).appBarTheme.titleTextStyle?.color,
                size: AppSize.height24,
              ),
              const SizedBox(width: AppSize.height12),
              Text(
                'Siguiente Estilista Disponible',
                style: TextStyle(
                  fontFamily: FontFamily.mulishBold,
                  fontSize: AppSize.height18,
                  color: Theme.of(context).appBarTheme.titleTextStyle?.color,
                ),
              ),
            ],
          ),
          const SizedBox(height: AppSize.height16),
          Container(
            padding: const EdgeInsets.all(AppSize.height16),
            decoration: BoxDecoration(
              color: isMe
                  ? AppColor.primaryColorLightMode.withOpacity(0.1)
                  : Theme.of(context).cardTheme.shadowColor!.withOpacity(0.05),
              borderRadius: BorderRadius.circular(AppSize.height12),
              border: Border.all(
                color: isMe
                    ? AppColor.primaryColorLightMode
                    : Theme.of(context).cardTheme.shadowColor!,
              ),
            ),
            child: Row(
              children: [
                Container(
                  width: AppSize.height48,
                  height: AppSize.height48,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: isMe
                        ? AppColor.primaryColorLightMode
                        : Theme.of(context).cardTheme.shadowColor!,
                  ),
                  child: Center(
                    child: Text(
                      nextAvailable['name']?.toString().substring(0, 1).toUpperCase() ?? '?',
                      style: TextStyle(
                        fontFamily: FontFamily.mulishBold,
                        fontSize: AppSize.height20,
                        color: isMe
                            ? AppColor.whiteColor
                            : Theme.of(context).appBarTheme.titleTextStyle?.color,
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: AppSize.height12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Expanded(
                            child: Text(
                              nextAvailable['name'] ?? 'Desconocido',
                              style: TextStyle(
                                fontFamily: FontFamily.mulishBold,
                                fontSize: AppSize.height16,
                                color: Theme.of(context).appBarTheme.titleTextStyle?.color,
                              ),
                            ),
                          ),
                          if (isMe)
                            Container(
                              padding: const EdgeInsets.symmetric(
                                horizontal: AppSize.height8,
                                vertical: AppSize.height4,
                              ),
                              decoration: BoxDecoration(
                                color: AppColor.primaryColorLightMode,
                                borderRadius: BorderRadius.circular(AppSize.height4),
                              ),
                              child: Text(
                                'TÚ',
                                style: TextStyle(
                                  fontFamily: FontFamily.mulishBold,
                                  fontSize: AppSize.height10,
                                  color: AppColor.whiteColor,
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
          ),
        ],
      ),
    );
  }

  Widget _buildQueueByService() {
    final queueByService = _smartQueueData?['queue_by_service'] ?? [];

    if (queueByService.isEmpty) {
      return const SizedBox.shrink();
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Cola por Servicio',
          style: TextStyle(
            fontFamily: FontFamily.mulishBold,
            fontSize: AppSize.height18,
            color: Theme.of(context).appBarTheme.titleTextStyle?.color,
          ),
        ),
        const SizedBox(height: AppSize.height16),
        ...queueByService.map((service) => _buildServiceQueueCard(service)).toList(),
      ],
    );
  }

  Widget _buildServiceQueueCard(Map<String, dynamic> service) {
    final serviceName = service['service_name'] ?? 'Servicio';
    final myPosition = service['my_position'];
    final queue = service['queue'] ?? [];

    return Container(
      margin: const EdgeInsets.only(bottom: AppSize.height16),
      padding: const EdgeInsets.all(AppSize.height20),
      decoration: BoxDecoration(
        color: Theme.of(context).cardColor,
        borderRadius: BorderRadius.circular(AppSize.height12),
        border: Border.all(
          color: Theme.of(context).cardTheme.shadowColor!,
        ),
        boxShadow: [
          BoxShadow(
            color: Theme.of(context).cardTheme.shadowColor!,
            spreadRadius: AppSize.height0,
            blurRadius: AppSize.height18,
            offset: const Offset(
              AppSize.height0,
              AppSize.height4,
            ),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Expanded(
                child: Text(
                  serviceName,
                  style: TextStyle(
                    fontFamily: FontFamily.mulishBold,
                    fontSize: AppSize.height16,
                    color: Theme.of(context).appBarTheme.titleTextStyle?.color,
                  ),
                ),
              ),
              if (myPosition != null)
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: AppSize.height12,
                    vertical: AppSize.height6,
                  ),
                  decoration: BoxDecoration(
                    color: AppColor.primaryColorLightMode,
                    borderRadius: BorderRadius.circular(AppSize.height12),
                  ),
                  child: Text(
                    'Posición $myPosition',
                    style: TextStyle(
                      fontFamily: FontFamily.mulishBold,
                      fontSize: AppSize.height12,
                      color: AppColor.whiteColor,
                    ),
                  ),
                ),
            ],
          ),
          const SizedBox(height: AppSize.height12),
          if (queue.isEmpty)
            Text(
              'No hay estilistas asignados',
              style: TextStyle(
                fontFamily: FontFamily.mulishMedium,
                fontSize: AppSize.height14,
                color: Theme.of(context).textTheme.titleMedium?.color,
              ),
            )
          else
            ...queue.take(5).map((stylist) => _buildStylistQueueItem(stylist)).toList(),
          if (queue.length > 5)
            Padding(
              padding: const EdgeInsets.only(top: AppSize.height8),
              child: Text(
                '... y ${queue.length - 5} más',
                style: TextStyle(
                  fontFamily: FontFamily.mulishMedium,
                  fontSize: AppSize.height12,
                  color: Theme.of(context).textTheme.titleMedium?.color,
                ),
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildStylistQueueItem(Map<String, dynamic> stylist) {
    final isMe = stylist['is_me'] ?? false;
    final position = stylist['position'] ?? 0;
    final name = stylist['stylist_name'] ?? 'Desconocido';
    final totalCompleted = stylist['total_completed'] ?? 0;

    return Container(
      margin: const EdgeInsets.only(bottom: AppSize.height8),
      padding: const EdgeInsets.all(AppSize.height12),
      decoration: BoxDecoration(
        color: isMe
            ? AppColor.primaryColorLightMode.withOpacity(0.1)
            : Theme.of(context).cardTheme.shadowColor!.withOpacity(0.05),
        borderRadius: BorderRadius.circular(AppSize.height8),
        border: Border.all(
          color: isMe
              ? AppColor.primaryColorLightMode
              : Theme.of(context).cardTheme.shadowColor!,
        ),
      ),
      child: Row(
        children: [
          Container(
            width: AppSize.height32,
            height: AppSize.height32,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: isMe
                  ? AppColor.primaryColorLightMode
                  : Theme.of(context).cardTheme.shadowColor!,
            ),
            child: Center(
              child: Text(
                '$position',
                style: TextStyle(
                  fontFamily: FontFamily.mulishBold,
                  fontSize: AppSize.height14,
                  color: isMe
                      ? AppColor.whiteColor
                      : Theme.of(context).appBarTheme.titleTextStyle?.color,
                ),
              ),
            ),
          ),
          const SizedBox(width: AppSize.height12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Expanded(
                      child: Text(
                        name,
                        style: TextStyle(
                          fontFamily: FontFamily.mulishSemiBold,
                          fontSize: AppSize.height14,
                          color: Theme.of(context).appBarTheme.titleTextStyle?.color,
                        ),
                      ),
                    ),
                    if (isMe)
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: AppSize.height6,
                          vertical: AppSize.height2,
                        ),
                        decoration: BoxDecoration(
                          color: AppColor.primaryColorLightMode,
                          borderRadius: BorderRadius.circular(AppSize.height4),
                        ),
                        child: Text(
                          'TÚ',
                          style: TextStyle(
                            fontFamily: FontFamily.mulishBold,
                            fontSize: AppSize.height10,
                            color: AppColor.whiteColor,
                          ),
                        ),
                      ),
                  ],
                ),
                if (totalCompleted > 0)
                  Text(
                    '$totalCompleted servicios completados',
                    style: TextStyle(
                      fontFamily: FontFamily.mulishLight,
                      fontSize: AppSize.height12,
                      color: Theme.of(context).textTheme.titleMedium?.color,
                    ),
                  ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
