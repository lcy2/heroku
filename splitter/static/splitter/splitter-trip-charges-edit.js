var sortable_order = []

function isNumeric(n) {
  return !isNaN(parseFloat(n)) && isFinite(n);
}

function submit_form(dataObj){
  $.ajax({
    url: '/splitter/gateway/newcharge',
    type: 'POST',
    data: dataObj,
    dataType: 'json',
    success: function(data){
      message_log(data.message, "success");
      var new_charge = '<li class="list-group-item clearfix" data-hash="' + data.hash_val + '" title="' + data.footnote + '">';
      new_charge += '<div><span class="label label-default">' + data.time + '</span>&nbsp;';
      new_charge += '<span class="label progress-bar-flat-' + data.payer.index + ' payer_name">' + data.payer.name + '</span>';
      new_charge += '<span> paid <u><strong>' + data.amount + '</strong></u> for ' + data.description + '.</span><small>' + data.footnote + '</small></div>';
      new_charge += '<div class="pull-right"><span class="glyphicon glyphicon-edit"></span>';
      new_charge += '<span class="glyphicon glyphicon-trash"></span></div>';
      new_charge += '</li>';
      var new_prog = '<div class="progress">';
      for (var i = 0; i < data.breakdown.length; i ++){
        new_prog += '<div class="progress-bar progress-bar-flat-' + data.breakdown[i][0] + '" role="progressbar" style="width:' + data.breakdown[i][1] + '%">';
        new_prog += '<span class="progress_annotation">' + data.breakdown[i][3] + ': ' + data.breakdown[i][2] + '</span></div>';
      }
      new_prog += '</div>';
      var $new_charge = $(new_charge);
      var $new_prog = $(new_prog)
      $('.list-group').append($new_charge);
      $('.list-group').append($new_prog);
      // store animations to their respective objects
      var animations = [
        anime({
          targets: $new_prog.find('.progress_annotation').get(),
          opacity: 1,
          easing: "easeOutQuad",
          autoplay: false,
          duration: 400,
        }),
        anime({
          targets: $new_prog.get(),
          height: "20px",
          autoplay: false,
          easing: "easeOutQuad",
          duration: 400,
        }),
      ];
      $new_charge.data('animations', animations);

      // trigger animations upon hover
      $new_charge.hover(function(){
        var animations = $(this).data('animations');
        for (var i = 0; i< animations.length; i++){
          if (animations[i].reversed) animations[i].reverse();
          animations[i].play();
        }
      }, function(){
        var animations = $(this).data('animations');
        for (var i = 0; i< animations.length; i++){
          if (!animations[i].reversed) animations[i].reverse();
          animations[i].play();
        }
      });

      // bind click listener to the deletion glyphicon
      $new_charge.find(".glyphicon-trash").on('click', function(){
        var $li = $(this).closest("li");
        mod_action($li, $li.next());
      });

      // bind click listener to the deletion glyphicon
      $new_charge.find(".glyphicon-edit").on('click', function(){
        var $li = $(this).closest("li");
        mod_action($li, $li.next(), false);
      });

      // clear certain fields
      $('#amt').val('');
      $('.itemize_input').val('');
      $('#descriptor').val('');

    },
    error: function(xhr, err){
      var response = $.parseJSON(xhr.responseText);
      message_log(response.message, response.warning_level);
    }
  });
}


