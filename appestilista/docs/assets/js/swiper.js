const initSwiper = () => {
  if (document.querySelector(".demo-slider")) {
    var swiper = new Swiper(".demo-slider", {
      slidesPerView: 7,
      spaceBetween: 3,
      centeredSlides: true,
      loop: true,
      direction: "horizontal",

      autoplay: 2500,
      breakpoints: {
        0: {
          slidesPerView: 1,
          spaceBetween: 20,
        },
        640: {
          slidesPerView: 2,
          spaceBetween: 20,
        },
        768: {
          slidesPerView: 3,
          spaceBetween: 20,
        },
        1024: {
          slidesPerView: 4,
          spaceBetween: 20,
        },
        1400: {
          slidesPerView: 6,
          spaceBetween: 20,
        },
      },
      // pagination: {
      //   el: ".swiper-pagination",
      //   clickable: true,
      // },
    });

    console.log(swiper);

    start(swiper);
  }
};

const start = (swiper) => {
  swiper.slideNext(1500);
  setTimeout(function () {
    start(swiper);
  }, 3000);
};

initSwiper();
