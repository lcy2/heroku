var map, itemHeights, pic_data, is_album, seg_pk, edit_actions;
var timeoutLimit = 500;
var imgHeight = 135;
var mediaMargin = 15;

function isNumeric(n) {
  return !isNaN(parseFloat(n)) && isFinite(n);
}


function populate_album(pic_items){
  var fill_text = '';

  $.each(pic_items, function(index, el){
    fill_text += '<div class="media">';
    fill_text += '<div class="media-left media-top"><img class="media-object thumbnail_img" src="' + el.thumbnail + '" /></div>';
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

    fill_text += '<div class="delete_media"><small><span class="glyphicon glyphicon-trash"></span></small></div>';
    if (!is_album){
      fill_text += '<div class="set_cover"><small><span class="glyphicon glyphicon-picture"></span></small></div>';
    }

    fill_text += '</div></div>';
  });
  $('#thumb_list').html(fill_text);

  // map flies to the relevant item when scrolled to
  $('#thumb_list').off('scroll');
  $('#thumb_list').on('scroll', function(){
    var itemID = Math.floor($(this).scrollTop() / (($(this).prop("scrollHeight") - $(this).height()) / (pic_items.length - 0.0001)));
    if (itemID && pic_items[itemID].geo){
      map.flyTo({
        center: [
          pic_items[itemID].geo.lon,
          pic_items[itemID].geo.lat,
        ]
      });
    }
  });

  $('.media').each(function(index, el){
    $(this).data('item_index', index);
    $(this).data('pk', pic_items[index].pk);
    if (is_album){
      $(this).find('img.media-object').on('click', lp_wrapper(pic_items[index].pk));
    } else {
      $(this).find('img.media-object').on('click', function(){
        if (pic_items[index].geo){
          map.flyTo({
            center: [
              pic_items[index].geo.lon,
              pic_items[index].geo.lat,
            ]
          });
        }
      });
    }
  });


  $('.media').hover(function(){
    $(this).find('div.delete_media').show();
    $(this).find('div.set_cover').show();
  }, function(){
    $(this).find('div.set_cover').hide();
    $(this).find('div.delete_media').hide();
  });

  // functions allowing for click-to-edit
  // replace info on click to allow for edits
  if (is_album){
    $('div.media .media-heading').one('click', edit_title);
    $('div.time_section').one('click', hack_time);
    $('div.geo_section').one('click', edit_geo);
    $('div.delete_media').on('click', del_med);

  } else {
    $('div.media .media-heading').one('click', edit_pic_title);
    $('div.time_section').one('click', hack_pic_time);
    $('div.geo_section').one('click', edit_pic_geo);
    $('div.delete_media').on('click', del_pic_med);
    $('div.set_cover').on('click', set_cover);

  }
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
            "pk": el.pk,
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
  if (map.getLayer('points')){
    map.removeLayer("points");
    map.removeSource("points");
  }
  map.addLayer(point_layer);

  if (is_album){
    map.on('click', 'points', function (e) {
      lp_wrapper(e.features[0].properties.pk)();
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
}

//centers the map to 1st item (upon initialization)
function center_map(collections){
  var i = 0;
  while (i < collections.length && !collections[i].geo){
    i ++;
  }
  if (i == collections.length){
    if (is_album){
      map.flyTo({
        center: [ // fly to Paris if no coordinates are found
          2.3522,
          48.8566,
        ],
        zoom: 13,
      });
    }
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

function message_log(msg){
  console.log(msg);
}

function set_cover(){
  var target = $(this);
  $.ajax({
    url: '/splitter/gateway/setcover',
    type: 'POST',
    data: {
      'item_id': target.closest('.media').data('pk'),
      'pk': seg_pk,
    },
    dataType: 'json',
    success: function(data){
      message_log(data.message);
    },
    error: function(xhr, err){
      var response = $.parseJSON(xhr.responseText);
      message_log(response.message);
    }
  });
}

function edit_title(){
  var target = $(this);
  var old_content = target.html();
  target.html('<input type="text" value="' + target.children().html() + '" />');
  var child_input = target.find('input');
  child_input.focus();
  child_input.on('focusout', function(){
    $.ajax({
      url: '/splitter/gateway/picedits',
      type: 'POST',
      data: {
        'pk': target.closest('.media').data('pk'),
        'target': 'title',
        'content': child_input.val(),
      },
      dataType: 'json',
      success: function(data){
        message_log(data.message);
        target.html('<strong>' + child_input.val() + '</strong>');
      },
      error: function(xhr, err){
        var response = $.parseJSON(xhr.responseText);
        message_log(response.message);
        target.html(old_content);
      },
      complete: function(data) {
        target.one('click', edit_title);
      }
    });
  });
}

function edit_pic_title(){
  var target = $(this);
  target.html('<input type="text" value="' + target.children().html() + '" />');
  var child_input = target.find('input');
  child_input.focus();
  child_input.on('focusout', function(){
    target.one('click', edit_pic_title);
    edit_actions.push({
      'type': 'edit',
      'item_id': target.closest('.media').data('pk'),
      'target': 'title',
      'content': child_input.val(),
    });
    target.html('<strong>' + child_input.val() + '</strong>');
  });
}

function del_med(){
  var target = $(this).closest('.media');
  if (confirm("Delete this item?")){
    $.ajax({
      url: '/splitter/gateway/picdel',
      type: 'POST',
      data: {
        'pk': target.data('pk'),
      },
      dataType: 'json',
      success: function(data){
        message_log(data.message);
        pic_data.splice(target.data('item_index'), 1);
        populate_album(pic_data);
        populate_map(pic_data);
      },
      error: function(xhr, err){
        var response = $.parseJSON(xhr.responseText);
        message_log(response.message);
      },
    });
  }

}
function del_pic_med(){
  var target = $(this).closest('.media');
  if (confirm("Delete this item?")){
    edit_actions.push({
      'type': 'delete',
      'item_id': target.data('pk'),
    });
    pic_data.splice(target.data('item_index'), 1);
    populate_album(pic_data);
    populate_map(pic_data);
  }
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
          type: "POST",
          data: {
            'pk': target.closest('.media').data('pk'),
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
          error: function(xhr, err){
            var response = $.parseJSON(xhr.responseText);
            message_log(response.message);
            target.html(total_old_content);
          },
          complete: function(data) {

            target.one('click', hack_time);
          }
        });
      }
    }, timeoutLimit);
  });
}

