var locations = [{"lng":11.871578,"lat":45.4111855},
{"lng":-3.1885736,"lat":55.9500836},
{"lng":8.6805672,"lat":49.4115775},
{"lng":5.5379805,"lat":43.2155069},
{"lng":8.7064438,"lat":49.4235566},
{"lng":12.3350836,"lat":45.4330086},
{"lng":-1.9839813,"lat":43.3228413},
{"lng":-2.9482411,"lat":43.2625005},
{"lng":-2.6517716,"lat":42.8576513},
{"lng":12.5928886,"lat":55.6855041},
{"lng":8.7140436,"lat":49.4096536},
{"lng":8.8086477,"lat":53.0731363},
{"lng":6.7715697,"lat":52.9732925},
{"lng":12.3503113,"lat":45.4345361},
{"lng":4.8839827,"lat":52.3591688},
{"lng":6.5690213,"lat":53.2192297},
{"lng":8.3079022,"lat":47.0528241},
{"lng":6.5672005,"lat":53.2431227},
{"lng":9.6840861,"lat":44.1351708},
{"lng":3.225795,"lat":51.2051727},
{"lng":3.7206205,"lat":51.0550188},
{"lng":4.3524158,"lat":50.8467797},
{"lng":9.1741586,"lat":44.3161572},
{"lng":7.3603833,"lat":46.2369391},
{"lng":8.9336186,"lat":44.4071275},
{"lng":9.188958,"lat":45.4644536},
{"lng":-2.7756475,"lat":43.4415827},
{"lng":7.4498988,"lat":46.9480461},
{"lng":8.0723005,"lat":46.4082836},
{"lng":-5.9919075238,"lat":37.3862203642},
{"lng":-2.674055,"lat":42.8459488},
{"lng":-4.7803238,"lat":37.8768627},
{"lng":-5.99334,"lat":37.3914},
{"lng":-3.5902591,"lat":37.1809175},
{"lng":-5.34657,"lat":36.13609},
{"lng":12.5725902,"lat":55.6779566},
{"lng":10.7539225,"lat":59.9014097},
{"lng":6.188665,"lat":58.9862733},
{"lng":5.7323727,"lat":58.9698652},
{"lng":5.322915,"lat":60.3972605},
{"lng":14.4057911,"lat":50.0882861},
{"lng":7.1905052,"lat":60.9104794},
{"lng":10.7288191,"lat":59.9083188},
{"lng":7.3634166,"lat":46.23253},
{"lng":11.0970588,"lat":60.19491},
{"lng":13.7360872,"lat":51.0546463},
{"lng":16.4397397,"lat":48.1512083},
{"lng":-3.1997322,"lat":55.9482041},
{"lng":14.4132152,"lat":50.0862036},
{"lng":2.2359472,"lat":48.8928408},
{"lng":2.3139325,"lat":48.8627394},
{"lng":2.3979438,"lat":48.8629247},
{"lng":-0.1266027,"lat":51.500788},
{"lng":-0.0880561,"lat":51.5060883},
{"lng":14.2919755,"lat":50.8754794},
{"lng":16.3669822,"lat":48.2075477},
{"lng":16.3692319,"lat":48.2028416},
{"lng":16.3147552,"lat":48.18656},
{"lng":7.3635502,"lat":46.2287002},
{"lng":12.3204088,"lat":45.4409969},
{"lng":11.875345,"lat":45.4067705},
{"lng":8.6286752,"lat":46.6491408},
{"lng":7.9077166,"lat":46.5658988},
{"lng":6.1428322,"lat":46.2118341},
{"lng":5.3734258,"lat":43.2962275},
{"lng":5.5100894,"lat":43.2035883},
{"lng":-2.6750091,"lat":42.847005},
{"lng":-2.1384261,"lat":42.8921349},
{"lng":2.5120702,"lat":39.6862747},
{"lng":2.1525752,"lat":41.4139938},
{"lng":2.16857804976,"lat":41.3751939499},
{"lng":3.1441877,"lat":39.3259719},
{"lng":-0.3493336,"lat":39.4541627},
{"lng":-0.3754061,"lat":39.4764958},
{"lng":2.39566,"lat":48.84176},
{"lng":8.67619340645,"lat":49.4281599089},
{"lng":2.40227451856,"lat":48.8515273291},
{"lng":1.3723658361,"lat":47.3114685702},
{"lng":2.17562989204,"lat":41.4034057466}];

