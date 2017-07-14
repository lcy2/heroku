var gmapStyle = [
  {
    "elementType": "geometry",
    "stylers": [
      {
        "color": "#1d2c4d"
      }
    ]
  },
  {
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#8ec3b9"
      }
    ]
  },
  {
    "elementType": "labels.text.stroke",
    "stylers": [
      {
        "color": "#1a3646"
      }
    ]
  },
  {
    "featureType": "administrative.country",
    "elementType": "geometry.stroke",
    "stylers": [
      {
        "color": "#4b6878"
      }
    ]
  },
  {
    "featureType": "administrative.land_parcel",
    "elementType": "labels",
    "stylers": [
      {
        "visibility": "off"
      }
    ]
  },
  {
    "featureType": "administrative.land_parcel",
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#64779e"
      }
    ]
  },
  {
    "featureType": "administrative.province",
    "elementType": "geometry.stroke",
    "stylers": [
      {
        "color": "#4b6878"
      }
    ]
  },
  {
    "featureType": "landscape.man_made",
    "elementType": "geometry.stroke",
    "stylers": [
      {
        "color": "#334e87"
      }
    ]
  },
  {
    "featureType": "landscape.natural",
    "elementType": "geometry",
    "stylers": [
      {
        "color": "#023e58"
      }
    ]
  },
  {
    "featureType": "poi",
    "elementType": "geometry",
    "stylers": [
      {
        "color": "#283d6a"
      }
    ]
  },
  {
    "featureType": "poi",
    "elementType": "labels.text",
    "stylers": [
      {
        "visibility": "off"
      }
    ]
  },
  {
    "featureType": "poi",
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#6f9ba5"
      }
    ]
  },
  {
    "featureType": "poi",
    "elementType": "labels.text.stroke",
    "stylers": [
      {
        "color": "#1d2c4d"
      }
    ]
  },
  {
    "featureType": "poi.park",
    "elementType": "geometry.fill",
    "stylers": [
      {
        "color": "#023e58"
      }
    ]
  },
  {
    "featureType": "poi.park",
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#3C7680"
      }
    ]
  },
  {
    "featureType": "road",
    "elementType": "geometry",
    "stylers": [
      {
        "color": "#304a7d"
      }
    ]
  },
  {
    "featureType": "road",
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#98a5be"
      }
    ]
  },
  {
    "featureType": "road",
    "elementType": "labels.text.stroke",
    "stylers": [
      {
        "color": "#1d2c4d"
      }
    ]
  },
  {
    "featureType": "road.highway",
    "elementType": "geometry",
    "stylers": [
      {
        "color": "#2c6675"
      }
    ]
  },
  {
    "featureType": "road.highway",
    "elementType": "geometry.stroke",
    "stylers": [
      {
        "color": "#255763"
      }
    ]
  },
  {
    "featureType": "road.highway",
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#b0d5ce"
      }
    ]
  },
  {
    "featureType": "road.highway",
    "elementType": "labels.text.stroke",
    "stylers": [
      {
        "color": "#023e58"
      }
    ]
  },
  {
    "featureType": "road.local",
    "elementType": "labels",
    "stylers": [
      {
        "visibility": "off"
      }
    ]
  },
  {
    "featureType": "transit",
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#98a5be"
      }
    ]
  },
  {
    "featureType": "transit",
    "elementType": "labels.text.stroke",
    "stylers": [
      {
        "color": "#1d2c4d"
      }
    ]
  },
  {
    "featureType": "transit.line",
    "elementType": "geometry.fill",
    "stylers": [
      {
        "color": "#283d6a"
      }
    ]
  },
  {
    "featureType": "transit.station",
    "elementType": "geometry",
    "stylers": [
      {
        "color": "#3a4762"
      }
    ]
  },
  {
    "featureType": "water",
    "elementType": "geometry",
    "stylers": [
      {
        "color": "#0e1626"
      }
    ]
  },
  {
    "featureType": "water",
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#4e6d70"
      }
    ]
  }
];
var map, itemHeights, pic_data, is_album, seg_pk, edit_actions, bullseye, geocoder, old_content, colors;
var timeoutLimit = 500;
var imgHeight = 135;
var mediaMargin = 15;
var geo_lock = false;
var album_scroll = 0;
var is_first = true;
var markers = [];

// TODO: NEED to refactor the map control codes to make things simpler / more managable
function get_color_steps(start, end, steps){
  var start_nums = $.map([start.slice(1,3), start.slice(3,5), start.slice(5,7)], function(el, index){
    return parseInt(el, 16);
  });
  var end_nums = $.map([end.slice(1,3), end.slice(3,5), end.slice(5,7)], function(el, index){
    return parseInt(el, 16);
  });
  var step_height = [];
  var output = []

  if (steps == 1){
    return [start];
  }

  for (var i = 0; i < 3; i ++){
    step_height.push((end_nums[i] - start_nums[i]) / (steps - 1));
  }
  for (var i = 0; i < steps; i ++){
    output.push('#' + $.map(start_nums, function(el, index){

      return ('000' + (Math.round(el + step_height[index] * i)).toString(16)).slice(-2);
    }).join(''));
  }
  return output;
}

