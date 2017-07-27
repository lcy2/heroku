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
      new_charge += '<div class="pull-right"><span class="glyphicon glyphicon-trash"></span>';
      new_charge += '<span class="glyphicon glyphicon-edit"></span></div>';
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

    },
    error: function(xhr, err){
      var response = $.parseJSON(xhr.responseText);
      message_log(response.message, response.warning_level);
    }
  });
}


$(document).ready(function(){
  // setting the csrf token
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

  // validate tax+tip numerical inputs
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
      itemize_content += '<li><div class="input-group"><span class="input-group-addon">' + $(this).html() + '</span><input type="text" class="form-control" id="itemize_input_' + $(this).val() + '" value="' + (parseFloat($('#amt').val()) / $selected_options.length).toFixed(2) + '"></input></div></li>';
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

  // store animations to their respective objects
  $('.list-group-item').each(function(index, el){
    var animations = [
      anime({
        targets: $(this).next().find('.progress_annotation').get(),
        opacity: 1,
        easing: "easeOutQuad",
        autoplay: false,
        duration: 400,
      }),
      anime({
        targets: $(this).next().get(),
        height: "20px",
        autoplay: false,
        easing: "easeOutQuad",
        duration: 400,
      }),
    ];
    $(el).data('animations', animations);
  });
  // trigger animations upon hover
  $('.list-group-item').hover(function(){
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

  $(".glyphicon-trash").on('click', function(){
    var $li = $(this).closest("li");
    mod_action($li, $li.next());
  });
  $(".glyphicon-edit").on('click', function(){
    var $li = $(this).closest("li");
    mod_action($li, $li.next(), false);
  });

  $('#summary_btn').on('click', function(){
    $.ajax({
      url: '/splitter/gateway/sumcharge',
      type: 'POST',
      success: function(data){
        message_log(data.message, "success");

        function add_progress(trav_index, trav_pk, currency, amount, portion, sp_switch, delay_ctr){
          //sp_switch identifies whether this is for payment or spending progress
          // add a progress to the right container
          // to be animated to full width after the callee loop
          var html = '<div class="progress-bar progress-bar-flat-' + trav_index;
          if (sp_switch == "payment"){
            html += '-alt';
          }
          html += '" role="progressbar"><span class="sum_number">' + amount.toFixed(2) + '&nbsp;</span><span>' + currency + '</span></div>';
          var $html = $(html);
          var $progress = $('#traveler-' + trav_pk).find("." + sp_switch + " .progress");
          $progress.append($html);
          $html.data('animation', anime({
            targets: $html[0],
            minWidth: (portion * 100) + "%",
            duration: 500,
            delay: delay_ctr * 100,
            easing: 'easeOutQuad',
            autoplay: false,
          }));
        }

        // clear the progress bars
        $('#summary .progress').empty();

        // set the width of the progress bars\
        // find the largest amount of them all
        var largest = 0;
        for (var i = 0; i < data.accounts.length; i++){
          largest = Math.max(largest, Math.max(data.accounts[i].total_paid, data.accounts[i].total_spent));
        }

        // set currency
        $('.lity_currency').html($('#lity_currency_select option:selected').text());
        var xrate = parseFloat($('#lity_currency_select').val());

        for (var i = 0; i< data.accounts.length; i++){
          var account = data.accounts[i];
          var $traveler = $('#traveler-' + account.pk);

          // header
          $traveler.find('.panel-heading .total_amt').data('base_val', data.accounts[i].total_paid - data.accounts[i].total_spent);

          // spending first:
          $traveler.find('.spending .progress').css('width', data.accounts[i].total_spent / largest * 100+ '%');

          $traveler.find('.spending .total_amt').data('base_val', data.accounts[i].total_spent);

          $traveler.find('.lity_currency');

          var delay_ctr = 0;
          for (var key in account.spent){
            add_progress(i, account.pk, key, account.spent[key].amt, account.spent[key].portion, 'spending', delay_ctr);
            delay_ctr ++;
          }
          // followed by payments
          // spending first:
          $traveler.find('.payment .progress').css('width', data.accounts[i].total_paid / largest * 100+ '%');
          $traveler.find('.payment .total_amt').data('base_val', data.accounts[i].total_paid);


          if (xrate == 0){
            $traveler.find('.panel-heading .total_amt').html("0.00");
            $traveler.find('.spending .total_amt').html("0.00");
            $traveler.find('.payment .total_amt').html("0.00");
          } else {
            var net_val = data.accounts[i].total_paid - data.accounts[i].total_spent;
            var $net_amt = $traveler.find('.panel-heading .total_amt');
            if (net_val < 0){
              $net_amt.html("(" + Math.abs(net_val / xrate).toFixed(2) + ")");
              $net_amt.css('color', '#990000');
            } else {
              $net_amt.html((net_val / xrate).toFixed(2));
              $net_amt.css('color', 'inherit');
            }

            $traveler.find('.spending .total_amt').html((data.accounts[i].total_spent / xrate).toFixed(2));
            $traveler.find('.payment .total_amt').html((data.accounts[i].total_paid / xrate).toFixed(2));
          }


          for (var key in account.paid){
            add_progress(i, account.pk, key, account.paid[key].amt, account.paid[key].portion, 'payment', delay_ctr);
            delay_ctr ++;
          }
        }

        $('#summary .progress-bar').each(function(index, el){
          $(el).data('animation').play();
        });
      },
      error: function(xhr, err){
        var response = $.parseJSON(xhr.responseText);
        message_log(response.message, response.warning_level);
      },
    });
  });

  $('#lity_currency_select').on('changed.bs.select', function(){
    var currency_name = $('#lity_currency_select option:selected').text();
    var currency_rate = $('#lity_currency_select').val();

    $('#summary .total_amt').each(function(index, el){
      if (currency_rate == 0){
        $(el).html("0.00");
      } else {
        $(el).html( ($(el).data('base_val') / currency_rate).toFixed(2) );
      }
    });
    $('#summary .lity_currency').each(function(index, el){
      $(el).html(currency_name);
    });
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
      },
      error: function(xhr, err){
        var response = $.parseJSON(xhr.responseText);
        message_log(response.message, response.warning_level);
        $('#is_private_btn').bootstrapToggle('toggle');
      }
    });

    for (var i = 0; i < $(this).data('animation').length; i++){
      if ($(this).prop('checked') === $(this).data('animation')[i].reversed){
        $(this).data('animation')[i].reverse();
      }
    }

    for (var i = 0; i < $(this).data('animation').length; i++){
      $(this).data('animation')[i].play();
    }
  });

});


function mod_action($li, $prog, delete_action =true){
  $.ajax({
    url: '/splitter/gateway/delcharge',
    type: 'POST',
    data: {
      'hash_val': $li.data('hash'),
    },
    dataType: 'json',
    success: function(data){
      $li.remove();
      $prog.remove();
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

$('.selectpicker').on('loaded.bs.select', function (e) {
  $(this).css('z-index', '-100');
});