function hack_pic_time(){
  var target = $(this);
  var old_content = target.find("span").html();

  target.html('<input type="text" class="form-control input-sm" value="' + old_content + '" />');

  var child_input = target.find('input');
  child_input.datepicker({
    format: "yyyy/mm/dd"
  });
  child_input.focus();

  child_input.on('focusout', function(){
    setTimeout(function(){
      if (!child_input.is(":focus")){
        target.one('click', hack_pic_time);
        target.html('<span class="label label-default">' + child_input.val() + '</span>');
        edit_actions.push({
          'type': 'edit',
          'item_id': target.closest('.media').data('pk'),
          'target': 'timestamp',
          'content': new Date(child_input.val().replace('/', '-')).getTime() / 1000,
        });
      }
    }, timeoutLimit);
  });
}


function update_geo_field(ci, lngLat){
  ci.val(lngLat.lat + ", " + lngLat.lng);
  ci.focus();
}

function i_wrapper(ci){
  // initialize the map marker etc.
  function initialize(e){
    // add a marker to where I clicked
    var bullseye = {
      "type": "Point",
      "coordinates": [e.lngLat.lng, e.lngLat.lat],
    }
    if (map.getLayer('bullseye')){
      map.removeLayer("bullseye");
      map.removeSource("bullseye");
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
    update_geo_field(ci, e.lngLat);
    // replace the click listener after the first click
    map.on('click', mm_wrapper(ci));
  }
  return initialize;
}

function mm_wrapper(ci){
  function move_marker(e){
    var bullseye = {
      "type": "Point",
      "coordinates": [e.lngLat.lng, e.lngLat.lat],
    }
    map.getSource('bullseye').setData(bullseye);
    update_geo_field(ci, e.lngLat);
  }
  return move_marker;
}
function removeMapListeners(){
  $.each(map._listeners.click.filter(function(entry){
    return entry.name === "move_marker";
  }), function(i, el){
    map.off('click', el);
  });
  if (map._oneTimeListeners){
    $.each(map._oneTimeListeners.click.filter(function(entry){
      return entry.name === "move_marker";
    }), function(i, el){
      map.off('click', el);
    });
  }
}
function edit_geo(){
  var target = $(this);
  var old_content = target.html();
  var default_content = target.find('span').html();

  target.html('<input class="input-sm form-control" type="text" value="" />');
  var child_input = target.find('input');

  if (default_content == "Unknown"){
    child_input.val("");
    map.once('click', i_wrapper(child_input));
  } else {
    child_input.val(default_content);
    // there's already a latlon, fly to it
    var latlon = $.map(default_content.split(', '), function(el, index){
      return parseFloat(el);
    });
    var e = {
      'lngLat': {
        'lng': latlon[1],
        'lat': latlon[0],
      }
    }
    i_wrapper(child_input)(e);

    map.flyTo({
      center: latlon.reverse(),
      zoom: 13,
    });
  }
  child_input.focus();

  $('body').on('focusout', function(){
    setTimeout(function(){
      if (!child_input.is(":focus") && !$('.mapboxgl-canvas').is(":focus")){
        // submit location to the database
        $.ajax({
          url: '/splitter/gateway/picedits',
          type: 'POST',
          data: {
            'pk': target.closest('.media').data('pk'),
            'target': 'geo',
            'content': child_input.val(),
          },
          dataType: 'json',
          success: function(data){
            message_log(data.message);
            var latlon = $.map(child_input.val().split(', '), function(el, index){
              return parseFloat(el).toFixed(5);
            });
            target.html('<span class="label label-default">' + latlon.join(', ') + '</span><br />');

            // refresh the map
            pic_data[target.closest('.media').data('item_index')].geo = {
              'lat': latlon[0],
              'lon': latlon[1],
            };
            populate_map(pic_data);
          },
          error: function(xhr, err){
            var response = $.parseJSON(xhr.responseText);
            message_log(response.message);
            target.html(old_content);
          },
          complete: function(data) {
            if (map.getLayer('bullseye')){
              // get rid of the tiny marker
              map.removeLayer("bullseye");
              map.removeSource("bullseye");
            }

            target.one('click', edit_geo);
            target.removeClass("flex_div");
            $('body').off('focusout');
            removeMapListeners();

          }
        });
      }
    }, timeoutLimit);
  });
}

function edit_pic_geo(){
  var target = $(this);
  var old_content = target.html();
  var default_content = target.find('span').html();

  target.html('<input class="input-sm form-control" type="text" value="" />');
  var child_input = target.find('input');

  if (default_content == "Unknown"){
    child_input.val("");
    map.once('click', i_wrapper(child_input));
  } else {
    child_input.val(default_content);
    // there's already a latlon, fly to it
    var latlon = $.map(default_content.split(', '), function(el, index){
      return parseFloat(el);
    });
    var e = {
      'lngLat': {
        'lng': latlon[1],
        'lat': latlon[0],
      }
    }
    i_wrapper(child_input)(e);

    map.flyTo({
      center: latlon.reverse(),
      zoom: 13,
    });
  }
  child_input.focus();

  $('body').on('focusout', function(){
    setTimeout(function(){
      if (!child_input.is(":focus") && !$('.mapboxgl-canvas').is(":focus")){
        var latlon = child_input.val().split(', ');

        // validate it's actually a pair of floats
        if (latlon.length == 2 && latlon.every(isNumeric)){

          var geo = {
            'lat': parseFloat(latlon[0]),
            'lon': parseFloat(latlon[1]),
          }

          edit_actions.push({
            'type': 'edit',
            'item_id': target.closest('.media').data('pk'),
            'target': 'loc',
            'content': geo,
          });


          target.html('<span class="label label-default">' + geo.lat.toFixed(5) + ', ' + geo.lon.toFixed(5) + '</span><br />');

          // refresh the map
          pic_data[target.closest('.media').data('item_index')].geo = geo;
          populate_map(pic_data);
        } else {
          target.html(old_content);
          message_log('Invalid content');
        }

        if (map.getLayer('bullseye')){
          // get rid of the tiny marker
          map.removeLayer("bullseye");
          map.removeSource("bullseye");
        }

        target.one('click', edit_pic_geo);
        target.removeClass("flex_div");
        $('body').off('focusout');
        // unbind all the click event listeners
        removeMapListeners();
      }
    }, timeoutLimit);
  });
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
        var ba_button = $('<span id="back_to_album" class="pull-right text-right"><button class="btn btn-primary" type="button">Back to Albums</button></span>');
        $('#btn_col').append(ba_button);
        ba_button.on('click', function(){
          // save current results
          $.ajax({
            url: '/splitter/gateway/picedits',
            type: 'POST',
            data: {
              'pk': seg_pk,
              'target': 'json',
              'content': JSON.stringify(edit_actions),
            },
            dataType: 'json',
            success: function(data){
              message_log(data.message);
              // clear actions
              edit_actions = [];

              // going back to album list
              load_albums();

              // remove button
              $('#back_to_album').remove();
            },
            error: function(xhr, err){
              var response = $.parseJSON(xhr.responseText);
              message_log(response.message);
            },
          });
        });
      },
      error: function(xhr, err){
        var response = $.parseJSON(xhr.responseText);
        message_log(response.message);
        load_albums();
      },
    });
  }
  return load_pics;
}