function isNumeric(n) {
  return !isNaN(parseFloat(n)) && isFinite(n);
}

function populate_album(pic_items){
  var fill_text = '';

  $.each(pic_items, function(index, el){
    fill_text += '<div class="container-fluid"><div class="row spacey_row"><div class="col-xs-12">'
    fill_text += '<div class="media">';
    fill_text += '<div class="media-left media-top"><img class="media-object thumbnail_img" src="' + el.thumbnail + '" /></div>';
    fill_text += '<div class="media-body">';
    fill_text += '<h5 class="media-heading"><strong>' + el.title + '</strong></h5>';
    fill_text += '<div class="time_section">';

    if (is_album){
      fill_text += '<span class="label label-default">' + (el.time_start ? format_date(el.time_start) : '&nbsp;') + '</span> - ';
      fill_text += '<span class="label label-default">' + (el.time_end ? format_date(el.time_end) : '&nbsp;') + '</span>';
    } else {
      fill_text +='<span class="label label-default">' + (el.time ? format_date(el.time) : '&nbsp;') + '</span>';
    }
    fill_text += '</div>';

    fill_text += '<div class="geo_section">';
    fill_text += '<span class="label label-default">' + (el.geo ? (el.geo.lat.toFixed(5) + ', ' + el.geo.lng.toFixed(5)) : 'Unknown') + '</span>';
    fill_text += '</div>';

    fill_text += '<div class="delete_media"><small><span class="glyphicon glyphicon-trash"></span></small></div>';
    if (!is_album){
      fill_text += '<div class="set_cover"><small><span class="glyphicon glyphicon-picture"></span></small></div>';
    }
    fill_text += '<div class="geo_confirm"><button class="btn btn-default btn-xs">Confirm</button></div>'

    fill_text += '</div></div></div></div></div>';
  });
  $('#thumb_list').html(fill_text);

  var marker_id = 0;
  $('#thumb_list .media').each(function(index, el){
    var $parent = $(this);
    $parent.data('item_index', index);
    $parent.data('pk', pic_items[index].pk);
    if (pic_items[index].geo){
      $parent.data('marker', markers[marker_id]);
      marker_id ++;
    }
    if (is_album){
      $parent.find('img.media-object').on('click', function(e){
        if ($parent.hasClass('media_selected')){
          load_pics(pic_items[index].pk);
          if ($parent.data('marker')){
            google.maps.event.trigger($parent.data('marker'), 'mouseout');
          }
        } else {
          $('.media_selected').removeClass('media_selected');
          $parent.addClass('media_selected');
          if (pic_items[index].geo){
            map.panTo($parent.data('marker').getPosition());
          }
        }
      });
    } else {
      $(this).find('img.media-object').on('click', function(){
        if (pic_items[index].geo){
          map.panTo($parent.data('marker').getPosition());
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
  $('.geo_confirm button').on('click', submit_location);
}

function add_marker(el, color){
  var waypoint_icon = {
    path: "M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z",
    fillColor: color,
    fillOpacity: .8,
    anchor: new google.maps.Point(12, 24),
    scale: 1.5,
    labelOrigin: new google.maps.Point(12, 11),
    strokeColor: '#AAAAAA',
    strokeWeight: 2,
  }
  var waypoint_marker = new google.maps.Marker({
    position:el.geo,
    map: map,
    icon: waypoint_icon,
    zIndex: 1,
  });

  var boxtext = '<div class="media"><div class="media-left"><img class="media-object" src="' + el.thumbnail + '" /></div><div class="media-body"><div class="media-heading"><h5>' + el.title + '</h5></div></div></div>';
  var infobox = new SnazzyInfoWindow({
    marker: waypoint_marker,
    placement: 'bottom',
    content: boxtext,
    showCloseButton: false,
    padding: '0',
    backgroundColor: 'rgba(50, 50, 50, 0.8)',
    border: true,
    borderRadius: '5px',
    shadow: false,
    fontColor: '#000',
    fontSize: '15px',
    closeWhenOthersOpen: true,
  });
  waypoint_marker.addListener('mouseover', function(){
    infobox.open();
  });

  waypoint_marker.addListener('mouseout', function(){
    infobox.close();
  });

  if (is_album){
    google.maps.event.addListener(waypoint_marker, 'click', function(){
      infobox.close()
      load_pics(el.pk);
    });
  }
  markers.push(waypoint_marker);
}


function populate_map(collections){
  if (markers){
    $.each(markers, function(index, el){
      el.setMap(null);
    });
  }
  markers = [];
  colors = get_color_steps('#3CA55C', '#90893a', collections.length);

  $.each(collections, function(index, el){
    if (el.geo){
      add_marker(el, colors[index]);
    }
  });
}

//centers the map to 1st item (upon initialization)
function center_map(collections){
  for (var i = 0; i< collections.length; i++){
    if (collections[i].geo){
      map.setCenter(collections[i].geo);
      return;
    }
  }
}

function newDataProcess(data){
  pic_data = data.item_data;
  is_album = data.is_album;
  populate_map(pic_data);
  populate_album(pic_data);
  if (is_first){
    center_map(pic_data);
    is_first = false;
  }

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
      message_log(response.message, response.warning_level);
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
        message_log(response.message, response.warning_level);
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


function refresh_after_deletion(){
  $('.media').each(function(index, el){
    var $parent = $(this);
    $parent.data('item_index', index);
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
        target.data('marker').setMap(null);
        target.remove();
        refresh_after_deletion();
      },
      error: function(xhr, err){
        var response = $.parseJSON(xhr.responseText);
        message_log(response.message, response.warning_level);
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
    target.data('marker').setMap(null);
    target.remove();
    refresh_after_deletion();
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
            fill_text += '<span class="label label-default">' + inputs.last().val() + '</span>';
            target.html(fill_text);
          },
          error: function(xhr, err){
            var response = $.parseJSON(xhr.responseText);
            message_log(response.message, response.warning_level);
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

function submit_location(){
  // submit location to the database
  var target = $(this).closest('.media');
  var child_input = target.find('input');
  var latlon = child_input.val().split(', ');

  // refresh the map
  var new_position = {
    'lat': parseFloat(latlon[0]),
    'lng': parseFloat(latlon[1]),
  };
  if (is_album){
    $.ajax({
      url: '/splitter/gateway/picedits',
      type: 'POST',
      data: {
        'pk': target.data('pk'),
        'target': 'geo',
        'content': child_input.val(),
      },
      dataType: 'json',
      success: function(data){
        message_log(data.message, 'success');
        pic_data[target.data('item_index')].geo = new_position;
        if (target.data('marker')){
          target.data('marker').setPosition(new_position);
        } else {
          add_marker(pic_data[target.data('item_index')], colors[target.data('item_index')]);
        }
        target.find('.geo_section').html('<span class="label label-default">' + new_position.lat.toFixed(5) + ', ' + new_position.lng.toFixed(5) + '</span>');
      },
      error: function(xhr, err){
        var response = $.parseJSON(xhr.responseText);
        message_log(response.message, response.warning_level);
        target.find('.geo_section').html(old_content);
      },
      complete: function(data) {

        remove_geo_suite();
        target.find('.geo_confirm').hide();
        target.find('.geo_section').one('click', edit_geo);
        geo_lock = false;

      }
    });
  } else {
    edit_actions.push({
      'type': 'edit',
      'item_id': target.data('pk'),
      'target': 'loc',
      'content': new_position,
    })
    remove_geo_suite();
    target.find('.geo_section').html('<span class="label label-default">' + new_position.lat.toFixed(5) + ', ' + new_position.lng.toFixed(5) + '</span>');
    target.find('.geo_confirm').hide();
    target.find('.geo_section').one('click', edit_pic_geo);
    pic_data[target.data('item_index')].geo = new_position;
    if (target.data('marker')){
      target.data('marker').setPosition(new_position);
    } else {
      add_marker(pic_data[target.data('item_index')], colors[target.data('item_index')]);
    }
    geo_lock = false;
  }
}

function add_geo_suite(ci, loc = map.getCenter()){
  // add a geocoder to the map
  $('#content_panel > div:first').append('<input type="text" id="searchTextField" class="form-control"></input>');
  var searchBox = new google.maps.places.SearchBox($('#searchTextField')[0], {});
  searchBox.addListener('places_changed', function(){
    var places = searchBox.getPlaces();
    if (places.length == 0){
      return;
    }
    bullseye.setPosition(places[0].geometry.location);
    map.setCenter(places[0].geometry.location);
    ci.val(bullseye.getPosition().lat() + ", " + bullseye.getPosition().lng());
  });
  bullseye.addListener('dragend', function(){
    geocoder.geocode({'location': bullseye.getPosition()}, function(results, status){
      if (status === 'OK'){
        if (results[1]){
          //message_log(results[0].formatted_address);
          $('#searchTextField').val(results[0].formatted_address);
        } else {
          message_log("No results found.");
        }
      } else {
        message_log("Geocoder failed due to: " + status, 'warning');
      }
    });
    ci.val(bullseye.getPosition().lat() + ", " + bullseye.getPosition().lng());
  });

  bullseye.setMap(map);
  bullseye.setPosition(loc);
  map.setCenter(loc);
}

function remove_geo_suite(){
  bullseye.setMap(null);
  $('#searchTextField').remove();
}

function edit_geo(){
  if (!geo_lock){
    var target = $(this);
    var default_content = target.find('span').html();

    old_content = target.html();

    geo_lock = true;

    target.html('<input class="input-sm form-control" type="text" value="" />');
    var child_input = target.find('input');
    target.closest('.media').find('.geo_confirm').show();
    //console.log(target.closest('.media').find('.geo_confirm'));

    if (default_content == "Unknown"){
      add_geo_suite(child_input);
    } else {
      child_input.val(default_content);
      // there's already a latlng, fly to it
      var latlon = $.map(default_content.split(', '), function(el, index){
        return parseFloat(el);
      });
      var center = {
        'lng': latlon[1],
        'lat': latlon[0],
      }
      add_geo_suite(child_input, center);

      map.panTo(center);
    }

  } else {
    $('div.geo_section').one('click', edit_geo);
  }

}

function edit_pic_geo(){
  if (!geo_lock){
    geo_lock = true;
    var target = $(this);
    old_content = target.html();
    var default_content = target.find('span').html();
    target.html('<input class="input-sm form-control" type="text" value="" />');
    var child_input = target.find('input');
    target.closest('.media').find('.geo_confirm').show();

    if (default_content == "Unknown"){
      add_geo_suite(child_input);
    } else {
      child_input.val(default_content);
      // there's already a latlon, fly to it
      var latlon = $.map(default_content.split(', '), function(el, index){
        return parseFloat(el);
      });
      var center = {
        'lng': latlon[1],
        'lat': latlon[0],
      }
      add_geo_suite(child_input, center);

      map.panTo(center);
    }
  } else {
    $('div.geo_section').one('click', edit_pic_geo);
  }
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
      $('#thumb_list').scrollTop(album_scroll);
    },
    error: function(xhr, err){
      var response = $.parseJSON(xhr.responseText);
      message_log(response.message, response.warning_level);
    },
    error: function(xhr, err){
      var response = $.parseJSON(xhr.responseText);
      message_log(response.message, response.warning_level);
    }
  });
}


function load_pics(pk){
  album_scroll = $('#thumb_list').scrollTop();
  $('#thumb_list').scrollTop(0);
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
            message_log(response.message, response.warning_level);
          },
        });
      });
    },
    error: function(xhr, err){
      var response = $.parseJSON(xhr.responseText);
      message_log(response.message, response.warning_level);
      load_albums();
    },
  });
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
        message_log(response.message, response.warning_level);
        $('[data-lity-close]').trigger('click');
        if (response.action){
          window.location.replace(response.action);
        }
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
          } else {
            load_albums();
          }
          $('#back_to_album').remove();
        },
        error: function(xhr, err){
          var response = $.parseJSON(xhr.responseText);
          message_log(response.message, response.warning_level);
          $('[data-lity-close]').trigger('click');
        },
      });
    } else if (refresh_list.length) {
      ajax_call(0);
      $('#back_to_album').remove();
    } else {
      message_log("No item is slated to change.");
    }
    $('#cancel_lity').trigger('click');
  } else {
    $('#refresh').one('click', rtfgClick);
  }


}

