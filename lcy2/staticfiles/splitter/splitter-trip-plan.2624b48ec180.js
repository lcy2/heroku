var access_token = 'pk.eyJ1IjoibGljaGFuZ3lpODg4IiwiYSI6ImNqMzJiMW14cDAwMDAzM3MzZ3djcmt4N3QifQ.XknNEOZ93pNGqvU_2oOv5Q';
var waypoint_title = '';
var isDragging, isCursorOverPoint, hasMoved;

function populate_map(collections){
  if (map.getLayer('waypoints')){
    map.removeLayer('waypoints');
    map.removeSource('waypoints');
  }
  var geo_feats = $.map(collections, function(el, index){

    var geo_pt = {
      "type": "Feature",
      "geometry": {
          "type": "Point",
          "coordinates": [el[0], el[1]],
      },
      "properties": {
        "title": index + 1,
      },
    }
    return geo_pt;
  });

  var point_layer = {
      "id": "waypoints",
      "type": "symbol",
      "source": {
          "type": "geojson",
          "data": {
              "type": "FeatureCollection",
              "features": geo_feats,
          }
      },
      "layout": {
          "icon-image": "marker-15",
          "icon-size": 1.5,
          "icon-allow-overlap": true,
          "text-field": "{title}",
          "text-font": ["Open Sans Semibold", "Arial Unicode MS Bold"],
          "text-offset": [-0.1, -0.5],
          "text-anchor": "center",
          "text-optional": true,
          "text-size": 10,
      },
      "paint": {
        "text-color" : "#000000",
      }
  };

  map.addLayer(point_layer);
}

function draw_line(coordinates){
  if (map.getLayer('route')){
    map.removeLayer('route');
    map.removeSource('route');
  }

  map.addLayer({
    "id": "route",
    "type": "line",
    "source": {
        "type": "geojson",
        "data": {
            "type": "Feature",
            "properties": {},
            "geometry": {
                "type": "LineString",
                "coordinates": coordinates,
            }
        }
    },
    "layout": {
        "line-join": "round",
        "line-cap": "round"
    },
    "paint": {
        "line-color": "#888",
        "line-width": 8
    }
  });
}

function get_detailed_directions(locs, mode){
  var locations = $.map(locs, function(el, index){
    return el.join(',');
  }).join(';');
  $.ajax({
    url: '/splitter/outward',
    type: 'GET',
    data: {
      'target': 'mapbox_dir',
      'latlon_string': locations,
      'mode': mode,
      'access_token': access_token,
    },
    dataType: 'json',
    cache: true,
    success: function (data) {
      draw_line(data.routes[0].geometry.coordinates);
    },
    error: function(xhr, err){
      var response = $.parseJSON(xhr.responseText);
      message_log(response.message);
    },
    complete: function(){
    }
  });
}


function find_path(locs, mode, rt=true){
  if (locs.length < 2){
    message_log("Too few waypoints selected.", "info");
    return null;
  }
  if (locs.length > 12){
    message_log("Too many waypoints selected. Please keep it under 12 per API limits.", "info");
    return null;
  }

  if (locs.length == 2){
    rt = false;
    message_log("One way direction given.", "info");
  }


  // pre-process the latlons
  var locations =  $.map(locs, function(el, index){
    return el[0] + ',' + el[1];
  }).join(';');

  $.ajax({
    url: '/splitter/outward',
    type: 'GET',
    data: {
      'target': 'mapbox_tsp',
      'latlon_string': locations,
      'mode': mode,
      'access_token': access_token,
      'roundtrip': rt
    },
    dataType: 'json',
    cache: true,
    success: function (data) {
      draw_line(data.trips[0].geometry.coordinates);
      populate_map(locs);
      message_log("Path generated.", "success");
    },
    error: function(xhr, err){
      var response = $.parseJSON(xhr.responseText);
      message_log(response.message, 'warning');
    },
    complete: function(){
    }
  });
}

function refresh_ids(){
  $('.waypoint').each(function(index, el){
    $(el).find('span:first').html(index);
  })
  populate_map(gather_waypoints());
}


function add_waypoint(lnglat){
  if (!waypoint_title){
    message_log("Awaiting server response.", "info");
    return;
  }
  if ($('.waypoint').length >= 12){
    message_log("Too many waypoints added. Please keep it under 12 per API limits.", "info");
    return;
  }

  var location_string = $.map(lnglat.reverse(), function(el, index){
    return el.toFixed(5);
  }).join(', ');

  var $waypoint = $('<div class="waypoint"><div><span>'
    + ($('.waypoint').length + 1) + '</span>: '
    + $('.mapboxgl-ctrl-geocoder > input').val()
    + '</div><div class="delete_media pull-right"><small><span class="glyphicon glyphicon-trash"></span></small></div><div><span class="label label-default">'
    + location_string
    + '</span></div></div>');
  $('#output_panel').append($waypoint);
  $waypoint.hover(function(){
    $(this).find('.delete_media').show();
  }, function(){
    $(this).find('.delete_media').hide();
  });
  $waypoint.find('.delete_media').on('click', function(){
    $waypoint.remove();
    refresh_ids();
  });

  $('.mapboxgl-ctrl-geocoder > input').val('');
  waypoint_title = '';
}

function gather_waypoints(){
  var locations = $('.waypoint').map(function(index, el){
    return [$(el).find('span.label').html().split(', ').reverse()];
  });
  return locations;
}

