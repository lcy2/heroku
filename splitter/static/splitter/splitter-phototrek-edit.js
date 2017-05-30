var map, itemHeights, pic_data, is_album;
var timeoutLimit = 500;


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

    fill_text += '<div class="geo_section">';
    fill_text += '<span class="label label-default">' + (el.geo ? (el.geo.lat.toFixed(5) + ', ' + el.geo.lon.toFixed(5)) : 'Unknown') + '</span><br />';
    fill_text += '</div>';
    fill_text += '</div></div>';
  });
  $('#thumb_list').html(fill_text);

  $('.media').each(function(index, el){
    $(this).data('item_index', index);
    $(this).data('pk', pic_data[index].pk);
  });

  // find the position cutoffs
  var pos = new Array(pic_items.length - 1);
  for (var i = 0; i < pos.length; i++){
    pos[i] = (160 + 15) * (i + 1);
  }

  // replace info on click to allow for edits
  $('div.media .media-heading').one('click', edit_title);
  $('div.time_section').one('click', hack_time);
  $('div.geo_section').one('click', edit_geo);

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

function newDataProcess(data){
  pic_data = data.album_infos;
  is_album = data.is_album;
  populate_album(pic_data);
  populate_map(pic_data);
}

function message_log(msg){
  console.log(msg);
}

function edit_title(){
  var target = $(this);
  var old_content = target.html();
  target.html('<input type="text" value="' + target.children().html() + '" />');
  var child_input = target.find('input');
  child_input.focus();
  child_input.on('focusout', function(){
    //console.log($(this).closest('.media').data('pk'));
    $.ajax({
      url: '/splitter/gateway/picedits',
      data: {
        'pk': target.closest('.media').data('pk'),
        'type': 'seg',
        'target': 'title',
        'content': child_input.val(),
      },
      dataType: 'json',
      success: function(data){
        message_log(data.message);
        target.html('<strong>' + child_input.val() + '</strong>');
      },
      error: function(data){
        message_log(data.message);
        target.html(old_content);
      },
      complete: function(data) {
        target.one('click', edit_title);
      }
    });
  });
}

function format_date(timestamp){
  var formattedDate = new Date(timestamp * 1000);
  var output = [
    formattedDate.getFullYear(),
    (formattedDate.getMonth() + 1) >= 10 ? (formattedDate.getMonth() + 1) : '0' + (formattedDate.getMonth() + 1),
    formattedDate.getDate() >= 10 ? formattedDate.getDate() : '0' + formattedDate.getDate(),
  ];
  return output.join('/');
}

function hack_time(){
  var target = $(this);
  var total_old_content = target.html();
  var old_content = target.find("span").map(function(){
    return $(this).html();
  });

  var date_input = '';
  date_input += '<div class="input-group input-daterange">';
  date_input += '<input type="text" class="form-control input-sm" value="' + old_content[0] + '" />';
  date_input += '<div class="input-group-addon">-</div>';
  date_input += '<input type="text" class="form-control input-sm" value="' + old_content[1] + '" />';
  date_input += '</div>';

  target.html(date_input);


  var child_input = target.find('div.input-daterange');
  var inputs = child_input.find('input')
  child_input.datepicker({
    format: "yyyy/mm/dd"
  });
  inputs.first().focus();

  child_input.on('focusout', function(){
    setTimeout(function(){
      if (child_input.has(document.activeElement).length == 0){

        $.ajax({
          url: '/splitter/gateway/picedits',
          data: {
            'pk': target.closest('.media').data('pk'),
            'type': 'seg',
            'target': 'time',
            'content': inputs.map(function(){
              return $(this).val();
            }).get(),
          },
          dataType: 'json',
          success: function(data){
            message_log(data.message);
            var fill_text = '<span class="label label-default">' + inputs.first().val() + '</span> - ';
            fill_text += '<span class="label label-default">' + inputs.last().val() + '</span><br />';
            target.html(fill_text);
          },
          error: function(data){
            target.html(total_old_content);
            message_log(data.message);
          },
          complete: function(data) {

            target.one('click', hack_time);
          }
        });
      }
    }, timeoutLimit);
  });
}

