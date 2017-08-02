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
      anime({
        targets: $(this).find(".glyphicon-resize-vertical").get(),
        opacity: 1,
        autoplay: false,
        easing: "easeOutQuad",
        duration: 400,
      }),
      anime({
        targets: $(this).find(".pull-right").children().get(),
        opacity: 1,
        autoplay: false,
        easing: "easeOutQuad",
        duration: 400,
      })
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

  $('#summary_btn').on('click', function(){
    $.ajax({
      url: '/splitter/gateway/sumcharge',
      type: 'POST',
      success: function(data){
        message_log(data.message, "success");

        function add_progress(trav_index, trav_pk, currency, amount, portion, sp_switch, delay_ctr){
          if (Math.round(portion) == 0) return false;

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
            minWidth: Math.round(portion * 100) + "%",
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
});



$('.selectpicker').on('loaded.bs.select', function (e) {
  $(this).css('z-index', '-100');
});
