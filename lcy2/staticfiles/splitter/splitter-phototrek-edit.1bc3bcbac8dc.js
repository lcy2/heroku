function populate_album(data){
  albums = data
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
      console.log(data);
      populate_album(data);
    }
  });


  $("#rtfg").on("click", function(){

    // TODO: disable the button until success returns
    $.ajax({
      url: '/splitter/gateway/rtfg',
      data: {},
      dataType: 'json',
      success: function (data) {
        console.log(data);
        populate_album(data);
      }
    });

  })
});
