var map, pic_data, infowindow;
var markers = [];


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

function populate_map(collections){
  var bounds = new google.maps.LatLngBounds();
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
        strokeColor: '#AAAAAA',
        strokeWeight: 2,
      }
      var waypoint_marker = new google.maps.Marker({
        position:el.geo,
        map: map,
        icon: waypoint_icon,
        zIndex: 1,
      });
      bounds.extend(el.geo);

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

      waypoint_marker.addListener('click', function(){
        infobox.open();
      })


      markers.push(waypoint_marker);
    }

  });
  map.fitBounds(bounds, 0);
}

function newDataProcess(data){
  pic_data = data.item_data;
  populate_map(pic_data);
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
    },
    error: function(xhr, err){
      var response = $.parseJSON(xhr.responseText);
      message_log(response.message, response.warning_level);
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

  load_albums();
});
