var vorigin = 5;
var mousedown = false
var gallery_pos = 0;
var gallery = document.getElementsByTagName("img");
var svg_scale = 1;
var dialer_state = -1;
var move_locked = false;
var dialer_fade;

document.body.onmousedown = function(e) {
  if (gallery.length == 1) {
    return;
  }

  mousedown = true;
  var navi = document.getElementsByClassName('navi_indicator')[0];
  var dialer = document.getElementById("dialer");
  var ball_offset = 45;

  navi.style.left = e.clientX - 5 * svg_scale + "px";
  if (gallery_pos == 0) {
    ball_offset = 5;
  } else if (gallery_pos == gallery.length - 1) {
    ball_offset = 85;
  }
  vorigin = e.clientY - ball_offset * svg_scale;
  navi.style.top = vorigin + "px";
  dialer.setAttribute('cy', ball_offset);

  if (dialer_fade.reversed){
    dialer_fade.reverse();
  }
  dialer_fade.play();

}

document.body.onmouseup = function(e){
  if (gallery.length == 1) {
    return;
  }

  if (mousedown){
    var dialer = document.getElementById("dialer");

    if (gallery_pos == 0){
      if (dialer.getAttribute('cy') == 85) {
        gallery_move_down();
      } else {
        move_locked = true;
        anime({
          targets: dialer,
          cy: [Math.max((e.clientY - vorigin ) / svg_scale, 5), 5],
          duration: 100,
          easing: "easeOutQuad",
          complete: function(){
            move_locked = false;
          },
        });
      }

    } else if (gallery_pos == gallery.length - 1) {
      if (dialer.getAttribute('cy') == 5) {
        gallery_move_up();
      } else {
        move_locked = true;
        anime({
          targets: dialer,
          cy: [Math.min((e.clientY - vorigin ) / svg_scale, 85), 85],
          duration: 100,
          easing: "easeOutQuad",
          complete: function(){
            move_locked = false;
          },
        });
      }
    } else {
      if (dialer.getAttribute('cy') == 5) {
        gallery_move_up();
      } else if (dialer.getAttribute('cy') == 85) {
        gallery_move_down();
      } else {
        move_locked = true;
        anime({
          targets: dialer,
          cy: [Math.max(Math.min((e.clientY - vorigin ) / svg_scale, 85), 5), 45],
          duration: 100,
          easing: "easeOutQuad",
          complete: function(){
            move_locked = false;
          },
        });
      }
    }

    mousedown = false;

    if (!dialer_fade.reversed){
      dialer_fade.reverse();
    }
    dialer_fade.play();
  }
}

