import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:home_helper_flutter_ui_kit/config/app_color.dart';
import 'package:home_helper_flutter_ui_kit/config/app_image.dart';
import 'package:home_helper_flutter_ui_kit/config/app_icons.dart';
import 'package:home_helper_flutter_ui_kit/config/app_size.dart';
import 'package:home_helper_flutter_ui_kit/config/font_family.dart';
import 'package:home_helper_flutter_ui_kit/services/api_service.dart';
import 'package:home_helper_flutter_ui_kit/services/location_service.dart';
import 'package:home_helper_flutter_ui_kit/view/bookings_screen/haircut_for_men_screen.dart';
import 'package:intl/intl.dart';
import '../../model/carousel_slider_model.dart';
import '../../controller/home_screen_controller.dart';

class StylistHomeScreen extends StatefulWidget {
  const StylistHomeScreen({Key? key}) : super(key: key);

  @override
  State<StylistHomeScreen> createState() => _StylistHomeScreenState();
}

class _StylistHomeScreenState extends State<StylistHomeScreen> {
  Map<String, dynamic>? _stats;
  List<dynamic> _pendingBookings = [];
  List<dynamic> _allBookings = [];
  Map<String, dynamic>? _queuePosition;
  bool _isLoading = true;
  bool _isInsideGeofence = false;
  final PageController _pageController = PageController();
  final HomeScreenController _homeController = Get.put(HomeScreenController());
  DateTime _selectedDate = DateTime.now();

  @override
  void initState() {
    super.initState();
    _loadData();
    _initializeLocation();
  }

  @override
  void dispose() {
    _pageController.dispose();
    super.dispose();
  }

  Future<void> _loadData() async {
    setState(() => _isLoading = true);
    try {
      final stats = await ApiService.getDashboardStats();
      final bookings = await ApiService.getPendingBookings();
      
      // Formatear fecha como YYYY-MM-DD para el backend
      final dateString = DateFormat('yyyy-MM-dd').format(_selectedDate);
      final allBookings = await ApiService.getAllBookings(date: dateString);
      
      final queuePos = await ApiService.getQueuePosition();
      setState(() {
        _stats = stats;
        _pendingBookings = bookings;
        _allBookings = allBookings;
        _queuePosition = queuePos;
        _isLoading = false;
      });
    } catch (e) {
      setState(() => _isLoading = false);
      Get.snackbar('Error', 'Error al cargar datos: ${e.toString()}');
    }
  }

  Future<void> _selectDate() async {
    final DateTime? picked = await showDatePicker(
      context: context,
      initialDate: _selectedDate,
      firstDate: DateTime.now(), // Solo permitir seleccionar desde hoy
      lastDate: DateTime.now().add(const Duration(days: 365)), // Hasta 1 año en el futuro
      locale: const Locale('es', 'ES'),
      helpText: 'Seleccionar fecha',
      cancelText: 'Cancelar',
      confirmText: 'Aceptar',
    );
    
    if (picked != null && picked != _selectedDate) {
      setState(() {
        _selectedDate = picked;
      });
      await _loadData(); // Recargar datos con la nueva fecha
    }
  }