$(document).ready(function(){

  $('#even_btn').on('click', function(){
    $('input[type=radio][value=even]').prop("checked", true);
  });

  $('#itemizing').on('click', function(){
    if ($('input[name=distribution]:checked').val() != "itemized"){
      $('input[type=radio][value=itemized]').trigger('change');
      $('input[type=radio][value=itemized]').prop("checked", true);
    }

  })

  // validate tax+tip numerical inputs
  $('#tt_amt').data('prev_val', $('#tt_amt').val());
  $('#tt_amt').on('input', function(){
    if (!isNumeric($(this).val()) || parseFloat($(this).val()) > 100 || parseFloat($(this).val()) < 0){
      anime({
        targets: this,
        backgroundColor: ['#F99', '#FFF'],
        duration: 1000,
        easing: "easeInOutQuad",
      });
      $(this).val($(this).data('prev_val'));
    } else {
      var float_val = parseFloat($(this).val());
      if (float_val != float_val.toFixed(2)){
        $(this).val(float_val.toFixed(2));
      } else {
        if ( $('#tt_check').is(":checked") ){
          var change_factor = 1 / (parseFloat($(this).data('prev_val'))/100 + 1) * (parseFloat($(this).val())/100 + 1);
          var $inputs = $('#itemize_dropdown input');

          $('#amt').val((parseFloat($('#amt').val()) * change_factor ).toFixed(2));

          $inputs.each(function(index, el){
            $(el).val((parseFloat($(el).val()) * change_factor ).toFixed(2));
            $(el).data('prev_val', $(el).val());
          });
        } else {
          if (parseFloat($(this).val()) != 0){
            $('#tt_check').prop("checked", true);
            $('#tt_check').trigger('change');
          }
        }
        $(this).data('prev_val', $(this).val());

      }
    }
  });

  // validate total amt charged numerical inputs
  $('#amt').data('prev_val', $('#amt').val());
  $('#amt').on('input', function(){
    if (!isNumeric($(this).val()) || parseFloat($(this).val()) < 0 || parseFloat($(this).val()) != parseFloat($(this).val()).toFixed(2) ){
      anime({
        targets: this,
        backgroundColor: ['#F99', '#FFF'],
        duration: 1000,
        easing: "easeInOutQuad",
      });
      $(this).val($(this).data('prev_val'));
    } else {
      $(this).data('prev_val', $(this).val());
    }
  });

  $('.input-group.date').datepicker({
    format: "yyyy/mm/dd",
  });
  $('.input-group.date').datepicker('setDate', new Date());

  // upon changing the multiple selection, populate the dropdown menu
  $('#debt_select').on('changed.bs.select', function(){
    var itemize_content = ''
    var $selected_options = $(this).find('option:selected');
    if ($selected_options.length == 0){
      $('input[value=even]').prop('checked', true);
    };
    $selected_options.each(function(){
      itemize_content += '<li><div class="input-group"><span class="input-group-addon">' + $(this).html() + '</span><input type="text" class="form-control itemize_input" id="itemize_input_' + $(this).val() + '" value="' + (parseFloat($('#amt').val()) / $selected_options.length).toFixed(2) + '"></input></div></li>';
    });
    itemize_content += '</div>';
    $('#itemize_dropdown').html(itemize_content);
    $('#itemize_dropdown input').each(function(index, el){
      $(el).data('prev_val', $(el).val());
      $(el).on('input', function(){
        if (!isNumeric($(this).val()) || parseFloat($(this).val()) > 100 || parseFloat($(this).val()) < 0 || parseFloat($(this).val()) != parseFloat($(this).val()).toFixed(2)){
          anime({
            targets: this,
            backgroundColor: ['#F99', '#FFF'],
            duration: 1000,
            easing: "easeInOutQuad",
          });
          $(this).val($(this).data('prev_val'));
        } else {
          $(this).data('prev_val', $(this).val());
        }
      });
    });
  });

  // when radio button changes to itemized
  $('input[type=radio][value=itemized]').on('change', function(){
    var $inputs = $('#itemize_dropdown input')
    $inputs.each(function(index, el){
      $(el).val((parseFloat($('#amt').val()) / $inputs.length).toFixed(2));
      $(el).data('prev_val', $(el).val());
    });
  });

  // when checking the tip box
  // alter the total to include tax and tip
  $('#tt_check').on('change', function(){
    var $inputs = $('#itemize_dropdown input')
    if ($('#tt_check').is(":checked")){
      $('#amt').val(((parseFloat($('#tt_amt').val())/100 + 1) * parseFloat($('#amt').val())).toFixed(2));

      $inputs.each(function(index, el){
        $(el).val((parseFloat($(el).val()) * (parseFloat($('#tt_amt').val())/100 + 1) ).toFixed(2));
        $(el).data('prev_val', $(el).val());
      });

    } else {
      $('#amt').val((parseFloat($('#amt').val()) / (parseFloat($('#tt_amt').val())/100 + 1)).toFixed(2));

      $inputs.each(function(index, el){
        $(el).val((parseFloat($(el).val()) / (parseFloat($('#tt_amt').val())/100 + 1) ).toFixed(2));
        $(el).data('prev_val', $(el).val());
      });
    }
    $('#amt').data('prev_val', $('#amt').val());
  });

  // submit the form
  $('#submit').on('click', function(){
    // shortcut the insufficient inputs
    if (!$('#pay_select').val()){
      message_log("Please select a payer", "warning");
      return false;
    }
    if (!$('#debt_select').val()){
      message_log("Please choose for whom the expense is paid.", "warning");
      return false;
    }
    if ($('input[name=distribution]:checked').val() == "itemized"){
      var sum = 0;
      $('#itemize_dropdown input').each(function(index, el){
        sum += parseFloat($(el).val());
      });
      // if the error is larger than 1%
      if (Math.abs(sum - parseFloat($('#amt').val())) / sum > 0.01){
        message_log("There's a mismatch between the sum of the itemized inputs and the total sum.", "warning");
        return false;
      }
    }

    var post_obj = {
      payer: $('#pay_select').val(),
      debtors: $('#debt_select').val(),
      amount: $('#amt').val(),
      currency: $('#currency').val(),
      time: $('#time_input').val(),
      distribution: $('input[name=distribution]:checked').val(),
      description: $('#descriptor').val(),
    }
    if ($('#tt_check').is(":checked")){
      post_obj.tip_rate = $('#tt_amt').val();
    }
    if ($('input[name=distribution]:checked').val() == "itemized"){
      post_obj.itemized = {};
      var inputs = $('#itemize_dropdown input');
      $.each($('#debt_select').val(), function(index, el){
        post_obj.itemized[el.toString()] = $('#itemize_input_' + el).val();
      });
    }
    submit_form(post_obj);
  });

  $(".glyphicon-trash").on('click', function(){
    var $div = $(this).closest("li").parent();
    mod_action($div);
  });
  $(".glyphicon-edit").on('click', function(){
    var $div = $(this).closest("li").parent();
    mod_action($div, false);
  });

  // deal with the is_private button
  // initialize the styles according to whether the trip finances are sharable

  // these are animations from private to public
  // aka from unchecked to checked
  $('#is_private_btn').data('animation', [
    anime({
      targets: $('#share_url')[0],
      paddingLeft: ["0", "10px"],
      opacity: [0, 1],
      easing: "easeOutQuad",
      autoplay: false,
      duration: 250,
    }),

    anime({
      targets: $('#is_private .toggle.btn')[0],
      borderTopRightRadius: ["3px", "0px"],
      borderBottomRightRadius: ["3px", "0px"],
      duration: 250,
      easing: "easeOutQuad",
      autoplay: false,
    }),
  ]);

  if (!$('#is_private_btn').prop('checked')){
    $('#share_url').css('opacity', 0);
    $('#share_url').css('paddingLeft', '0');
  }

  $('#is_private_btn').on('change', function(){
    // ajax to get the shareable url
    $.ajax({
      url: '/splitter/gateway/privcharge',
      type: 'POST',
      data: {
        'toggle': $(this).prop('checked'),
      },
      dataType: 'json',
      success: function(data){
        $('#share_url').val(data.share_url);
        message_log(data.message, "success");
        $target = $('#is_private_btn');
        for (var i = 0; i < $target.data('animation').length; i++){
          if ($target.prop('checked') === $target.data('animation')[i].reversed){
            $target.data('animation')[i].reverse();
          }
        }

        for (var i = 0; i < $target.data('animation').length; i++){
          $target.data('animation')[i].play();
        }
      },
      error: function(xhr, err){
        var response = $.parseJSON(xhr.responseText);
        message_log(response.message, response.warning_level);
        $('#is_private_btn').bootstrapToggle('toggle');
      }
    });
  });
});


