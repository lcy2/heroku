var map, pic_data, is_album, lightbox;
var prevID = -1;
var imgHeight = 135;
var mediaMargin = 10;
var is_first = true;
var album_scroll = 0;



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
      var $screener = $('<div class="detail_screen"><h1>' + el.member_ct + '</h1><p>snapshots<br />available</p></div>');
      last_img.append($screener);

      last_img.on('click', function(e){
        if (last_img.hasClass('media_selected')){
          load_pics(pic_items[index].pk);
        } else {
          refresh_info_text(pic_items[index]);
          if (pic_items[index].geo){
            var proj = this.getProjection();
            var pointA = proj.fromLatLngToContainerPixel(geo);
            pointA.y = pointA.y + 150;
            map.panTo(proj.fromContainerPixelToLatLng(pointA));
          }
          $('.media_selected > .detail_screen').hide();
          $('.media_selected').removeClass('media_selected');

          last_img.addClass('media_selected');
          $screener.show();
        }
      });
    } else {
      last_img.on('click', function(){
        if (last_img.hasClass('media_selected')){
          open_lity(index, pic_items);
        } else {
          $('.media_selected').removeClass('media_selected');
          last_img.addClass('media_selected');
          if (pic_items[index].geo){
            map.flyTo({
              center: [
                pic_items[index].geo.lng,
                pic_items[index].geo.lat,
              ],
              offset: [0, -150],
            });
          }
        }


      });
    }

  });
  // map flies to the relevant item when scrolled to

  $('.img_wrapper:first-child').addClass('media_selected');
  if (is_album){
    $('.media_selected > .detail_screen').show();
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
            'pk': el.pk,
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

  if (is_album){
    function lp_wrapper(e){
      load_pics(e.features[0].properties.pk);
      map.off('click', 'points', lp_wrapper);
    }
    map.on('click', 'points', lp_wrapper);
  }

  if (is_first){
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

function center_map(collections){
  var i = 0;
  while (i < collections.length && !collections[i].geo){
    i ++;
  }
  if (i == collections.length){
    map.jumpTo({
      center: [2.3522, 48.8566],
    }).panBy([0, 150]);
  } else {
    map.jumpTo({
      center: [collections[i].geo.lon, collections[i].geo.lat],
    }).panBy([0, 150]);
  }
}

function newDataProcess(data){
  if (data.item_data.length){
    pic_data = data.item_data;
    is_album = data.is_album;

    refresh_info_text(pic_data[0]);

    prevID = -1;
    populate_album(pic_data);
    populate_map(pic_data);
    if (is_first){
      center_map(pic_data);
      is_first = false;
    }
  } else {
    message_log("Populate with some photos first.");
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
      } else {
        $(window).one('load', function(){
          slide_up();
          //map.off('sourcedata');
        });
      }
    }
  });

});
