$(document).ready(function(){
  $('.navbar .navbar-collapse')
    .on('hide.bs.collapse', function () {
      $('.navbar .navbar-toggle').removeClass('active');
    })
    .on('show.bs.collapse', function () {
      $('.navbar .navbar-toggle').addClass('active');
    });
});
