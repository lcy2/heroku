var slidUp = false;
function slide_up(){
  $('.dot1, .dot2').addClass('dots_disappear');
  $('#loading').addClass('moved');
  $('#loading_msg').addClass('dots_disappear');
  $("body, html").css({"overflow":"initial"});
}