var access_token = 'pk.eyJ1IjoibGljaGFuZ3lpODg4IiwiYSI6ImNqMzJiMW14cDAwMDAzM3MzZ3djcmt4N3QifQ.XknNEOZ93pNGqvU_2oOv5Q';

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
        "title": index,
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
          'text-field': "{title}",
          "text-font": ["Open Sans Semibold", "Arial Unicode MS Bold"],
          "text-offset": [0, 0.6],
          "text-anchor": "top",
      },
      "paint": {
        "text-color" : "#ffffff",
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
    console.log(el);
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
      message_log(data.code);
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
      message_log(data.code);
      draw_line(data.trips[0].geometry.coordinates);
    },
    error: function(xhr, err){
      var response = $.parseJSON(xhr.responseText);
      message_log(response.message, 'warning');
    },
    complete: function(){
    }
  });
}

function add_waypoint(lnglat){
  var $waypoint = $('<div class="waypoint"><span>' + $('.mapboxgl-ctrl-geocoder > input').val() + '</span><span class="label label-default">' + lnglat.reverse().join(', ') + '</span></div>');
  $('#output_panel').append($waypoint);
  $('.mapboxgl-ctrl-geocoder > input').val('');
}

function gather_waypoints(){
  if ($('.waypoint').length <= 2){
    message_log("Too few waypoints selected.", "info");
    return null;
  }
  if ($('.waypoint').length > 12){
    message_log("Too many waypoints selected. Please keep it under 12 per API limits.", "info");
    return null;
  }

  var locations = $('.waypoint').map(function(index, el){
    return [$(el).find('span.label').html().split(', ').reverse()];
  });
  return locations;
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

  map.on('load', function(){

    map.addSource('single-point', {
    "type": "geojson",
    "data": {
        "type": "FeatureCollection",
        "features": []
        }
    });

    map.addLayer({
        "id": "point",
        "source": "single-point",
        "type": "circle",
        "paint": {
            "circle-radius": 10,
            "circle-color": "#007cbf"
        }
    });

    // Listen for the `geocoder.input` event that is triggered when a user
    // makes a selection and add a symbol that matches the result.
    geocoder.on('result', function(ev) {
      map.getSource('single-point').setData(ev.result.geometry);
    });

    function popup_btn(e){
      var popup = new mapboxgl.Popup()
        .setLngLat(e.features[0].geometry.coordinates)
        .setHTML('<button id="waypoint_btn" class="btn btn-primary">Add to Waypoints</button>')
        .addTo(map);
      $('#waypoint_btn').one('click', function(){
        add_waypoint(e.features[0].geometry.coordinates);
        popup.remove();
      })
    }
    map.on('click', 'point', popup_btn);


    map.on('mouseenter', 'point', function () {
        map.getCanvas().style.cursor = 'pointer';
    });

    // Change it back to a pointer when it leaves.
    map.on('mouseleave', 'point', function () {
        map.getCanvas().style.cursor = '';
    });

  });

  $('#calc_rt').on('click', function(){
    var locations = gather_waypoints();
    find_path(locations, 'driving');
    populate_map(locations);
  });

  $('#calc_ow').on('click', function(){
    var locations = gather_waypoints();
    find_path(locations, 'driving', rt=false);
    populate_map(locations);
  });

  //find_path(locations.slice(0, 12), 'driving')
  //populate_map(locations.slice(0, 12));
});
