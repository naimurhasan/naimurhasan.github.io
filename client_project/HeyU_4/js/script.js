//  calculating header height
var headHeight = $("header").outerHeight();

$(window).scroll(function() {
    //back to top visibilty
    if ($(this).scrollTop() > 100) {
        $('.back-to-top').fadeIn('slow');
    } else {
        $('.back-to-top').fadeOut('slow');
    }

    //fixed navbar visibilty
    if ($(this).scrollTop() > (headHeight-100)) {
        $(".fluid-navbar").fadeIn("fast");
    }else{
        $(".fluid-navbar").fadeOut("fast");
    }
});

$('.slide-nav').click(function(e){
    e.preventDefault();
    var navHeight = $('#fluid-navbar').outerHeight();
    $(".navbar-collapse").removeClass("show");
    $("html,body").animate({scrollTop: $($(this).attr('href')).offset().top-90}, 400, 'swing');

});


new WOW().init();