document.body.onmousemove = function(e) {
  if (gallery.length == 1) {
    return;
  }

  if (mousedown){
    var dialer = document.getElementById("dialer");

    // first deal with the two extrema
    // 1. First item
    if (gallery_pos == 0){
      // if it is past the lower half and it hasn't started animating to the bottom yet....
      if (!move_locked && (e.clientY-vorigin) / svg_scale >= 45 && dialer.getAttribute('cy') < 85){
        move_locked = true;
        anime({
          targets: dialer,
          cy: [(e.clientY - vorigin ) / svg_scale, 85],
          duration: 100,
          easing: "easeOutQuad",
          complete: function(){
            move_locked = false;
          },
        });

      } else if (!move_locked && (e.clientY-vorigin) / svg_scale < 45){
        // or if the cursor is in the upper half but dialer is stuck at the bottom...
        if (dialer.getAttribute('cy') == 85) {
          move_locked = true;
          anime({
            targets: dialer,
            cy: [85, (e.clientY - vorigin ) / svg_scale],
            duration: 100,
            easing: "easeOutQuad",
            complete: function(){
              move_locked = false;
              dialer.setAttribute("cy", ((e.clientY - vorigin) / svg_scale));
            },
          });
        } else {
          dialer.setAttribute("cy", Math.max(5, (e.clientY - vorigin) / svg_scale));
        }
      }




      // 2. last item
    } else if (gallery_pos == gallery.length - 1){
       if (!move_locked && (e.clientY - vorigin) / svg_scale <= 45 && dialer.getAttribute('cy') > 5){
          // if it is past the upper half and it hasn't started animating to the top yet....
          move_locked = true;
          anime({
            targets: dialer,
            cy: [(e.clientY - vorigin ) / svg_scale, 5],
            duration: 100,
            easing: "easeOutQuad",
            complete: function(){
              move_locked = false;
            },
          });

      } else if (!move_locked && (e.clientY-vorigin) / svg_scale > 45){
        // or if the cursor is in the lower half but dialer is stuck at the top...
        if (dialer.getAttribute('cy') == 5) {
          move_locked = true;
          anime({
            targets: dialer,
            cy: [5, (e.clientY - vorigin ) / svg_scale],
            duration: 100,
            easing: "easeOutQuad",
            complete: function(){
              move_locked = false;
              dialer.setAttribute("cy", ((e.clientY - vorigin) / svg_scale));
            },
          });
        } else {
          dialer.setAttribute("cy", Math.min(85, (e.clientY - vorigin) / svg_scale));
        }
      }

    // all other items
    } else {
      // if it's sufficiently far up, snap to the top
      if (!move_locked && (e.clientY - vorigin) / svg_scale <= 30 && dialer.getAttribute('cy') > 5){
         // if it is past the upper half and it hasn't started animating to the top yet....
         move_locked = true;
         anime({
           targets: dialer,
           cy: [(e.clientY - vorigin ) / svg_scale, 5],
           duration: 100,
           easing: "easeOutQuad",
           complete: function(){
             move_locked = false;
           },
         });

        // if it's sufficiently down low, snap to bottom
      } else if (!move_locked && (e.clientY-vorigin) / svg_scale >= 60 && dialer.getAttribute('cy') < 85){
        move_locked = true;
        anime({
          targets: dialer,
          cy: [(e.clientY - vorigin ) / svg_scale, 85],
          duration: 100,
          easing: "easeOutQuad",
          complete: function(){
            move_locked = false;
          },
        });


        // if it's snapped to top, but it's no longer very high up, come back down
        // if it's not that low anymore, raise it back up
      } else if (!move_locked && (e.clientY-vorigin) / svg_scale > 30 && (e.clientY - vorigin) / svg_scale < 60){
         // or if the cursor is in the lower half but dialer is stuck at the top...
         if (dialer.getAttribute('cy') == 5) {
           move_locked = true;
           anime({
             targets: dialer,
             cy: [5, (e.clientY - vorigin ) / svg_scale],
             duration: 100,
             easing: "easeOutQuad",
             complete: function(){
               move_locked = false;
               dialer.setAttribute("cy", ((e.clientY - vorigin) / svg_scale));
             },
           });
         } else if (dialer.getAttribute('cy') == 85) {
           move_locked = true;
           anime({
             targets: dialer,
             cy: [85, (e.clientY - vorigin ) / svg_scale],
             duration: 100,
             easing: "easeOutQuad",
             complete: function(){
               move_locked = false;
               dialer.setAttribute("cy", ((e.clientY - vorigin) / svg_scale));
             },
           });
         } else {
           dialer.setAttribute("cy", Math.max(5, Math.min(85, (e.clientY - vorigin) / svg_scale)));
         }
       }

    }
  }
}


document.body.addEventListener("touchstart", function(e){
  var event = new MouseEvent('mousedown');
  document.body.dispatchEvent(event);
}, true);
document.body.addEventListener("touchend", function(e){
  var event = new MouseEvent('mouseup');
  document.body.dispatchEvent(event);
}, true);
document.addEventListener("touchmove", function(e){
  var event = new MouseEvent('mousemove');
  document.body.dispatchEvent(event);
}, true);

function gallery_move_up(){
  gallery_pos--;
  zenscroll.to(gallery[gallery_pos]);
}

function gallery_move_down(){
  gallery_pos++;
  if (gallery[gallery_pos].style.opacity == 0){
    display_img(gallery_pos);
  }
  zenscroll.to(gallery[gallery_pos]);
}

function display_img(index = 0){
  // draw out the image contours
  anime({
    targets: document.getElementsByTagName('svg')[index].getElementsByClassName('path'),
    strokeDashoffset: {
      value: [anime.setDashoffset, 0],
      duration: 1500,
      delay: function(el, i){
        return i * 100 + 500;
      },
      easing: "linear",
    },
    opacity: {
      value: 1,
      duration: 100,
      delay: 500,
      easing: "easeOutCubic",
    }
  })


  // display the image
  anime({
    targets: document.getElementsByTagName('img')[index],
    opacity: 1,
    delay: 2000,
    duration: 750,
    easing: "easeInSine",
  });

  // fade out the image contours
  anime({
    targets: document.getElementsByTagName('svg')[index],
    opacity: 0,
    duration: 500,
    delay: 3000,
    easing: "easeInQuad",
  });

  // slide in the title
  anime({
    targets: document.getElementsByClassName('title')[index],
    opacity: 0.8,
    left: "10%",
    delay: 1000,
    duration: 400,
    easing: "easeOutCubic",
  });
}

window.onload = function(){
  // get the scale of the svg
  var navi = document.getElementsByClassName('navi_indicator')[0];
  svg_scale = navi.offsetHeight / navi.getElementsByTagName('svg')[0].getAttribute('viewBox').split(" ")[3];

  zenscroll.setup(500, 0);
  zenscroll.toY(0);
  display_img();

  dialer_fade = anime({
    targets: navi,
    opacity: [0,  0.8],
    duration: 500,
    easing: "easeOutQuad",
    autoplay: false,
  });

  var anchors = document.getElementsByTagName('a');
  for (var i = 0, item; item = anchors[i]; i ++){
    item.onmousedown = function(e){
      e.stopPropagation();
      return false;
    }
  }
}
