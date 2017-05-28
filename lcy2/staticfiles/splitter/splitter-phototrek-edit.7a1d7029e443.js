function populate_album(data){
  var albums = data.album_infos;
  var fill_text = '';
  $.each(albums, function(index, el){
    fill_text += '<img src="' + el.thumbnail + '" /><p>' + el.title + '</p><br />';
    console.log(el.order);
  });
  $('#album_list').html(fill_text);
}


$(document).ready(function(){
  /*
  mapboxgl.accessToken = 'pk.eyJ1IjoibGljaGFuZ3lpODg4IiwiYSI6ImNqMzJiMW14cDAwMDAzM3MzZ3djcmt4N3QifQ.XknNEOZ93pNGqvU_2oOv5Q';
  var map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/mapbox/dark-v9'
  });
  */
  $.ajax({
    url: '/splitter/gateway/rafd',
    data: {},
    dataType: 'json',
    success: function (data) {
      populate_album(data);
    }
  });


  $("#rtfg").on("click", function(e){
    $(this).html("Please Wait");
    $(this).unbind('click');


    $.ajax({
      url: '/splitter/gateway/rtfg',
      data: {},
      dataType: 'json',
      success: function (data) {
        populate_album(data);
      },
      complete: function() {
        $('#rtfg').html("Refresh");
        $('#rtfg').bind('click');
      }
    });


  })
});