function mod_action($div, delete_action =true){
  $.ajax({
    url: '/splitter/gateway/delcharge',
    type: 'POST',
    data: {
      'hash_val': $div.find('li').data('hash'),
    },
    dataType: 'json',
    success: function(data){
      $div.remove();
      if (delete_action){
        message_log("Charge deleted.", "success");
      } else {
        $('#pay_select').selectpicker('val', data.payer);
        $('#debt_select').selectpicker('val', data.debtors);
        $('#amt').val(data.amount);
        $('#currency').selectpicker('val', data.currency);
        $('#time_input').val(data.time);
        $('input[type=radio][value=' + data.distribution + ']').prop("checked", true);
        if (data.distribution == "itemized"){
          $('#debt_select').trigger('changed.bs.select');
          for (var i = 0; i < data.debtors.length; i++){
            $('#itemize_input_' + data.debtors[i]).val(data.breakdown[data.debtors[i]]);
          }
        }
        $('#descriptor').val(data.description);
        if (data.tip_rate){
          $('#tt_amt').val(data.tip_rate);
          $('#tt_check').prop("checked", true);
        }
        message_log("Charge recalled for edits.", "success");
      }
    },
    error: function(xhr, err){
      var response = $.parseJSON(xhr.responseText);
      message_log(response.message, response.warning_level);
    }
  });
}


// Sortable
Sortable.create(sortable_list, {
  handle: '.glyphicon-resize-vertical',
  animation: 150,
  onStart: function(evt){
    sortable_order = this.toArray();
  },
  onEnd: function(evt){
    var target = this;
    $.ajax({
      url: '/splitter/gateway/swapcharge',
      type: 'POST',
      data: {
        old_index: evt.oldIndex,
        new_index: evt.newIndex
      },
      dataType: 'json',
      success: function(data){
        message_log(data.message, data.warning_level);
      },
      error: function(xhr, err){
        var response = $.parseJSON(xhr.responseText);
        message_log(response.message, response.warning_level);
        target.sort(sortable_order);
      }
    });
  },
});
