var map, pic_data, is_album;
var prevID = -1;
var imgHeight = 135;
var mediaMargin = 10;

function format_date(timestamp){
  var formattedDate = new Date(timestamp * 1000);
  var output = [
    formattedDate.getFullYear(),
    (formattedDate.getMonth() + 1) >= 10 ? (formattedDate.getMonth() + 1) : '0' + (formattedDate.getMonth() + 1),
    formattedDate.getDate() >= 10 ? formattedDate.getDate() : '0' + formattedDate.getDate(),
  ];
  return output.join('/');
}

function populate_album(pic_items){
  $('#thumb_list').empty();

  $.each(pic_items, function(index, el){
    var last_img = $('<div class="img_wrapper"><img src="' + el.thumbnail + '" /></div>');
    $('#thumb_list').append(last_img);
    last_img.data('item_index', index);
    last_img.data('pk', el.pk);

    if (is_album){
      last_img.on('click', lp_wrapper(pic_items[index].pk));
    } else {
      last_img.on('click', function(){
        if (pic_items[index].geo){
          map.flyTo({
            center: [
              pic_items[index].geo.lon,
              pic_items[index].geo.lat,
            ]
          });
        }
        lity(pic_items[index].src);

      });
    }
    /*
    fill_text += '<div class="media-body">';
    fill_text += '<h5 class="media-heading"><strong>' + el.title + '</strong></h5>';

    if (is_album){
      fill_text += '<span class="label label-default">' + (el.time_start ? format_date(el.time_start) : '&nbsp;') + '</span> - ';
      fill_text += '<span class="label label-default">' + (el.time_end ? format_date(el.time_end) : '&nbsp;') + '</span><br />';
    } else {
      fill_text +='<span class="label label-default">' + (el.time ? format_date(el.time) : '&nbsp;') + '</span>';
    }
    fill_text += '</div>';
    fill_text += '</div></div>';
    */
  });
  // map flies to the relevant item when scrolled to

  $('#thumb_list').on('mousewheel', function(e) {
    var target_element = $(this)[0];

    target_element.scrollLeft -= (e.deltaY * 25);

  });

  $('#thumb_list').on('scroll', function(){
    var itemID = Math.floor($(this).scrollLeft() / (($(this).prop("scrollWidth") - $(this).width()) / (pic_items.length - 0.0001)));
    //var itemID = Math.floor(Math.round($(this).scrollLeft() / ($(this).prop("scrollWidth") - $(this).width()) * $(this).prop("scrollWidth")) / (imgHeight + mediaMargin));

    if (pic_items[itemID].geo){
      map.flyTo({
        center: [
          pic_items[itemID].geo.lon,
          pic_items[itemID].geo.lat,
        ]
      });

      if (itemID != prevID){
        refresh_info_text(pic_items[itemID]);
      }
    }
    prevID = itemID;
  })

}

function refresh_info_text(pic_item){
  var fill_text = '<h5 class="media-heading"><strong>' + pic_item.title + '</strong></h5>';
  fill_text += '<div class="time_section">';
  if (is_album){
    fill_text += '<span class="label label-default">' + (pic_item.time_start ? format_date(pic_item.time_start) : '&nbsp;') + '</span> - ';
    fill_text += '<span class="label label-default">' + (pic_item.time_end ? format_date(pic_item.time_end) : '&nbsp;') + '</span><br />';
  } else {
    fill_text +='<span class="label label-default">' + (pic_item.time ? format_date(pic_item.time) : '&nbsp;') + '</span>';
  }
  fill_text += '</div>';

  fill_text += '<div class="geo_section">';
  fill_text += '<span class="label label-default">' + (pic_item.geo ? (pic_item.geo.lat.toFixed(5) + ', ' + pic_item.geo.lon.toFixed(5)) : 'Unknown') + '</span><br />';
  fill_text += '</div>';
  $('#pic_info').html(fill_text);
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
  refresh_info_text(pic_data[0]);
  prevID = -1;
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
function lp_wrapper(pk){
  function load_pics(){
    $.ajax({
      url: '/splitter/gateway/rpfd',
      type: 'POST',
      data: {
        'thumbsize': imgHeight,
        'seg_pk': pk,
      },
      dataType: 'json',
      success: function (data) {
        seg_pk = data.seg_pk;
        edit_actions = [];
        newDataProcess(data);

        var ba_button = $('<div id="back_to_album" class="pull-right text-right"><button class="btn btn-primary" type="button">Back to Albums</button></div>');
        $('#info_panel').append(ba_button);
        ba_button.css({bottom: '-50px', opacity: 0});
        ba_button.animate({
            'bottom': 0,
            'opacity': 1,
        }, 250);

        ba_button.on('click', function(){
          load_albums();
          ba_button.animate({
              'bottom': '-50px',
              'opacity': 0,
          }, 250, function(){
            $('#back_to_album').remove();
          });
        });
      }
    });
  }
  return load_pics;
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


});
