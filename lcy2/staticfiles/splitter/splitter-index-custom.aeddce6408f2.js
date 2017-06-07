$(document).ready(function(){
  $(".caption").on("mouseover", function(){
    $(this).stop().fadeTo(500, 0.9);
  });
  $(".caption").on("mouseout", function(){
    $(this).stop().fadeTo(500, 0.75);
  });
});


$(window).on('load', function(){
  slide_up();
});
