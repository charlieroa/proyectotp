
import 'package:flutter/material.dart';
import 'package:get/get.dart';
import '../../config/app_image.dart';
import '../../config/app_size.dart';
import '../../config/app_string.dart';
import '../../config/font_family.dart';
import '../../controller/my_review_and_rating_controller.dart';
import '../../custom_widget/common_divider.dart';

class ReviewRatingsScreen extends StatelessWidget {
   ReviewRatingsScreen({Key? key}) : super(key: key);

 final MyReviewAndRatingController myReviewAndRatingController = Get.put(MyReviewAndRatingController());



  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Theme.of(context).primaryColor,
      resizeToAvoidBottomInset: true,
      appBar: PreferredSize(
        preferredSize: const Size.fromHeight(kToolbarHeight),
        child: Container(
          decoration: BoxDecoration(
            boxShadow: [
              BoxShadow(
                color: Theme.of(context).appBarTheme.shadowColor!,
                spreadRadius: AppSize.height0,
                blurRadius: AppSize.height7,
                offset: const Offset(
                    AppSize.height0, AppSize.height4),
              ),
            ],
          ),
          child: AppBar(

              shadowColor: Theme.of(context).appBarTheme.shadowColor,
              backgroundColor:Theme.of(context).appBarTheme.backgroundColor,
              centerTitle: false,
              automaticallyImplyLeading: false,
              title: Row(
                children: [
                  GestureDetector(
                    onTap: () {
                      Get.back();
                    },
                    child: Image.asset(
                      AppImage.arrowLeft,
                      width: AppSize.width24,
                      height: AppSize.height24,color: Theme.of(context).appBarTheme.titleTextStyle?.color,
                    ),
                  ),
                  const SizedBox(width: AppSize.height8),
                   Text(
                    AppString.myReviewAndRatings,
                    style: TextStyle(
                        fontFamily: FontFamily.mulishBold,
                        fontSize: AppSize.height18,
                        fontStyle: FontStyle.normal,
                        fontWeight: FontWeight.w700,
                        color: Theme.of(context).appBarTheme.titleTextStyle?.color,
                  ),)
                ],
              )),
        ),
      ),
      body: SingleChildScrollView(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.start,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const SizedBox(height: AppSize.height20),
            ListView.builder(
              itemCount: myReviewAndRatingController.myReviewAndRatingList.length,
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                itemBuilder: (BuildContext context,int index){
                var mData = myReviewAndRatingController.myReviewAndRatingList[index];
                return Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children:[
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: AppSize.height20),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.start,
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children:[
                          ClipRRect(
                            borderRadius: BorderRadius.circular(40),
                            child:  Image.asset(mData.image.toString(),
                                height: AppSize.height40,width: AppSize.height40,fit: BoxFit.cover),
                          ),
                            Expanded(
                            child: Padding(
                              padding: const EdgeInsets.only(right: AppSize.height12,left: AppSize.height12),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(mData.name.toString(),
                                      style:  TextStyle(
                                          color: Theme.of(context).appBarTheme.titleTextStyle?.color,
                                          fontFamily: FontFamily.mulishMedium,
                                          fontWeight: FontWeight.w600,
                                          fontSize: AppSize.height16)),
                                  const SizedBox(height: AppSize.height2),
                                   Text(AppString.jan2022,
                                      style: TextStyle(
                                          color: Theme.of(context).textTheme.titleMedium?.color,
                                          fontFamily: FontFamily.mulishMedium,
                                          fontWeight: FontWeight.w500,
                                          fontSize: AppSize.height14)),
                                ],
                              ),
                            ),
                          ),
                          Padding(
                            padding: const EdgeInsets.only(top: AppSize.height12),
                            child: Row(
                              mainAxisAlignment: MainAxisAlignment.end,
                              children:[
                                Image.asset(AppImage.starIcon,height: AppSize.height12,width: AppSize.height12,color: Theme.of(context).appBarTheme.titleTextStyle?.color,),
                                const SizedBox(width: AppSize.height2),
                                 Text(mData.rating.toString(),
                                    style:  TextStyle(
                                        color: Theme.of(context).appBarTheme.titleTextStyle?.color,
                                        fontFamily: FontFamily.mulishSemiBold,
                                        fontWeight: FontWeight.w600,
                                        fontSize: AppSize.height14)),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 10),
                     Padding(
                      padding: const EdgeInsets.symmetric(horizontal: AppSize.height20),
                      child: Text(mData.description.toString(),
                          style:  TextStyle(
                              color:Theme.of(context).textTheme.titleMedium?.color,
                              fontFamily: FontFamily.mulishRegular,
                              fontWeight: FontWeight.w400,
                              fontSize: AppSize.height14)),
                    ),
                    const SizedBox(height: AppSize.height18),
                    commonDivider(color: Theme.of(context).dividerColor),
                    const SizedBox(height: AppSize.height18),
                  ],
                );
            })


          ],
        ),
      ),
    );
  }
}
