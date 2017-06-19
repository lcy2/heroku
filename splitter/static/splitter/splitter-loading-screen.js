function slide_up(){
  $('.dot1, .dot2').addClass('dots_disappear');
  $('#loading').addClass('moved');
  $('#loading_msg').addClass('dots_disappear');
  $("body, html").css({"overflow":"initial"});
}

$(document).ready(function(){
  // set maximum time curtain is down
  setTimeout(function(){
    if (!$('#loading').hasClass('moved')){
      slide_up();
    }
  }, 2000);
})
