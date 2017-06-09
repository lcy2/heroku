$(document).ready(function(){
  var csrftoken = $('[name=csrfmiddlewaretoken]').val();
  function csrfSafeMethod(method) {
    // these HTTP methods do not require CSRF protection
    return (/^(GET|HEAD|OPTIONS|TRACE)$/.test(method));
  }
  $.ajaxSetup({
      beforeSend: function(xhr, settings) {
          if (!csrfSafeMethod(settings.type) && !this.crossDomain) {
              xhr.setRequestHeader("X-CSRFToken", csrftoken);
          }
      }
  });

  $('.selectpicker').selectpicker();

  function add_input_box(){
    $new_trav = $('<div class="input-group" style="margin: 0 10px;">'
        + '<input type="text" class="form-control" id="trav_name" placeholder="Traveler Name" />'
        + '<span class="input-group-btn"><button type="button" class="btn btn-default">New</button></span></div>');
    $('.dropdown-menu.inner').append($new_trav);

    // input boxes in bootstrap dropdown don't get space presses...
    $new_trav.find('#trav_name').on('keydown', function(e){
      if (e.which == 32){
        $(this).val($(this).val() + ' ');
      }
    });
  }
  add_input_box();

  $new_trav.find('button').on('click', function(){
    $.ajax({
      url: '/splitter/gateway/newtrav',
      type: 'POST',
      data: {
        'trav_name': $new_trav.find('#trav_name').val(),
      },
      dataType: 'json',
      success: function (data) {
        message_log(data.message, 'success');
        $('<option value="'+ data.new_pk +'">['+ data.new_pk + '] ' + $new_trav.find('#trav_name').val() + '</option>').insertBefore('option[data-divider]');
        $('.selectpicker').selectpicker('refresh');
        add_input_box();
      },
      error: function(xhr, err){
        var response = $.parseJSON(xhr.responseText);
        message_log(response.message, response.warning_level);
      },
      complete: function(){
        $new_trav.find('#trav_name').val('');
      }
    });
  });
});