function rtfgClick(e){
  // populate the database
  function ajax_call(start){
    $.ajax({
      url: '/splitter/gateway/rtfg',
      type: 'POST',
      data: {
        'album_ids': refresh_list.slice(start, start + 10),
      },
      dataType: 'json',
      success: function(data){
        message_log(data.message);
        if (refresh_list.length > start + 10){
          return ajax_call(start + 10);
        } else {
          load_albums();
        }
      },
      error: function(xhr, err){
        var response = $.parseJSON(xhr.responseText);
        message_log(response.message);
        $('[data-lity-close]').trigger('click');
      },
    });
  }

  // sends a list of albums with albumid and save_state
  var refresh_list = [];
  var del_list = [];
  $('#preview_list > *').each(function(index, el){
    var target = el;
    switch ($(this).data('album_save_state')){
      case 0:
        if ($(this).data('pk')){
          del_list.push($(this).data('pk'));
        }
        refresh_list.push($(this).data('albumid'));
        break;
      case 1:
        del_list.push($(this).data('pk'));
        break;
    }
  });

  if (confirm("This action might modify / delete current records in this trip. Continue?")){
    // first delete everything in the del queue
    if (del_list.length){
      console.log(del_list);
      $.ajax({
        url: '/splitter/gateway/picdel',
        type: 'POST',
        data: {
          'pk': del_list,
        },
        dataType: 'json',
        success: function(data){
          message_log(data.message);
          if (refresh_list.length){
            ajax_call(0);
          }
        },
        error: function(xhr, err){
          var response = $.parseJSON(xhr.responseText);
          message_log(response.message);
          $('[data-lity-close]').trigger('click');
        },
      });
    } else if (refresh_list.length) {
      ajax_call(0);

    } else {
      message_log("No item is slated to change.");
    }
    $('#cancel_lity').trigger('click');
  } else {
    $('#refresh').one('click', rtfgClick);
  }


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
  // Add zoom and rotation controls to the map.
  map.addControl(new mapboxgl.NavigationControl());



  $('#cancel_lity').on('click', function(){
    $('[data-lity-close]').trigger('click');
    $('#rtfg').blur();
  })
  $('#rtfg').on('click', function(){
    $.ajax({
      url: '/splitter/gateway/gpio',
      type: 'POST',
      dataType: 'json',
      error: function(xhr, err){
        var response = $.parseJSON(xhr.responseText);
        message_log(response.message);
        if (response.action){
          window.location.replace(response.action);
        }
      },
      success: function (data) {
        $('#preview_list').empty();
        $.each(data.data, function(index, el){

          // populate the preview list
          var $album = $('<div class="col-sm-3"><div class="thumbnail"><div class="img_grad"><img class="thumbnail_img" src="'
            + el.thumbnail + '" /></div><div class="tick_mark"></div><div class="caption"><strong>' + el.title + '</strong></div></div></div>');
          $album.data('albumid', el.albumid);
          var album_thumb = $album.find('.thumbnail');
          var $tick = $('<span class="glyphicon"></span>');
          $album.find('.tick_mark').append($tick);
          $('#preview_list').append($album);
          if (el.db_pk){
            $album.data('pk', el.db_pk);
            $tick.addClass('glyphicon-ok-sign');
            $album.data('album_save_state', 2);
            album_thumb.addClass('thumb_indb');
            album_thumb.find('.caption').addClass('thumb_active_font');
            $album.on('click', function(){
              var save_state = ($album.data('album_save_state') + 1) % 3;
              $album.data('album_save_state', save_state);
              switch (save_state){
                case 0:
                  album_thumb.addClass("thumb_indb_refresh").removeClass("thumb_indb");
                  $tick.addClass('glyphicon-refresh').removeClass('glyphicon-ok-sign');
                  break;
                case 1:
                  album_thumb.addClass("thumb_indb_del").removeClass("thumb_indb_refresh");
                  $tick.removeClass('glyphicon-refresh').addClass('glyphicon-remove-sign');
                  break;
                case 2:
                  album_thumb.addClass("thumb_indb").removeClass("thumb_indb_del");
                  $tick.removeClass('glyphicon-remove-sign').addClass('glyphicon-ok-sign');
                  break;
              }
            });
          } else {
            $album.data('album_save_state', -1);
            $album.on('click', function(){
              var save_state = ($album.data('album_save_state') -1) % 2;
              $album.data('album_save_state', save_state);
              album_thumb.toggleClass("thumb_to_add");
              album_thumb.find('.caption').toggleClass('thumb_active_font');
              $tick.toggleClass('glyphicon-plus-sign');
            });
          }


        });
        $('#refresh').html('Refresh Selections');
        $('#refresh').off('click').one('click', rtfgClick);
      }

    });


  });

  map.on('load', function(){
    load_albums();
  });

});
