function message_log(msg, warning_class = 'info'){
  var $new_msg = $('<div style="display: none;" class="alert alert-'
    + warning_class
    + ' alert-dismissible" role="alert"><a href="#" class="close" data-dismiss="alert" aria-label="close">&times;</a>'
    + msg
    + '</div>');
  $new_msg.appendTo($('#message_panel')).slideDown('fast');

  setTimeout(function(){
    $new_msg.slideUp('fast');
  }, 3000);
}

$(document).ready(function(){
  setTimeout(function(){
    $('.alert').slideUp('fast');
  }, 10000)
});
