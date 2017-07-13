function isNumeric(n) {
  return !isNaN(parseFloat(n)) && isFinite(n);
}

$(document).ready(function(){
  $('.c_input').each(function(index, el){
    $(el).data('prev_val', $(el).val());
  });


  $('.c_input').on('input', function(){
    if (!isNumeric($(this).val())){
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
