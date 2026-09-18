/*----------theme js-----------------*/

/*====================================
01. Mobile Menu js
02. Header Search js
03. sticky
04. Loder 
05. counterUp
06. Hero Home one Slides
07. brand list Active
08. brand list2
09. Testi list 
10. Testi list2
11. Testi list3
12. Testi list inner
13. course program
14. Venubox
15. Team icon active js
16. menu button cart sidebar
17. Cart Plus Minus Button
18. Shipping Form Toggle
19. accordion js
20. barfiller script
21. WOW active js 
22. Sidebar
23. scroll btn
24. preloader js
25. Portfolio Isotope 
26. Custom Tab
27. count down timer
=====================================*/






(function ($) {
    'use strict';

    // Mobile Menu js
    $('.mobile-menu nav').meanmenu({
        meanScreenWidth: "991",
        meanMenuContainer: ".mobile-menu",
        meanMenuOpen: "<span></span> <span></span> <span></span>",
        onePage: false,
    });

    //Header Search js
    if($('.search-box-outer').length) {
        $('.search-box-outer').on('click', function() {
            $('body').addClass('search-active');
        });
        $('.close-search').on('click', function() {
            $('body').removeClass('search-active');
        });
    }

        // sticky
        var wind = $(window);
        var sticky = $('#sticky-header');
        wind.on('scroll', function () {
            var scroll = wind.scrollTop();
            if (scroll < 100) {
                sticky.removeClass('sticky');
            } else {
                sticky.addClass('sticky');
            }
        });

     // Loder  //
     $(function () {
        $('body').addClass('loaded');
    });

    //educate all button
    $(function() {  
        $('.educate_btn')
        .on('mouseenter', function(e) {
                var parentOffset = $(this).offset(),
                    relX = e.pageX - parentOffset.left,
                    relY = e.pageY - parentOffset.top;
                $(this).find('span').css({top:relY, left:relX})
        })
        .on('mouseout', function(e) {
                var parentOffset = $(this).offset(),
                    relX = e.pageX - parentOffset.left,
                    relY = e.pageY - parentOffset.top;
            $(this).find('span').css({top:relY, left:relX})
        });
    });

    // counterUp
    $('.counter').counterUp({
        delay: 10,
        time: 1000
    });


// :: Hero Home one Slides
if ($.fn.owlCarousel) {
    var welcomeSlider = $('.hero-slider');
    welcomeSlider.owlCarousel({
        items: 1,
        loop: true,
        autoplay: false,
        autoplayTimeout: 6000,
        dots:false,
        center: true,
        margin:0,
        nav:true,
        navText: ["<i class='flaticon flaticon-right-arrow''></i>","<i class='flaticon flaticon-left-arrow''></i>"],
        animateIn: 'fadeIn',
        animateOut: 'fadeOut'
        
    })

    welcomeSlider.on('translate.owl.carousel', function () {
        var layer = $("[data-animation]");
        layer.each(function () {
            var anim_name = $(this).data('animation');
            $(this).removeClass('animated ' + anim_name).css('opacity', '0');
        });
    });

    $("[data-delay]").each(function () {
        var anim_del = $(this).data('delay');
        $(this).css('animation-delay', anim_del);
    });

    $("[data-duration]").each(function () {
        var anim_dur = $(this).data('duration');
        $(this).css('animation-duration', anim_dur);
    });

    welcomeSlider.on('translated.owl.carousel', function () {
        var layer = welcomeSlider.find('.owl-item.active').find("[data-animation]");
        layer.each(function () {
            var anim_name = $(this).data('animation');
            $(this).addClass('animated ' + anim_name).css('opacity', '1');
        });
    });
} 

// :: Hero Home one Slides
if ($.fn.owlCarousel) {
    var welcomeSlider = $('.hero-slider5');
    welcomeSlider.owlCarousel({
        items: 1,
        loop: true,
        autoplay: false,
        autoplayTimeout: 6000,
        dots:true,
        center: true,
        margin:0,
        nav:false,
        navText: ["<i class='flaticon flaticon-right-arrow''></i>","<i class='flaticon flaticon-left-arrow''></i>"],
        animateIn: 'fadeIn',
        animateOut: 'fadeOut'
        
    })

    welcomeSlider.on('translate.owl.carousel', function () {
        var layer = $("[data-animation]");
        layer.each(function () {
            var anim_name = $(this).data('animation');
            $(this).removeClass('animated ' + anim_name).css('opacity', '0');
        });
    });

    $("[data-delay]").each(function () {
        var anim_del = $(this).data('delay');
        $(this).css('animation-delay', anim_del);
    });

    $("[data-duration]").each(function () {
        var anim_dur = $(this).data('duration');
        $(this).css('animation-duration', anim_dur);
    });

    welcomeSlider.on('translated.owl.carousel', function () {
        var layer = welcomeSlider.find('.owl-item.active').find("[data-animation]");
        layer.each(function () {
            var anim_name = $(this).data('animation');
            $(this).addClass('animated ' + anim_name).css('opacity', '1');
        });
    });
} 

    // brand list Active
    $('.brand-list').owlCarousel({
        loop: true,
        autoplay: true,
        autoplayTimeout: 10000,
        dots: false,
        margin: 30,
        nav:false,
        navText: ["<i class='flaticon flaticon-left-arrow''></i>", "<i class='flaticon flaticon-right-arrow''></i>"],
        responsive: {
            0: {
                items: 1
            },
            768: {
                items: 2
            },
            992: {
                items: 2
            },
            1000: {
                items: 3
            },
            1920: {
                items: 3
            }
        }
    })

       // brand list2
    $('.brand-list2').owlCarousel({
        loop: true,
        autoplay: true,
        autoplayTimeout: 10000,
        dots: false,
        margin: 30,
        nav:false,
        navText: ["<i class='flaticon flaticon-left-arrow''></i>", "<i class='flaticon flaticon-right-arrow''></i>"],
        responsive: {
            0: {
                items: 1
            },
            768: {
                items: 2
            },
            992: {
                items: 3
            },
            1000: {
                items: 4
            },
            1920: {
                items: 5
            }
        }
    })

    // Testi list 
    $('.testi-list').owlCarousel({
        loop: true,
        autoplay: false,
        autoplayTimeout: 10000,
        dots: true,
        margin: 30,
        nav:true,
        navText: ["<i class='flaticon flaticon-left-arrow''></i>", "<i class='flaticon flaticon-right-arrow''></i>"],
        responsive: {
            0: {
                items: 1
            },
            600: {
                items: 1
            },
            768: {
                items: 1
            },
            992: {
                items: 1
            },
            1000: {
                items: 1
            },
            1920: {
                items: 1
            }
        }
    })

    // Testi list2
    $('.testi-list2').owlCarousel({
        loop: true,
        autoplay: true,
        autoplayTimeout: 10000,
        dots: false,
        margin: 30,
        nav: false,
        navText: ["<i class='flaticon flaticon-left-arrow''></i>", "<i class='flaticon flaticon-right-arrow''></i>"],
        responsive: {
            0: {
                items: 1
            },
            600: {
                items: 1
            },
            768: {
                items: 1
            },
            992: {
                items: 1
            },
            1000: {
                items: 2
            },
            1920: {
                items: 2
            }
        }
    })


    // Testi list3
    $('.testi-list3').owlCarousel({
        loop: true,
        autoplay: true,
        autoplayTimeout: 10000,
        dots:true,
        margin: 30,
        nav: false,
        navText: ["<i class='flaticon flaticon-left-arrow''></i>", "<i class='flaticon flaticon-right-arrow''></i>"],
        responsive: {
            0: {
                items: 1
            },
            600: {
                items: 1
            },
            768: {
                items: 1
            },
            992: {
                items: 2
            },
            1000: {
                items: 2
            },
            1920: {
                items: 3
            }
        }
    })

    // Testi list4
    $('.testi-list4').owlCarousel({
        loop: true,
        autoplay: true,
        autoplayTimeout: 10000,
        dots:false,
        margin: 30,
        nav: true,
        navText: ["<i class='flaticon flaticon-left-arrow''></i>", "<i class='flaticon flaticon-right-arrow''></i>"],
        responsive: {
            0: {
                items: 1
            },
            600: {
                items: 1
            },
            768: {
                items: 1
            },
            992: {
                items: 1
            },
            1000: {
                items: 1
            },
            1920: {
                items: 1
            }
        }
    })

    
    // Testi list2
    $('.testi-list5').owlCarousel({
        loop: true,
        autoplay: true,
        autoplayTimeout: 10000,
        dots:true,
        margin: 30,
        nav: false,
        navText: ["<i class='flaticon flaticon-left-arrow''></i>", "<i class='flaticon flaticon-right-arrow''></i>"],
        responsive: {
            0: {
                items: 1
            },
            600: {
                items: 1
            },
            768: {
                items: 1
            },
            992: {
                items: 2
            },
            1000: {
                items: 2
            },
            1920: {
                items: 2
            }
        }
    })

     // Testi list2
     $('.testi-list6').owlCarousel({
        loop: true,
        autoplay: true,
        autoplayTimeout: 10000,
        dots:false,
        margin: 30,
        nav: false,
        navText: ["<i class='flaticon flaticon-left-arrow''></i>", "<i class='flaticon flaticon-right-arrow''></i>"],
        responsive: {
            0: {
                items: 1
            },
            600: {
                items: 1
            },
            768: {
                items: 1
            },
            992: {
                items: 2
            },
            1000: {
                items: 2
            },
            1920: {
                items: 2
            }
        }
    })

    // Testi list inner
      $('.testi-list-inner').owlCarousel({
        loop: true,
        autoplay: true,
        autoplayTimeout: 10000,
        dots:false,
        margin: 30,
        nav:true,
        navText: ["<i class='flaticon flaticon-left-arrow''></i>", "<i class='flaticon flaticon-right-arrow''></i>"],
        responsive: {
            0: {
                items: 1
            },
            600: {
                items: 1
            },
            768: {
                items: 1
            },
            992: {
                items: 2
            },
            1000: {
                items: 2
            },
            1920: {
                items: 2
            }
        }
    })

// course program
$('.course-program').owlCarousel({
    loop: true,
    autoplay: false,
    autoplayTimeout: 10000,
    dots:false,
    margin: 30,
    nav:true,
    navText: ["<i class='flaticon flaticon-left-arrow''></i>", "<i class='flaticon flaticon-right-arrow''></i>"],
    responsive: {
        0: {
            items: 1
        },
        600: {
            items: 1
        },
        768: {
            items: 1
        },
        992: {
            items: 1
        },
        1000: {
            items: 1
        },
        1920: {
            items: 1
        }
    }
})

// course program
$('.our-course').owlCarousel({
    loop: true,
    autoplay: false,
    autoplayTimeout: 10000,
    dots:false,
    margin: 30,
    nav:true,
    navText: ["<i class='flaticon flaticon-left-arrow''></i>", "<i class='flaticon flaticon-right-arrow''></i>"],
    responsive: {
        0: {
            items: 1
        },
        600: {
            items: 1
        },
        768: {
            items: 1
        },
        992: {
            items: 2
        },
        1000: {
            items: 3
        },
        1920: {
            items: 3
        }
    }
})

// course program
$('.program-child').owlCarousel({
    loop: true,
    autoplay: false,
    autoplayTimeout: 10000,
    dots:false,
    margin: 30,
    nav:true,
    navText: ["<i class='flaticon flaticon-left-arrow''></i>", "<i class='flaticon flaticon-right-arrow''></i>"],
    responsive: {
        0: {
            items: 1
        },
        600: {
            items: 1
        },
        768: {
            items: 1
        },
        992: {
            items: 2
        },
        1000: {
            items: 3
        },
        1920: {
            items: 3
        }
    }
})

    // Venubox
    $('.venobox').venobox({
        numeratio: true,
        infinigall: true

    });
    
    
    // Team icon active js
    $(".team-icon").on("click", function () {
        $(this).toggleClass("active");
        $(".team-icon").not(this).removeClass("active");
    });

    
    // menu button cart sidebar
    $(document).ready(function() {
        $('.close_btn, .cart_sidebar_overlay').on('click', function() {
            $('.cart_sidebar').removeClass('active');
            $('.cart_sidebar_overlay').removeClass('active');
        });

        $('.cart_btn').on('click', function() {
            $('.cart_sidebar').addClass('active');
            $('.cart_sidebar_overlay').addClass('active');
        });
    });

         /*  Cart Plus Minus Button
    /*----------------------------------------*/
    
    $('.ctnbutton').on('click', function () {
        var $button = $(this);
        var oldValue = $button.parent().find('input').val();
        if ($button.hasClass('inc')) {
            var newVal = parseFloat(oldValue) + 1;
        } else {
            // Don't allow decrementing below zero
            if (oldValue > 1) {
                var newVal = parseFloat(oldValue) - 1;
            } else {
                newVal = 1;
            }
        }
        $button.parent().find('input').val(newVal);
    });

    /* Shipping Form Toggle */
    if ($('[data-toggle-shipping]').length) {
    const $shippingToggle = $('[data-toggle-shipping]'),
        $shippingToggleTarget = $($shippingToggle[0].dataset.toggleShipping),
        $shippingShowHide = function() {
            if ($shippingToggle[0].checked) {
                $shippingToggleTarget.slideDown();
            } else {
                $shippingToggleTarget.slideUp();
            }
        }
    $shippingShowHide()
    $shippingToggle.on('change', function() {
        $shippingShowHide()
    });
}

    jQuery(document).ready(function ($) {
        "use strict";

        // =======< accordion js >========
        $(".accordion > li:eq(0) a").addClass("active").next().slideDown();
        $('.accordion a').on('click', function (j) {
            var dropDown = $(this).closest("li").find("p");

            $(this).closest(".accordion").find("p").not(dropDown).slideUp();

            if ($(this).hasClass("active")) {
                $(this).removeClass("active");
            } else {
                $(this).closest(".accordion").find("a.active").removeClass("active");
                $(this).addClass("active");
            }

            dropDown.stop(false, true).slideToggle();

            j.preventDefault();
        });


         //=====< barfiller script >====
         $('#bar1').barfiller({
            duration: 7000
        });
        $('#bar2').barfiller({
            duration: 7000
        });
        $('#bar3').barfiller({
            duration: 7000
        });
        $('#bar4').barfiller({
            duration: 7000
        });
        $('#bar5').barfiller({
            duration: 7000
        });

    });

    /*---------------------
    WOW active js 
    --------------------- */
    new WOW().init();

    // Sidebar
    jQuery(document).ready(function (o) {
        0 < o(".offset-side-bar").length &&
            o(".offset-side-bar").on("click", function (e) {
                e.preventDefault(), e.stopPropagation(), o(".cart-group").addClass("isActive");
            }),
            0 < o(".close-side-widget").length &&
                o(".close-side-widget").on("click", function (e) {
                    e.preventDefault(), o(".cart-group").removeClass("isActive");
                }),
            0 < o(".navSidebar-button").length &&
                o(".navSidebar-button").on("click", function (e) {
                    e.preventDefault(), e.stopPropagation(), o(".info-group").addClass("isActive");
                }),
            0 < o(".close-side-widget").length &&
                o(".close-side-widget").on("click", function (e) {
                    e.preventDefault(), o(".info-group").removeClass("isActive");
                }),
            o("body").on("click", function (e) {
                o(".info-group").removeClass("isActive"), o(".cart-group").removeClass("isActive");
            }),
            o(".xs-sidebar-widget").on("click", function (e) {
                e.stopPropagation();
            }),
            0 < o(".xs-modal-popup").length &&
                o(".xs-modal-popup").magnificPopup({
                    type: "inline",
                    fixedContentPos: !2,
                    fixedBgPos: !0,
                    overflowY: "auto",
                    closeBtnInside: !2,
                    callbacks: {
                        beforeOpen: function () {
                            this.st.mainClass = "my-mfp-slide-bottom xs-promo-popup";
                        },
                    },
                });
        });

    // scroll btn
    if($('.prgoress_indicator path').length){
        var progressPath = document.querySelector('.prgoress_indicator path');
        var pathLength = progressPath.getTotalLength();
        progressPath.style.transition = progressPath.style.WebkitTransition = 'none';
        progressPath.style.strokeDasharray = pathLength + ' ' + pathLength;
        progressPath.style.strokeDashoffset = pathLength;
        progressPath.getBoundingClientRect();
        progressPath.style.transition = progressPath.style.WebkitTransition = 'stroke-dashoffset 10ms linear';
        var updateProgress = function () {
          var scroll = $(window).scrollTop();
          var height = $(document).height() - $(window).height();
          var progress = pathLength - (scroll * pathLength / height);
          progressPath.style.strokeDashoffset = progress;
        }
        updateProgress();
        $(window).on('scroll', updateProgress);
        var offset = 250;
        var duration = 550;
        jQuery(window).on('scroll', function () {
          if (jQuery(this).scrollTop() > offset) {
            jQuery('.prgoress_indicator').addClass('active-progress');
          } else {
            jQuery('.prgoress_indicator').removeClass('active-progress');
          }
        });
        jQuery('.prgoress_indicator').on('click', function (event) {
          event.preventDefault();
          jQuery('html, body').animate({ scrollTop: 0 }, duration);
          return false;
        });
    }

     /*------------- preloader js --------------*/
     var percentage = 0;
     var LoadingCounter = setInterval(function() {
         if (percentage <= 100) {
             // $('#loading-screen ').css('opacity', (100 - percentage));
             $("#loading-screen .loading-counter").text(percentage + "%");
             $("#loading-screen .bar").css("width", (100 - percentage) / 2 + "%");
             $("#loading-screen .progress-line").css(
                 "transform",
                 "scale(" + percentage / 100 + ")"
             );
             percentage++;
         } else {
             $("#loading-screen").fadeOut(500);
             setTimeout(() => {
                 $("#loading-screen").remove();
             }, 500);
             clearInterval(LoadingCounter);
         }
     }, 10);
     /*-----------------  End Percentage loading screen interactions -----------------  */

     
    // Portfolio Isotope 
$('.image_load').imagesLoaded(function () {

    if ($.fn.isotope) {

        var $portfolio = $('.image_load');

        $portfolio.isotope({

            itemSelector: '.grid-item',

            filter: '*',

            resizesContainer: true,

            layoutMode: 'masonry',

            transitionDuration: '0.8s'

        });
        $('.menu-filtering li').on('click', function () {

            $('.menu-filtering li').removeClass('current_menu_item');

            $(this).addClass('current_menu_item');

            var selector = $(this).attr('data-filter');

            $portfolio.isotope({

                filter: selector,

            });

        });

    };
   
       

});
    

//======< Custom Tab >======
$('.tab ul.tabs').addClass('active').find('> li:eq(0)').addClass('current');

$(".tab ul.tabs li a").on("click", function (g) {
    var tab = $(this).closest('.tab'),
        index = $(this).closest('li').index();

    tab.find('ul.tabs > li').removeClass('current');
    $(this).closest('li').addClass('current');

    tab.find('.tab_content').find('div.tabs_item').not('div.tabs_item:eq(' + index + ')').slideUp();
    tab.find('.tab_content').find('div.tabs_item:eq(' + index + ')').slideDown();

    g.preventDefault();
});

// count down timer:
$(document).ready(function() {

    function getTimeRemaining(endtime) {
        var t = Date.parse(endtime) - Date.now();
        var seconds = Math.floor((t / 1000) % 60);
        var minutes = Math.floor((t / 1000 / 60) % 60);
        var hours = Math.floor((t / (1000 * 60 * 60)) % 24);
        var days = Math.floor(t / (1000 * 60 * 60 * 24));
        return {
        'total': t,
        'days': days,
        'hours': hours,
        'minutes': minutes,
        'seconds': seconds
        };
    }

    function initializeClock(id, endtime) {
        var clock = document.getElementById(id);
        var daysSpan = clock.querySelector('.days');
        var hoursSpan = clock.querySelector('.hours');
        var minutesSpan = clock.querySelector('.minutes');
        var secondsSpan = clock.querySelector('.seconds');

        function updateClock() {
        var t = getTimeRemaining(endtime);

        daysSpan.innerHTML = t.days;
        hoursSpan.innerHTML = ('0' + t.hours).slice(-2);
        minutesSpan.innerHTML = ('0' + t.minutes).slice(-2);
        secondsSpan.innerHTML = ('0' + t.seconds).slice(-2);

        if (t.total <= 0) {
            clearInterval(timeinterval);
        }
        }

        updateClock();
        var timeinterval = setInterval(updateClock, 1000);
    }
    // count down timer:
    var deadline = new Date(Date.now() + 385 * 23 * 59 * 59 * 1000);
    initializeClock('clockdiv', deadline);
});



                                     

})(jQuery);