function edit_geo(){
  var target = $(this);
  var old_content = target.html();
  var default_content = target.find('span').html();

  target.html('<input class="input-sm form-control" type="text" value="" />');
  var child_input = target.find('input');

  function update_geo_field(lngLat){
    child_input.val(lngLat.lat + ", " + lngLat.lng);
    child_input.focus();

  }

  // initialize the map marker etc.
  function initialize(e){
    // add a marker to where I clicked
    var bullseye = {
      "type": "Point",
      "coordinates": [e.lngLat.lng, e.lngLat.lat],
    }
    map.addSource('bullseye', {type: 'geojson', data: bullseye});
    map.addLayer({
      "id": "bullseye",
      "type": "symbol",
      "source": "bullseye",
      "layout": {
          "icon-image": "circle-stroked-15",
      }
    });
    update_geo_field(e.lngLat);
    // replace the click listener after the first click
    map.on('click', move_marker);
  }

  function move_marker(e){
    var bullseye = {
      "type": "Point",
      "coordinates": [e.lngLat.lng, e.lngLat.lat],
    }
    map.getSource('bullseye').setData(bullseye);
    update_geo_field(e.lngLat);
  }


  if (default_content == "Unknown"){
    child_input.val("");
    map.once('click', initialize);
  } else {
    child_input.val(default_content);
    // there's already a latlon, fly to it
    var latlon = $.map(default_content.split(', '), function(el, index){
      return $.trim(el);
    });
    var e = {
      'lngLat': {
        'lng': latlon[1],
        'lat': latlon[0],
      }
    }
    initialize(e);

    map.flyTo({
      center: latlon.reverse(),
      zoom: 13,
    });
  }

  $('body').on('focusout', function(){
    setTimeout(function(){
      if (!child_input.is(":focus") && !$('.mapboxgl-canvas').is(":focus")){
        // get rid of the tiny marker
        map.removeLayer("bullseye");
        map.removeSource("bullseye");

        // submit location to the database
        $.ajax({
          url: '/splitter/gateway/picedits',
          data: {
            'pk': target.closest('.media').data('pk'),
            'type': 'seg',
            'target': 'geo',
            'content': child_input.val(),
          },
          dataType: 'json',
          success: function(data){
            message_log(data.message);
            var latlon = $.map(child_input.val().split(', '), function(el, index){
              return $.trim(el);
            });
            target.html('<span class="label label-default">' + child_input.val().toFixed(5) + '</span><br />');

            // refresh the map
            pic_data[target.closest('.media').data('item_index')].geo = {
              'lat': latlon[0],
              'lon': latlon[1],
            };
            populate_map(pic_data);
          },
          error: function(data){
            message_log(data.message);
            target.html(old_content);
          },
          complete: function(data) {
            target.one('click', edit_geo);
            target.removeClass("flex_div");
            $('body').off('focusout');
            map.off('click', move_marker);
          }
        });
      }
    }, timeoutLimit);
  });












  child_input.focus();
  /*
  child_input.on('focusout', function(){
    //console.log($(this).closest('.media').data('pk'));
    $.ajax({
      url: '/splitter/gateway/picedits',
      data: {
        'pk': target.closest('.media').data('pk'),
        'type': 'seg',
        'target': 'geo',
        'content': child_input.val(),
      },
      dataType: 'json',
      success: function(data){
        message_log(data.message);
        target.html('<span class="label label-default">@ ()</span><br />');
      },
      error: function(data){
        message_log(data.message);
        target.html(old_content);
      },
      complete: function(data) {
        target.one('click', edit_geo);
        target.removeClass("flex_div");
      }
    });
  });
  */
}

function load_albums(){
  $.ajax({
    url: '/splitter/gateway/rafd',
    data: {},
    dataType: 'json',
    success: function (data) {
      newDataProcess(data);

      // center the map
      var i = 0;
      while (!pic_data[i].geo && i < pic_data.length){
        i ++;
      }
      if (i == pic_data.length){
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
            pic_data[i].geo.lon,
            pic_data[i].geo.lat,
          ],
          zoom: 13,
        })
      }


      $('#thumb_list').scroll(function(){
        var itemID = Math.floor(Math.round($(this).scrollTop() / ($(this).prop("scrollHeight") - $(this).height()) * $(this).prop("scrollHeight")) / 175);
        if (pic_data[itemID].geo){
          map.flyTo({
            center: [
              pic_data[itemID].geo.lon,
              pic_data[itemID].geo.lat,
            ]

          });
        }

      });

    }
  });
}

function rtfgClick(e){
  var target = $(this);
  target.html("Please Wait");

  $.ajax({
    url: '/splitter/gateway/rtfg',
    data: {},
    dataType: 'json',
    success: function (data) {
      newDataProcess(data);
    },
    complete: function() {
      target.html("Refresh");
      target.one('click', rtfgClick);
    }
  });
}


$(document).ready(function(){

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
