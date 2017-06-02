var map, pic_data, is_album;

function populate_album(pic_items){
  var fill_text = '';

  $.each(pic_items, function(index, el){
    fill_text += '<div class="media">';
    fill_text += '<div class="media-left media-top"><img class="media-object" src="' + el.thumbnail + '" /></div>';
    fill_text += '<div class="media-body">';
    fill_text += '<h5 class="media-heading"><strong>' + el.title + '</strong></h5>';
    fill_text += '<div class="time_section">';

    if (is_album){
      fill_text += '<span class="label label-default">' + (el.time_start ? format_date(el.time_start) : '&nbsp;') + '</span> - ';
      fill_text += '<span class="label label-default">' + (el.time_end ? format_date(el.time_end) : '&nbsp;') + '</span><br />';
    } else {
      fill_text +='<span class="label label-default">' + (el.time ? format_date(el.time) : '&nbsp;') + '</span>';
    }
    fill_text += '</div>';
    fill_text += '</div></div>';
  });
  $('#thumb_list').html(fill_text);

  // map flies to the relevant item when scrolled to
  $('#thumb_list').scroll(function(){
    var itemID = Math.floor(Math.round($(this).scrollTop() / ($(this).prop("scrollHeight") - $(this).height()) * $(this).prop("scrollHeight")) / (imgHeight + mediaMargin));
    if (pic_data[itemID].geo){
      map.flyTo({
        center: [
          pic_data[itemID].geo.lon,
          pic_data[itemID].geo.lat,
        ]
      });
    }
  });

  $('.media').each(function(index, el){
    el.data('item_index', index);
    el.data('pk', pic_data[index].pk);
    if (is_album){
      el.on('click', function(){
        map.flyTo({
          center: [
            pic_data[index].geo.lon,
            pic_data[index].geo.lat,
          ]
        });
      });
      el.find('img.media-object').on('click', lp_wrapper(pic_data[index].pk));
    } else {
      el.find('img.media-object').on('click', function(){
        if (pic_data[index].geo){
          map.flyTo({
            center: [
              pic_data[index].geo.lon,
              pic_data[index].geo.lat,
            ]
          });
        }
      });
    }
  });

}

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
          "text-field": "{title}",
          "text-font": ["Open Sans Semibold", "Arial Unicode MS Bold"],
          "text-offset": [0, 0.6],
          "text-anchor": "top",
      },
      "paint": {
        "text-color" : "#ffffff",
      }
  };
  /*

  var geo_line = $.map(collections, function(el, index){
    if (el.geo){
      return [[el.geo.lon, el.geo.lat]];
    }
    return null;
  });
  var line_layer = {
        "id": "route",
        "type": "line",
        "source": {
            "type": "geojson",
            "data": {
                "type": "Feature",
                "properties": {},
                "geometry": {
                    "type": "LineString",
                    "coordinates": geo_line,
                }
            }
        },
        "layout": {
            "line-join": "round",
            "line-cap": "round"
        },
        "paint": {
            "line-color": "#888",
            "line-width": 3,
            "line-dasharray": [5, 3],
        }
    };
  */
  if (map.getLayer('points')){
    map.removeLayer("points");
    map.removeSource("points");
  }
  /*
  if (map.getLayer('route')){
    map.removeLayer('route');
    map.removeSource('route');
  }
  */
  map.addLayer(point_layer);
}

//centers the map to 1st item (upon initialization)
function center_map(collections){
  var i = 0;
  while (i < collections.length && !collections[i].geo){
    i ++;
  }
  if (i == collections.length){
    map.flyTo({
      center: [ // fly to Paris if no coordinates are found
        2.3522,
        48.8566,
      ],
      zoom: 13,
    });
  } else {
    map.flyTo({
      center: [
        collections[i].geo.lon,
        collections[i].geo.lat,
      ],
      zoom: 13,
    })
  }
}

function newDataProcess(data){
  pic_data = data.item_data;
  is_album = data.is_album;
  populate_album(pic_data);
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

  mapboxgl.accessToken = 'pk.eyJ1IjoibGljaGFuZ3lpODg4IiwiYSI6ImNqMzJiMW14cDAwMDAzM3MzZ3djcmt4N3QifQ.XknNEOZ93pNGqvU_2oOv5Q';
  map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/mapbox/dark-v9',
    zoom: 13,
  });

  $("#rtfg").one("click", rtfgClick);

  map.on('load', function(){
    load_albums();
  });

});