function reverse_geocode(lnglat){
  var location = lnglat.lng + ',' + lnglat.lat;
  $.ajax({
    url: '/splitter/outward',
    type: 'GET',
    data: {
      'target': 'mapbox_rgeo',
      'latlon_string': location,
      'access_token': access_token,
    },
    dataType: 'json',
    cache: true,
    success: function (data) {
      waypoint_title = data.features[0].place_name;
      $('.mapboxgl-ctrl-geocoder > input').val(waypoint_title);
    },
    error: function(xhr, err){
      var response = $.parseJSON(xhr.responseText);
      message_log(response.message, 'warning');
    },
    complete: function(){
    }
  });
}


$(document).ready(function(){
  /*
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
  */

  mapboxgl.accessToken = 'pk.eyJ1IjoibGljaGFuZ3lpODg4IiwiYSI6ImNqMzJiMW14cDAwMDAzM3MzZ3djcmt4N3QifQ.XknNEOZ93pNGqvU_2oOv5Q';
  map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/mapbox/dark-v9',
    center: [2.3522, 48.8566],
    zoom: 13,
  });

  // Add Geocoder
  var geocoder = new MapboxGeocoder({
    accessToken: mapboxgl.accessToken
  });
  map.addControl(geocoder);

  // Add zoom and rotation controls to the map.
  map.addControl(new mapboxgl.NavigationControl());


  // adapted from mapbox api example
  // https://www.mapbox.com/mapbox-gl-js/example/drag-a-point/
  function mouseDown() {
      if (!isCursorOverPoint) return;

      isDragging = true;

      // Set a cursor indicator
      map.getCanvas().style.cursor = 'grab';

      // Mouse events
      map.on('mousemove', onMove);
  }

  function onMove(e) {
      if (!isDragging) return;
      var coords = e.lngLat;

      // Set a UI indicator for dragging.
      map.getCanvas().style.cursor = 'grabbing';

      // Update the Point feature in `geojson` coordinates
      // and call setData to the source layer `point` on it.
      var geojson = {
        'type': "Point",
        "coordinates": [coords.lng, coords.lat],
      };
      //geojson.features[0].geometry.coordinates = ;
      map.getSource('single-point').setData(geojson);
      hasMoved = true;
  }

  function onUp(e) {
      // Unbind mouse events
      map.off('mousemove', onMove);
      if (!isDragging || !hasMoved) return;
      // Print the coordinates of where the point had
      // finished being dragged to on the map.

      reverse_geocode(e.lngLat);
      map.getCanvas().style.cursor = '';
      isDragging = false;


      hasMoved = false;
  }
  //////////////////////////


  map.on('load', function(){

    map.addSource('single-point', {
      "type": "geojson",
      "data": {
          "type": "FeatureCollection",
          "features": [{
            "type": "Feature",
            "geometry": {
              "type": "Point",
              "coordinates":[2.3522, 48.8566],
            }
          }]
      }
    });

    map.addLayer({
        "id": "point",
        "source": "single-point",
        "type": "symbol",
        "layout": {
            "icon-image": "circle-stroked-15",
        },
    });

    // Listen for the `geocoder.input` event that is triggered when a user
    // makes a selection and add a symbol that matches the result.
    geocoder.on('result', function(ev) {
      map.getSource('single-point').setData(ev.result.geometry);
      waypoint_title = $('.mapboxgl-ctrl-geocoder > input').val();
    });


    function popup_btn(e){
      var popup = new mapboxgl.Popup()
        .setLngLat(e.features[0].geometry.coordinates)
        .setHTML('<button id="waypoint_btn" class="btn btn-primary">Add to Waypoints</button>')
        .addTo(map);
      $('#waypoint_btn').one('click', function(){
        add_waypoint(e.features[0].geometry.coordinates);
        var locations = gather_waypoints();
        populate_map(locations);
        popup.remove();
      });

    }
    map.on('click', 'point', popup_btn);

    // adapted from mapbox API example
    // https://www.mapbox.com/mapbox-gl-js/example/drag-a-point/
    // When the cursor enters a feature in the point layer, prepare for dragging.
    map.on('mouseenter', 'point', function() {
        map.getCanvas().style.cursor = 'pointer';
        isCursorOverPoint = true;
        map.dragPan.disable();
    });

    map.on('mouseleave', 'point', function() {
        map.getCanvas().style.cursor = '';
        isCursorOverPoint = false;
        map.dragPan.enable();
    });

    map.on('mousedown', mouseDown);
    map.on('mouseup', onUp);
    ///////////////////////////////


  });

  $('.selectpicker').selectpicker();
  $('#roundtrip').on('changed.bs.select', function(e, clickedIndex, newValue, oldValue){
    if (clickedIndex == '0'){
      $('.oneway').removeClass('oneway');
    } else {
      $('.waypoint').addClass('oneway');
    }
  });

  $('#calc_btn').on('click', function(){
    var locations = gather_waypoints();
    find_path(locations, $('#trans_mode').val(), rt = $('#roundtrip').val() == '1');
  });

  map.once('sourcedata', function(){
    if (map.areTilesLoaded()){
      if (document.readyState === "complete"){
        slide_up();
      } else {
        $(window).one('load', function(){
          slide_up();
        });
      }
    }
  });
});
