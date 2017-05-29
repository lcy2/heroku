var map, itemHeights, pic_data, pic_nature;

function populate_album(pic_items){
  var fill_text = '';

  $.each(pic_items, function(index, el){
    fill_text += '<div class="media">';
    fill_text += '<div class="media-left media-top"><img class="media-object" src="' + el.thumbnail + '" /></div>';
    fill_text += '<div class="media-body">';
    fill_text += '<h5 class="media-heading"><strong>' + el.title + '</strong></h5>';
    fill_text += '<div class="time_section">';
    fill_text += '<span class="label label-default">' + (el.time_start ? format_date(el.time_start) : '&nbsp;') + '</span> - ';
    fill_text += '<span class="label label-default">' + (el.time_end ? format_date(el.time_end) : '&nbsp;') + '</span><br />';
    fill_text += '</div>';

    fill_text += '<span class="label label-default geo">@ (' + (el.geo ? (el.geo.lat + ', ' + el.geo.lon) : 'Unknown') + ')</span><br />';

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
}

function populate_map(collections){
  // mapbox coordinates are switched

  var geo_feats = [];
  $.each(collections, function(index, el){
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
      geo_feats.push(geo_pt);
    }
  });

  var new_layer = {
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

  if (map.getLayer('points')){
    map.removeLayer("points");
    map.removeSource("points");
  }
  map.addLayer(new_layer);
}

function newDataProcess(data){
  pic_data = data.album_infos;
  pic_nature = data.pic_nature;
  populate_album(pic_data);
  populate_map(pic_data);
}

function message_log(msg){
  console.log(msg);
}

function edit_title(){
  var target = $(this);
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
      },
      error: function(data){
        message_log(data.message);
      },
      complete: function(data) {
        target.html('<strong>' + child_input.val() + '</strong>');
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

  var date_input = '';
  date_input += '<div class="input-group input-daterange">';
  date_input += '<input type="text" class="form-control input-sm" value="' + target.find("span").first().html() + '" />';
  date_input += '<div class="input-group-addon">-</div>';
  date_input += '<input type="text" class="form-control input-sm" value="' + target.find("span").last().html() + '" />';
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
      console.log(document.activeElement);
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
            message_log(data.message)
          },
          error: function(data){
            message_log(data.message)
          },
          complete: function(data) {
            fill_text = '<span class="label label-default">' + inputs.first().val() + '</span> - ';
            fill_text += '<span class="label label-default">' + inputs.last().val() + '</span><br />';
            target.html(fill_text);
            target.one('click', hack_time);
          }
        });
      }
    }, 500);
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

  });

});
