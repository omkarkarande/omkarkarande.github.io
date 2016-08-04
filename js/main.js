function isScrolledIntoView(elem) {
    var docViewTop = $(window).scrollTop();
    var docViewBottom = docViewTop + $(window).height();
    var elemTop = $(elem).offset().top;
    var elemBottom = elemTop + $(elem).height();
    return ((elemBottom <= docViewBottom) && (elemTop >= docViewTop));
}

$(document).ready(function() {
    //hide top button
    $('.top-button').hide();
    $('.contact-card').hide();

    $(".rotate").textrotator({
        animation: "flipUp", // You can pick the way it animates when rotating through words. Options are dissolve (default), fade, flip, flipUp, flipCube, flipCubeUp and spin.
        separator: ",", // If you don't want commas to be the separator, you can define a new separator (|, &, * etc.) by yourself using this field.
        speed: 3000 // How many milliseconds until the next word show.
    });

    //jQuery Smooth Scrolling
    $('a').click(function() {
        $('html, body').animate({
            scrollTop: $($.attr(this, 'href')).offset().top
        }, 500);
        return false;
    });

    $(window).scroll(function() {

        //hide show top button
        if ($(this).scrollTop() > window.innerHeight - 70) {
            $('.top-button').fadeIn();
            $('#upbutton').hide();
            $('#titlecard').hide();
            $('.contact-card').show();
        } else {
            $('.top-button').fadeOut();
            $('#upbutton').show();
            $('#titlecard').show();
            $('.contact-card').hide();
        }

        if(isScrolledIntoView($('#contact'))){
            $('.top-button').css("background", "white");
            $('#glyph-arrow').css("color", "#e74c3c");
        }else{
            $('.top-button').css("background", "#e74c3c");
            $('#glyph-arrow').css("color", "white");
        }

        if (isScrolledIntoView($("#java_progress"))) {
            $("#java_progress").css("width", "90%");
        }
        if (isScrolledIntoView($("#python_progress"))) {
            $("#python_progress").css("width", "85%");
        }
        if (isScrolledIntoView($("#c_progress"))) {
            $("#c_progress").css("width", "65%");
        }
        if (isScrolledIntoView($("#html_progress"))) {
            $("#html_progress").css("width", "99%");
        }
        if (isScrolledIntoView($("#css_progress"))) {
            $("#css_progress").css("width", "85%");
        }
        if (isScrolledIntoView($("#js_progress"))) {
            $("#js_progress").css("width", "77%");
        }
        if (isScrolledIntoView($("#angular_progress"))) {
            $("#angular_progress").css("width", "45%");
        }
        if (isScrolledIntoView($("#node_progress"))) {
            $("#node_progress").css("width", "37%");
        }
        if (isScrolledIntoView($("#php_progress"))) {
            $("#php_progress").css("width", "55%");
        }
        if (isScrolledIntoView($("#bootstrap_progress"))) {
            $("#bootstrap_progress").css("width", "95%");
        }
        if (isScrolledIntoView($("#sql_progress"))) {
            $("#sql_progress").css("width", "50%");
        }
    });
});
