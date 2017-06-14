var map, pic_data, is_album;
var prevID = -1;
var imgHeight = 135;
var mediaMargin = 10;


function populate_map(collections){
  // mapbox coordinates are switched

  var geo_feats = $.map(collections, function(el, index){
    if (el.geo){
      var geo_pt = {
        "type": "Feature",
        "geometry": {
            "type": "Point",
            "coordinates": [el.geo.lon, el.geo.lat]
        },
        "properties": {
            "title": el.title,
            "icon": "marker",
            'thumbnail': '<div class="thumbnail"><img class="thumbnail_img" src="'
              + el.thumbnail + '" /><div class="caption"><strong>' + el.title + '</strong></div></div>',
        }
      }
      return geo_pt;
    }
    return null;
  });

  var point_layer = {
      "id": "points",
      "type": "symbol",
      "source": {
          "type": "geojson",
          "data": {
              "type": "FeatureCollection",
              "features": geo_feats,
          }
      },
      "layout": {
          "icon-image": "{icon}-15",
          "icon-allow-overlap": true,
          "text-field": "{title}",
          "text-font": ["Open Sans Semibold", "Arial Unicode MS Bold"],
          "text-offset": [0, 0.6],
          "text-anchor": "top",
          "text-optional" : true,
      },
      "paint": {
        "text-color" : "#ffffff",
      }
  };

  if (map.getLayer('points')){
    map.removeLayer("points");
    map.removeSource("points");
  }
  map.addLayer(point_layer);

  map.on('click', 'points', function (e) {
    map.flyTo({
      center: e.features[0].geometry.coordinates,
      offset: [0, 125],
    });
    new mapboxgl.Popup()
      .setLngLat(e.features[0].geometry.coordinates)
      .setHTML(e.features[0].properties.thumbnail)
      .addTo(map);
  });
    // Change the cursor to a pointer when the mouse is over the places layer.
  map.on('mouseenter', 'points', function () {
      map.getCanvas().style.cursor = 'pointer';
  });

  // Change it back to a pointer when it leaves.
  map.on('mouseleave', 'points', function () {
      map.getCanvas().style.cursor = '';
  });

}

//centers the map to 1st item (upon initialization)
function center_map(collections){
  var has_geo = $.map(collections, function(el, index){
    if (el.geo){
      return true;
    } else {
      return null;
    }
  });

  if (has_geo.length){
    var bounds = new mapboxgl.LngLatBounds();
    $.each(collections, function(index, el){
      bounds.extend(new mapboxgl.LngLat(el.geo.lon, el.geo.lat));
    });
    map.fitBounds(bounds, {
      padding: {top: 10, bottom: 20, left: 10, right: 10},
      duration: 0,
    });
  } else {
    map.jumpTo({
      center: [2.3522, 38.8566],
    }); // center at Paris if no geotag
  }
}

function newDataProcess(data){
  pic_data = data.item_data;
  is_album = data.is_album;
  populate_map(pic_data);
  center_map(pic_data);
}



// initially, load in the albums interface
function load_albums(){
  $.ajax({
    url: '/splitter/gateway/rafd',
    type: 'POST',
    data: {},
    dataType: 'json',
    success: function (data) {
      newDataProcess(data);
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

  // initialize map
  mapboxgl.accessToken = 'pk.eyJ1IjoibGljaGFuZ3lpODg4IiwiYSI6ImNqMzJiMW14cDAwMDAzM3MzZ3djcmt4N3QifQ.XknNEOZ93pNGqvU_2oOv5Q';
  map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/mapbox/dark-v9',
    zoom: 13,
  });
  // Add zoom and rotation controls to the map.
  map.addControl(new mapboxgl.NavigationControl());

  map.on('load', function(){
    load_albums();
  });
  map.on('sourcedata', function(){
    if (map.areTilesLoaded()){
      if (document.readyState === "complete"){
        slide_up();
        map.off('sourcedata');
      } else {
        $(window).one('load', function(){
          slide_up();
          map.off('sourcedata');
        });
      }
    }
  });


});
