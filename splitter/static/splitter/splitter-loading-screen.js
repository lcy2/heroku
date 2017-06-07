var slidUp = false;
function slide_up(){
  $('.dot1, .dot2').addClass('dots_disappear');
  $('#loading').addClass('moved');
  $("body, html").css({"overflow":"auto"});
}