function initMap(){
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
  map = new google.maps.Map($('#map')[0], {
    center: {lng: 2.3522, lat: 48.8566},
    zoom: 13,
    disableDefaultUI: true,
    scaleControl: true,
    zoomControl: true,
    styles: gmapStyle,
  });
  // add the crosshair marker
  var target_icon = {
    path: "M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm8.94 3c-.46-4.17-3.77-7.48-7.94-7.94V1h-2v2.06C6.83 3.52 3.52 6.83 3.06 11H1v2h2.06c.46 4.17 3.77 7.48 7.94 7.94V23h2v-2.06c4.17-.46 7.48-3.77 7.94-7.94H23v-2h-2.06zM12 19c-3.87 0-7-3.13-7-7s3.13-7 7-7 7 3.13 7 7-3.13 7-7 7z",
    fillColor: '#FFFFFF',
    fillOpacity: .8,
    strokeWeight: 0,
    anchor: new google.maps.Point(12, 12),
    scale: 1,
  }

  geocoder = new google.maps.Geocoder;
  // set up the crosshair marker
  bullseye = new google.maps.Marker({
    position:map.getCenter(),
    draggable: true,
    icon: target_icon,
    zIndex: 2,
  });

  google.maps.event.addListener(map, 'idle', function(){
    slide_up();
  });
  load_albums();
}


$(document).ready(function(){

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
        message_log(response.message, response.warning_level);
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
});
