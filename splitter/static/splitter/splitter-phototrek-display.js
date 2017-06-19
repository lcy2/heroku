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
var map, pic_data, is_album, lightbox;
var imgHeight = 135;
var mediaMargin = 10;
var is_first = true;
var album_scroll = 0;
var markers = [];
var album_id = 0;

function get_color_steps(start, end, steps){
  var start_nums = $.map([start.slice(1,3), start.slice(3,5), start.slice(5,7)], function(el, index){
    return parseInt(el, 16);
  });
  var end_nums = $.map([end.slice(1,3), end.slice(3,5), end.slice(5,7)], function(el, index){
    return parseInt(el, 16);
  });
  var step_height = [];
  var output = []

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
  var marker_id = 0;
  $.each(pic_items, function(index, el){
    var last_img = $('<div class="img_wrapper"><img src="' + el.thumbnail + '" /></div>');
    $('#thumb_list').append(last_img);
    last_img.data('item_index', index);
    last_img.data('pk', el.pk);
    if (pic_items[index].geo){
      last_img.data('marker', markers[marker_id]);
      marker_id ++;
    }

    if (is_album){
      var $screener = $('<div class="detail_screen"><h1>' + el.member_ct + '</h1><p>snapshots<br />available</p></div>');
      last_img.append($screener);

      last_img.on('click', function(e){
        if (last_img.hasClass('media_selected')){
          album_id = index;
          load_pics(pic_items[index].pk);
        } else {
          refresh_info_text(pic_items[index]);
          if (pic_items[index].geo){
            map.panTo(last_img.data('marker').getPosition());
            map.panBy(0, 150);
          }

          $('.media_selected > .detail_screen').hide();
          $('.media_selected').removeClass('media_selected');

          last_img.addClass('media_selected');
          $screener.show();

          google.maps.event.trigger(last_img.data('marker'), 'mouseover');
        }
      });
    } else {
      last_img.on('click', function(){
        if (last_img.hasClass('media_selected')){
          open_lity(index, pic_items);
        } else {
          $('.media_selected').removeClass('media_selected');
          last_img.addClass('media_selected');
          refresh_info_text(pic_items[index]);

          if (pic_items[index].geo){
            map.panTo(last_img.data('marker').getPosition());
            map.panBy(0, 150);
            google.maps.event.trigger(last_img.data('marker'), 'mouseover');
          }
        }

      });
    }
  });


  if (is_album){
    $('.media_selected > .detail_screen').show();
    $('.img_wrapper:nth-child(' + (album_id + 1) + ')').addClass('media_selected');
    google.maps.event.trigger($('.img_wrapper:nth-child(' + (album_id + 1) + ')').data('marker'), 'mouseover');
  } else {
    $('.img_wrapper:first-child').addClass('media_selected');
    if ($('.img_wrapper:first-child').data('marker')){
      google.maps.event.trigger($('.img_wrapper:first-child').data('marker'), 'mouseover');
    }
  }



  $('#thumb_list').on('mousewheel', function(e) {
    var target_element = $(this)[0];
    target_element.scrollLeft -= (e.deltaY * 25);
  });
}

function open_lity(index, pic_items){
  lity(pic_items[index].src);
  // add the two arrows
  var $left_arrow = $('<div class="lity_arrows" id="left_arrow"><span class="glyphicon glyphicon-chevron-left"></span></div>');
  var $right_arrow = $('<div class="lity_arrows" id="right_arrow"><span class="glyphicon glyphicon-chevron-right"></span></div>');
  $('.lity').append($left_arrow);
  $('.lity').append($right_arrow);

  function go_left(){
    index = (index - 1 + pic_items.length) % pic_items.length;
    $('.lity-content > img').attr('src', pic_items[index].src);
    $('.media_selected').removeClass('media_selected');
    $('.img_wrapper:eq(' + index + ')').addClass('media_selected');
  }

  function go_right(){
    index = (index + 1) % pic_items.length;
    $('.lity-content > img').attr('src', pic_items[index].src);
    $('.media_selected').removeClass('media_selected');
    $('.img_wrapper:eq(' + index + ')').addClass('media_selected');
  }


  $left_arrow.on('click', go_left);
  $right_arrow.on('click', go_right);
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
  fill_text += '<span class="label label-default">' + (pic_item.geo ? (pic_item.geo.lat.toFixed(5) + ', ' + pic_item.geo.lng.toFixed(5)) : 'Unknown') + '</span><br />';
  fill_text += '</div>';

  $('#pic_info').html(fill_text);
}

function populate_map(collections){
  for (var i = 0; i< markers.length; i++){
    google.maps.event.trigger(markers[i], 'mouseout');
    markers[i].setMap(null);
  }
  markers = [];

  var colors = get_color_steps('#3CA55C', '#90893a', collections.length);

  $.each(collections, function(index, el){
    if (el.geo){
      var waypoint_icon = {
        path: "M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z",
        fillColor: colors[index],
        fillOpacity: .8,
        anchor: new google.maps.Point(12, 24),
        scale: 1.5,
        labelOrigin: new google.maps.Point(12, 11),
        strokeColor: '#FFFFFF',
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


      waypoint_marker.pk = el.pk;
      if (is_album){
        google.maps.event.addListener(waypoint_marker, 'click', function(){
          load_pics(this.pk);
          album_id = index;
        });
      } else {
        google.maps.event.addListener(waypoint_marker, 'click', function(){
          open_lity(index, collections);
        })
      }
      markers.push(waypoint_marker);
    }

  });

}

function center_map(collections){
  for (var i = 0; i< collections.length; i++){
    if (collections[i].geo){
      map.setCenter(collections[i].geo);
      map.panBy(0, 150);
      return;
    }
  }
}

function newDataProcess(data){
  if (data.item_data.length){
    pic_data = data.item_data;
    is_album = data.is_album;

    refresh_info_text(pic_data[0]);

    populate_map(pic_data);
    populate_album(pic_data);
    if (is_first){
      center_map(pic_data);
      is_first = false;
    }
  } else {
    message_log("Populate with some photos first.");
  }
}


function load_albums(){

  $.ajax({
    url: '/splitter/gateway/rafd',
    type: 'POST',
    data: {},
    dataType: 'json',
    success: function (data) {
      newDataProcess(data);
      $('#thumb_list').scrollLeft(album_scroll);
    },
    error: function(xhr, err){
      var response = $.parseJSON(xhr.responseText);
      message_log(response.message, response.warning_level);
    }
  });
}

function load_pics(pk){
  album_scroll = $('#thumb_list').scrollLeft();
  $('#thumb_list').scrollLeft(0);
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
    },
    error: function(xhr, err){
      var response = $.parseJSON(xhr.responseText);
      message_log(response.message, response.warning_level);
    }
  });
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
    zoomControlOptions: {
      position: google.maps.ControlPosition.TOP_RIGHT,
    },
    styles: gmapStyle,
  });


  google.maps.event.addListener(map, 'idle', function(){
    slide_up();
  });
  load_albums();
}
