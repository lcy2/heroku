function populate_album(data){
  var albums = data.album_infos;
  var fill_text = '';
  $.each(albums, function(index, el){
    fill_text += '<div class="media">';
    fill_text += '<div class="media-left"><img class="media-object" src="' + el.thumbnail + '" />';
    fill_text += '<span class="media-body">' + el.title + '</span></div>';
    fill_text += '</div>';
  });
  console.log(fill_text);
  $('#thumb_list').html(fill_text);
}

function rtfgClick(e){
  $(this).html("Please Wait");
  e.preventDefault();


  $.ajax({
    url: '/splitter/gateway/rtfg',
    data: {},
    dataType: 'json',
    success: function (data) {
      populate_album(data);
    },
    complete: function() {
      $('#rtfg').html("Refresh");
      $('#rtfg').unbind('click').click(rtfgClick);
    }
  });
}

$(document).ready(function(){

  mapboxgl.accessToken = 'pk.eyJ1IjoibGljaGFuZ3lpODg4IiwiYSI6ImNqMzJiMW14cDAwMDAzM3MzZ3djcmt4N3QifQ.XknNEOZ93pNGqvU_2oOv5Q';
  var map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/mapbox/dark-v9'
  });

  $.ajax({
    url: '/splitter/gateway/rafd',
    data: {},
    dataType: 'json',
    success: function (data) {
      populate_album(data);
    }
  });


  $("#rtfg").on("click", rtfgClick);
});