  Future<void> _initializeLocation() async {
    try {
      await LocationService.initialize();
      LocationService.onGeofenceStatusChanged = (isInside) {
        setState(() => _isInsideGeofence = isInside);
      };
      LocationService.startTracking();
    } catch (e) {
      print('Error inicializando geolocalización: $e');
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Theme.of(context).primaryColor,
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _loadData,
              child: SingleChildScrollView(
                physics: const AlwaysScrollableScrollPhysics(),
                child: Column(
                  children: [
                    // Header con nombre de peluquería y estado
                    _buildHeader(),
                    const SizedBox(height: AppSize.height24),
                    // Slider/Carousel
                    _buildSlider(),
                    const SizedBox(height: AppSize.height8),
                    _buildSliderDots(),
                    const SizedBox(height: AppSize.height24),
                    // Card de ganancias
                    _buildEarningsCard(),
                    const SizedBox(height: AppSize.height24),
                    // Lista de todas las citas (MyBookings)
                    _buildAllBookingsList(),
                    const SizedBox(height: AppSize.height24),
                    // Lista de bookings pendientes (diseño igual a bookings_screen)
                    _buildBookingsList(),
                  ],
                ),
              ),
            ),
    );
  }

  Widget _buildHeader() {
    final tenantName = _stats?['tenant_name'] ?? 'Peluquería';
    final queueMessage = _queuePosition?['message'] ?? '';
    
    return Container(
      padding: const EdgeInsets.all(AppSize.height20),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  tenantName,
                  style: TextStyle(
                    fontFamily: FontFamily.mulishExtraBold,
                    fontWeight: FontWeight.w800,
                    fontSize: AppSize.height22,
                    color: Theme.of(context).appBarTheme.titleTextStyle?.color,
                  ),
                ),
                const SizedBox(height: AppSize.height4),
                Row(
                  children: [
                    Container(
                      width: 8,
                      height: 8,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: _isInsideGeofence ? Colors.green : Colors.red,
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        _isInsideGeofence 
                            ? 'Estás activo en fichero digital' 
                            : 'Fuera de la peluquería',
                        style: TextStyle(
                          fontFamily: FontFamily.mulishMedium,
                          fontSize: AppSize.height12,
                          color: Theme.of(context).textTheme.titleMedium?.color,
                        ),
                      ),
                    ),
                  ],
                ),
                if (_isInsideGeofence && queueMessage.isNotEmpty) ...[
                  const SizedBox(height: AppSize.height4),
                  Text(
                    queueMessage,
                    style: TextStyle(
                      fontFamily: FontFamily.mulishSemiBold,
                      fontSize: AppSize.height12,
                      color: AppColor.primaryColorLightMode,
                    ),
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSlider() {
    return SizedBox(
      height: AppSize.height200,
      child: PageView.builder(
        controller: _pageController,
        allowImplicitScrolling: true,
        onPageChanged: (value) {
          _homeController.pageViewIndex.value = value;
        },
        itemCount: carouselSliderList.length,
        scrollDirection: Axis.horizontal,
        itemBuilder: (BuildContext context, int index) {
          return Container(
            width: Get.width,
            margin: const EdgeInsets.symmetric(horizontal: 20),
            decoration: BoxDecoration(
              color: Theme.of(context).primaryColor,
            ),
            child: Image.asset(
              carouselSliderList[index].image ?? "",
              height: AppSize.height164,
              width: AppSize.width350,
              fit: BoxFit.fill,
            ),
          );
        },
      ),
    );
  }

  Widget _buildSliderDots() {
    return Obx(
      () => Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: List.generate(
          carouselSliderList.length,
          (int index) => AnimatedContainer(
            duration: const Duration(milliseconds: 300),
            margin: const EdgeInsets.only(right: AppSize.height3),
            height: AppSize.height2,
            width: AppSize.height224,
            decoration: BoxDecoration(
              color: _homeController.pageViewIndex.value == index
                  ? AppColor.primaryColors
                  : AppColor.indicatorColor,
              borderRadius: BorderRadius.circular(AppSize.height11),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildEarningsCard() {
    final servicesToday = _stats?['services_today'] ?? 0;
    final earningsToday = _stats?['earnings_today'] ?? 0.0;

    return Container(
      margin: const EdgeInsets.symmetric(horizontal: AppSize.height20),
      padding: const EdgeInsets.all(AppSize.height20),
      decoration: BoxDecoration(
        color: AppColor.primaryColorLightMode,
        borderRadius: BorderRadius.circular(AppSize.height12),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Hoy',
            style: TextStyle(
              fontFamily: FontFamily.mulishBold,
              fontSize: AppSize.height18,
              color: AppColor.whiteColor,
            ),
          ),
          const SizedBox(height: AppSize.height16),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Servicios',
                    style: TextStyle(
                      fontFamily: FontFamily.mulishMedium,
                      fontSize: AppSize.height14,
                      color: AppColor.whiteColor.withOpacity(0.8),
                    ),
                  ),
                  const SizedBox(height: AppSize.height4),
                  Text(
                    '$servicesToday',
                    style: TextStyle(
                      fontFamily: FontFamily.mulishBold,
                      fontSize: AppSize.height24,
                      color: AppColor.whiteColor,
                    ),
                  ),
                ],
              ),
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Text(
                    'Ganancias',
                    style: TextStyle(
                      fontFamily: FontFamily.mulishMedium,
                      fontSize: AppSize.height14,
                      color: AppColor.whiteColor.withOpacity(0.8),
                    ),
                  ),
                  const SizedBox(height: AppSize.height4),
                  Text(
                    '\$${earningsToday.toStringAsFixed(2)}',
                    style: TextStyle(
                      fontFamily: FontFamily.mulishBold,
                      fontSize: AppSize.height24,
                      color: AppColor.whiteColor,
                    ),
                  ),
                ],
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildAllBookingsList() {
    if (_allBookings.isEmpty) {
      return Padding(
        padding: const EdgeInsets.symmetric(horizontal: AppSize.height20),
        child: Center(
          child: Text(
            'No hay citas',
            style: TextStyle(
              fontFamily: FontFamily.mulishMedium,
              fontSize: AppSize.height16,
              color: Theme.of(context).textTheme.titleMedium?.color,
            ),
          ),
        ),
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: AppSize.height20),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'Mis Citas',
                style: TextStyle(
                  fontFamily: FontFamily.mulishBold,
                  fontSize: AppSize.height18,
                  color: Theme.of(context).appBarTheme.titleTextStyle?.color,
                ),
              ),
              GestureDetector(
                onTap: _selectDate,
                child: Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: AppSize.height12,
                    vertical: AppSize.height8,
                  ),
                  decoration: BoxDecoration(
                    color: AppColor.primaryColorLightMode.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(AppSize.height8),
                    border: Border.all(
                      color: AppColor.primaryColorLightMode,
                      width: 1,
                    ),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(
                        Icons.calendar_today,
                        size: AppSize.height16,
                        color: AppColor.primaryColorLightMode,
                      ),
                      const SizedBox(width: AppSize.height8),
                      Text(
                        DateFormat('dd MMM yyyy', 'es').format(_selectedDate),
                        style: TextStyle(
                          fontFamily: FontFamily.mulishSemiBold,
                          fontSize: AppSize.height14,
                          color: AppColor.primaryColorLightMode,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: AppSize.height16),
        ListView.builder(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          itemCount: _allBookings.length,
          itemBuilder: (context, index) {
            final booking = _allBookings[index];
            return _buildAllBookingCard(booking, index);
          },
        ),
      ],
    );
  }

  Widget _buildAllBookingCard(Map<String, dynamic> booking, int index) {
    final startTime = DateTime.parse(booking['start_time']);
    final formattedDate = DateFormat('dd MMM yyyy', 'es').format(startTime);
    final formattedTime = DateFormat('HH:mm').format(startTime);
    final clientName = booking['client_name'] ?? 'Cliente';
    final serviceName = booking['service_name'] ?? 'Servicio';
    final status = booking['status'] ?? '';

    // Usar imagen por defecto
    final serviceImage = AppImage.haircutImage;

    // Color según el estado
    Color statusColor = AppColor.primaryColorLightMode;
    String statusText = status;
    if (status == 'completed' || status == 'checked_out') {
      statusColor = Colors.green;
      statusText = 'Completada';
    } else if (status == 'pending_approval') {
      statusColor = Colors.orange;
      statusText = 'Pendiente';
    } else if (status == 'scheduled') {
      statusColor = Colors.blue;
      statusText = 'Programada';
    } else if (status == 'cancelled') {
      statusColor = Colors.red;
      statusText = 'Cancelada';
    }

    return GestureDetector(
      onTap: () {
        // Navegar a HaircutForMenScreen
        Get.to(() => HaircutForMenScreen(0));
      },
      child: Container(
        width: Get.width,
        padding: const EdgeInsets.all(AppSize.height12),
        margin: const EdgeInsets.only(
          bottom: AppSize.height18,
          left: AppSize.height20,
          right: AppSize.height20,
        ),
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
        child: Row(
          mainAxisAlignment: MainAxisAlignment.start,
          children: [
            ClipRRect(
              borderRadius: BorderRadius.circular(6),
              child: Image.asset(
                serviceImage,
                fit: BoxFit.fill,
                height: AppSize.height80,
                width: AppSize.height80,
              ),
            ),
            const SizedBox(width: AppSize.height14),
            Expanded(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.start,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    clientName,
                    style: TextStyle(
                      color: Theme.of(context)
                          .appBarTheme
                          .titleTextStyle
                          ?.color,
                      fontFamily: FontFamily.mulishSemiBold,
                      fontWeight: FontWeight.w600,
                      fontSize: AppSize.height16,
                    ),
                  ),
                  const SizedBox(height: AppSize.height6),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.start,
                    children: [
                      Image.asset(
                        AppImage.starIcon,
                        height: AppSize.height12,
                        width: AppSize.height12,
                        color: Theme.of(context)
                            .appBarTheme
                            .titleTextStyle
                            ?.color,
                      ),
                      const SizedBox(width: AppSize.height2),
                      Text(
                        "4.5",
                        style: TextStyle(
                          color: Theme.of(context)
                              .appBarTheme
                              .titleTextStyle
                              ?.color,
                          fontFamily: FontFamily.mulishSemiBold,
                          fontWeight: FontWeight.w600,
                          fontSize: AppSize.height14,
                        ),
                      ),
                      const SizedBox(width: AppSize.height6),
                      Expanded(
                        child: Text(
                          serviceName,
                          style: TextStyle(
                            color: Theme.of(context)
                                .textTheme
                                .titleMedium
                                ?.color,
                            overflow: TextOverflow.ellipsis,
                            fontFamily: FontFamily.mulishLight,
                            fontWeight: FontWeight.w400,
                            fontSize: AppSize.height12,
                          ),
                        ),
                      ),
                      Padding(
                        padding: const EdgeInsets.only(
                          top: AppSize.height8,
                          right: AppSize.height8,
                        ),
                        child: Align(
                          alignment: Alignment.centerRight,
                          child: Image.asset(
                            AppIcons.arrowRightIcon,
                            height: AppSize.height17,
                            width: AppSize.height17,
                            color: Theme.of(context)
                                .appBarTheme
                                .titleTextStyle
                                ?.color,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: AppSize.height8),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        '$formattedDate $formattedTime',
                        style: TextStyle(
                          color: Theme.of(context)
                              .textTheme
                              .titleMedium
                              ?.color,
                          fontFamily: FontFamily.mulishMedium,
                          fontSize: AppSize.height12,
                        ),
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: AppSize.height8,
                          vertical: AppSize.height4,
                        ),
                        decoration: BoxDecoration(
                          color: statusColor.withOpacity(0.1),
                          borderRadius: BorderRadius.circular(AppSize.height4),
                          border: Border.all(color: statusColor, width: 1),
                        ),
                        child: Text(
                          statusText,
                          style: TextStyle(
                            color: statusColor,
                            fontFamily: FontFamily.mulishSemiBold,
                            fontSize: AppSize.height10,
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
    );
  }

  Widget _buildBookingsList() {
    if (_pendingBookings.isEmpty) {
      return Padding(
        padding: const EdgeInsets.all(AppSize.height20),
        child: Center(
          child: Text(
            'No hay citas pendientes',
            style: TextStyle(
              fontFamily: FontFamily.mulishMedium,
              fontSize: AppSize.height16,
              color: Theme.of(context).textTheme.titleMedium?.color,
            ),
          ),
        ),
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: AppSize.height20),
          child: Text(
            'Citas Pendientes',
            style: TextStyle(
              fontFamily: FontFamily.mulishBold,
              fontSize: AppSize.height18,
              color: Theme.of(context).appBarTheme.titleTextStyle?.color,
            ),
          ),
        ),
        const SizedBox(height: AppSize.height16),
        ListView.builder(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          itemCount: _pendingBookings.length,
          itemBuilder: (context, index) {
            final booking = _pendingBookings[index];
            return _buildBookingCard(booking, index);
          },
        ),
      ],
    );
  }

  Widget _buildBookingCard(Map<String, dynamic> booking, int index) {
    final startTime = DateTime.parse(booking['start_time']);
    final formattedDate = DateFormat('dd MMM yyyy', 'es').format(startTime);
    final formattedTime = DateFormat('HH:mm').format(startTime);
    final clientName = booking['client_name'] ?? 'Cliente';
    final serviceName = booking['service_name'] ?? 'Servicio';
    final servicePrice = booking['service_price'] ?? 0.0;

    // Usar imagen por defecto si no hay imagen del servicio
    final serviceImage = AppImage.haircutImage; // Imagen por defecto

    return GestureDetector(
      onTap: () {
        // Navegar a HaircutForMenScreen pasando el booking
        Get.to(() => HaircutForMenScreen(0));
      },
      child: Container(
        width: Get.width,
        padding: const EdgeInsets.all(AppSize.height12),
        margin: const EdgeInsets.only(
          bottom: AppSize.height18,
          left: AppSize.height20,
          right: AppSize.height20,
        ),
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
        child: Row(
          mainAxisAlignment: MainAxisAlignment.start,
          children: [
            ClipRRect(
              borderRadius: BorderRadius.circular(6),
              child: Image.asset(
                serviceImage,
                fit: BoxFit.fill,
                height: AppSize.height80,
                width: AppSize.height80,
              ),
            ),
            const SizedBox(width: AppSize.height14),
            Expanded(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.start,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    clientName,
                    style: TextStyle(
                      color: Theme.of(context)
                          .appBarTheme
                          .titleTextStyle
                          ?.color,
                      fontFamily: FontFamily.mulishSemiBold,
                      fontWeight: FontWeight.w600,
                      fontSize: AppSize.height16,
                    ),
                  ),
                  const SizedBox(height: AppSize.height6),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.start,
                    children: [
                      Image.asset(
                        AppImage.starIcon,
                        height: AppSize.height12,
                        width: AppSize.height12,
                        color: Theme.of(context)
                            .appBarTheme
                            .titleTextStyle
                            ?.color,
                      ),
                      const SizedBox(width: AppSize.height2),
                      Text(
                        "4.5",
                        style: TextStyle(
                          color: Theme.of(context)
                              .appBarTheme
                              .titleTextStyle
                              ?.color,
                          fontFamily: FontFamily.mulishSemiBold,
                          fontWeight: FontWeight.w600,
                          fontSize: AppSize.height14,
                        ),
                      ),
                      const SizedBox(width: AppSize.height6),
                      Expanded(
                        child: Text(
                          serviceName,
                          style: TextStyle(
                            color: Theme.of(context)
                                .textTheme
                                .titleMedium
                                ?.color,
                            overflow: TextOverflow.ellipsis,
                            fontFamily: FontFamily.mulishLight,
                            fontWeight: FontWeight.w400,
                            fontSize: AppSize.height12,
                          ),
                        ),
                      ),
                      Padding(
                        padding: const EdgeInsets.only(
                          top: AppSize.height8,
                          right: AppSize.height8,
                        ),
                        child: Align(
                          alignment: Alignment.centerRight,
                          child: Image.asset(
                            AppIcons.arrowRightIcon,
                            height: AppSize.height17,
                            width: AppSize.height17,
                            color: Theme.of(context)
                                .appBarTheme
                                .titleTextStyle
                                ?.color,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: AppSize.height8),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        '$formattedDate $formattedTime',
                        style: TextStyle(
                          color: Theme.of(context)
                              .textTheme
                              .titleMedium
                              ?.color,
                          fontFamily: FontFamily.mulishMedium,
                          fontSize: AppSize.height12,
                        ),
                      ),
                      Text(
                        '\$${servicePrice.toStringAsFixed(2)}',
                        style: TextStyle(
                          color: AppColor.primaryColorLightMode,
                          fontFamily: FontFamily.mulishBold,
                          fontSize: AppSize.height14,
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
    );
  }
}
