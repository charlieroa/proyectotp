import 'package:get/get.dart';
import '../model/slot_model.dart';

class SlotController extends GetxController {
  RxInt selectedTimeIndex = 0.obs;
  List<SlotModel> timeList = [
    SlotModel(time: "10:00 AM"),
    SlotModel(time: "10:30 AM"),
    SlotModel(time: "11:00 AM"),
    SlotModel(time: "11:30 AM"),
    SlotModel(time: "12:00 PM"),
    SlotModel(time: "12:30 PM"),
    SlotModel(time: "1:00 PM"),
    SlotModel(time: "1:30 PM"),
    SlotModel(time: "2:00 PM"),
    SlotModel(time: "2:30 PM"),
    SlotModel(time: "3:00 PM"),
    SlotModel(time: "3:30 PM"),
    SlotModel(time: "4:00 PM"),
    SlotModel(time: "4:30 PM"),
    SlotModel(time: "5:00 PM"),
    SlotModel(time: "5:30 PM"),
    SlotModel(time: "6:00 PM"),
    SlotModel(time: "6:30 PM"),
    SlotModel(time: "7:00 PM"),
    SlotModel(time: "7:30 PM"),
    SlotModel(time: "8:00 PM"),
  ];
}
