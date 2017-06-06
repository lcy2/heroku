from django.http import JsonResponse
from django.shortcuts import render, redirect
from django.utils.dateformat import format
from django.core.validators import URLValidator
from django.core.exceptions import ValidationError
from django.contrib import messages
from django.urls import reverse

from datetime import date, datetime

from .models import Segment, Trip, Traveler
from .decorators import check_trip_access_json, check_trip_access

import requests, time, re, pytz, sys, json

from lxml import objectify
from urllib import urlencode




# from https://github.com/morganwahl/photos-db/blob/master/photosdb/photosdb/views.py
def _picasa_feed(google, add_url = '', **query):
    """'google' is a GoogleOAuth2 UserSocialAuth instance."""

    # check whether the token needs refreshing
    if (google.extra_data['auth_time'] + google.extra_data['expires'] - 10) <= int(time.time()):
        from social_django.utils import load_strategy
        strategy = load_strategy()
        try:
            google.refresh_token(strategy = strategy)
        except requests.HTTPError as e:
            return '<error><code>' + str(e.response.status_code) + '</code><reason>' + unicode(e.response.reason) + '</reason></error>'

    extra_headers = {
        'GData-Version': '2',
        'Authorization': 'Bearer {}'.format(google.extra_data['access_token'])
    }
    url_base = 'https://picasaweb.google.com/data/feed/api/user/default'
    url = url_base + add_url
    if query:
        url += '?' + urlencode(query)
    response = requests.get(url, headers=extra_headers)
    return re.sub(r'\sxmlns=["\'][^"\']+["\']', '', response.content, count=1)

@check_trip_access_json(True)
def get_preview_info_only(request, trip):
    """ return all albums from Google"""
    try:
        social = request.user.social_auth.get(provider='google-oauth2')
    except social_auth.DoesNotExist:
        return JsonResponse({'message':  'You do not have linked social accounts.'}, status = 401)
    xml = _picasa_feed(social, kind='album', prettyprint='true')
    feed = objectify.fromstring(xml)

    if feed.tag == "error":
        if feed.code.text == "400":
            return JsonResponse({
                'message': 'Please log in again.',
                'action': reverse('login'),
            }, status = 400);
    if not feed.find('entry'):
        return JsonResponse({
            'message': 'No albums found in your Google Photos.',
            'action': reverse('splitter:phototrek_edit', kwargs={'pk' : trip.pk}),
        }, status = 404);


    # get all the segments currently in the database
    albums_in_db = {x.segment_album : x.pk for x in trip.segment_set.all()}


    album_infos = [{
        'title': unicode(el.title),
        'albumid': el.id.text.split('/')[-1],
        'thumbnail': el.find('media:group/media:thumbnail', feed.nsmap).get('url'),
        'db_pk': albums_in_db.get(el.id.text.split('/')[-1], None)
    } for el in feed.entry]

    #print '\n'.join([x['albumid'] for x in album_infos])

    # filter out the hangouts
    album_infos = filter(lambda x: not x['title'].startswith('Hangout'), album_infos)
    # filter out Auto Backup
    excludes = set(['Auto Backup', 'Profile Photos'])
    album_infos = filter(lambda x: not x['title'] in excludes, album_infos)

    return JsonResponse({
        'data': album_infos,
    })

@check_trip_access_json(True)
def refresh_trek_from_google(request, trip):
    try:
        social = request.user.social_auth.get(provider='google-oauth2')
    except social_auth.DoesNotExist:
        return JsonResponse({'message':  'You do not have linked social accounts.'}, status = 401)

    print request.POST
    if 'album_ids[]' not in request.POST:
        return JsonResponse({'message':  'Invalid request.'}, status = 400)

    for album_id in request.POST.getlist('album_ids[]'):
        album_xml = _picasa_feed(social, add_url="/albumid/" + album_id, imgmax=1600)
        album_feed = objectify.fromstring(album_xml)
    #for album in album_infos[start:start + 10]:
        seg = Segment(
            trip=trip,
            segment_name = album_feed.title.text,
            segment_img = album_feed.icon.text,
            segment_album = album_id,
        )
        print seg
        seg.save()

        seg_pos_ct = 0
        seg_lats = []
        seg_lons = []
        seg_start = sys.maxint
        seg_end = 0

        # fill in the segment details with each picture
        # JSON styles
        seg_JSON = {'data': []}

        for el in album_feed.entry:
            seg_det = {
                'name': unicode(el.title),
                'img':  el.content.get('src'),
                'thumbnails': map(
                                lambda x: {'url': x.get('url'), 'height': int(x.get('height')), 'width': int(x.get('width'))}
                                , el.findall('media:group/media:thumbnail', album_feed.nsmap)
                            )
            }

            # check if geo data exists
            if 'georss' in album_feed.nsmap and 'gml' in album_feed.nsmap:
                xmllink = 'georss:where/gml:Point/gml:pos'
                node = el.find(xmllink, album_feed.nsmap)
                if node:
                    sd_lat, sd_lon = map(float, node.text.split())
                    seg_det.update({
                        'geo': {
                            'lat': sd_lat,
                            'lon': sd_lon,
                        }
                    })
                    seg_lats.append(sd_lat)
                    seg_lons.append(sd_lon)
                    seg_pos_ct += 1

            # check if time data exists
            if 'exif' in album_feed.nsmap:
                xmllink = 'exif:tags/exif:time'
                node = el.find(xmllink, album_feed.nsmap)
                if node:
                    epoch_time =int(node) / 1000
                    seg_det.update({'time': epoch_time})
                    seg_start = min(seg_start, epoch_time)
                    seg_end = max(seg_end, epoch_time)
            seg_JSON['data'].append(seg_det)

        # organize the pictures by time
        # move the untimed pictures forward
        seg_JSON['data'].sort(key = lambda x: x.get('time', 0))
        for i, el in enumerate(seg_JSON['data']):
            el['id'] = i
        seg.segment_detail = seg_JSON

        # if there's enough geo info in the album
        if seg_pos_ct > 0:
            seg.segment_lat = seg_lats[seg_pos_ct / 2]
            seg.segment_lon = seg_lons[seg_pos_ct / 2]
            seg.save()

        # if there's enough time info in the album
        if seg_end > 0:
            seg.segment_start = date.fromtimestamp(seg_start)
            seg.segment_end = date.fromtimestamp(seg_end)

            # update the trip's travel time
            trip.trip_start = min(trip.trip_start, seg.segment_start)
            trip.trip_end = max(trip.trip_end, seg.segment_end)
            trip.save()
        seg.save()
    return JsonResponse({'message': 'Segments saved.'})



@check_trip_access_json(False)
def read_albums_from_db(request, trip):
    """return albums available from db"""
    return output_album_json(request, trip)

@check_trip_access_json(False)
def read_pics_from_db(request, trip):
    """return picture details from db"""
    return output_pics_json(request, trip)


def output_album_json(request, trip):
    segments = trip.segment_set.all().order_by('segment_start', 'segment_end')
    album_infos = map(
        lambda seg: {
            'title': seg.segment_name,
            'thumbnail': seg.segment_img,
            'time_start': format(seg.segment_start, 'U') if seg.segment_start else None,
            'time_end': format(seg.segment_end, 'U') if seg.segment_end else None,
            'geo': {'lat': seg.segment_lat, 'lon': seg.segment_lon} if seg.segment_lat and seg.segment_lon else None,
            'pk': seg.pk,
        },
        segments
    )

    return JsonResponse({
        'item_data': album_infos,
        'is_album': True,
    })


def output_pics_json(request, trip):
    if 'seg_pk' not in request.POST:
        return JsonResponse({'message':  'Invalid request.'}, status = 400)
    try:
        seg = trip.segment_set.get(pk = request.POST['seg_pk'])
    except Segment.DoesNotExist:
        return JsonResponse({'message': 'Album does not exist.'}, status = 404)

    def get_fit_thumb(thumbs, frame_size):
        min_diff = sys.maxint
        output_thumb = thumbs[0]
        for thumb in thumbs:
            curr_diff = sum(map(lambda x: (x-frame_size)**2,[thumb['width'], thumb['height']]))
            if curr_diff < min_diff:
                min_diff = curr_diff
                output_thumb = thumb
        return output_thumb

    seg_det = seg.segment_detail
    seg_infos = map(
        lambda pic: {
            'title': pic['name'],
            'thumbnail': get_fit_thumb(pic['thumbnails'], int(request.POST['thumbsize']))['url'] if 'thumbsize' in request.POST else pic['thumbnails'][0]['url'],
            'time': format(datetime.fromtimestamp(pic['time'], tz = pytz.UTC), 'U') if 'time' in pic else None,
            'geo': {'lat': pic['geo']['lat'], 'lon': pic['geo']['lon']} if 'geo' in pic else None,
            'pk': pic['id'],
            'src': pic['img'],
        },
        seg_det['data']
    )

    return JsonResponse({
        'item_data': seg_infos,
        'is_album': False,
        'seg_pk' : request.POST['seg_pk'],
    })

@check_trip_access_json(True)
def pic_edits(request, trip, seg):
    seg = seg[0]
    def title_edits(post_data):
        seg.segment_name = post_data['content']
        return True
    def time_edits(post_data):
        content_list = post_data.getlist('content[]')
        def validate(date_str):
            try:
                return datetime.strptime(date_str, '%Y/%m/%d').date()
            except ValueError:
                return None
        seg.segment_start, seg.segment_end = map(validate, content_list)

        # update the trip's travel time
        trip.trip_start = min(trip.trip_start, seg.segment_start)
        trip.trip_end = max(trip.trip_end, seg.segment_end)
        return True
    def geo_edits(post_data):
        try:
            seg.segment_lat, seg.segment_lon = map(float, post_data['content'].split(','))
        except ValueError:
            return False
        return True

    def json_edits(post_data):
        actions = json.loads(post_data['content'])
        json_data = seg.segment_detail['data']
        field_codes = {
            'title': 'name',
            'loc': 'geo',
            'timestamp': 'time',
        }

        delete_queue = set()
        try:
            for entry in actions:
                if entry['type'] == 'edit':
                    json_data[int(entry['item_id'])][field_codes[entry['target']]] = entry['content']
                elif entry['type'] == 'delete':
                    delete_queue.add(entry['item_id'])
        except KeyError:
            return False

        json_data = [el for i, el in enumerate(json_data) if i not in delete_queue]
        # sort them into time order again
        json_data.sort(key = lambda x: x.get('time', 0))
        for i, el in enumerate(json_data):
            el['id'] = i

        # readjust the album's start and end dates
        seg_start = next((el['time'] for el in json_data if 'time' in el), 0)
        if seg_start:
            seg.segment_end = date.fromtimestamp(json_data[-1]['time'])
            seg.segment_start = date.fromtimestamp(seg_start)
        seg.segment_detail = {'data': json_data}
        return True


    allocation = {
        'title': title_edits,
        'time': time_edits,
        'geo': geo_edits,
        'json': json_edits,
    }

    if request.POST['target'] and request.POST['target'] in allocation and ('content' in request.POST or 'content[]' in request.POST):
        if not allocation[request.POST['target']](request.POST):
            return JsonResponse({'message': 'Invalid content. No changes were made.'}, status = 400)
    else:
        return JsonResponse({'message': 'Invalid request.'}, status = 400)

    seg.save()
    trip.save()
    return JsonResponse({'message': 'Modified.'})

@check_trip_access_json(True)
def pic_delete(request, trip, seg):
    seg.delete()
    return JsonResponse({'message': 'Deleted.'})

@check_trip_access_json(True)
def set_album_cover(request, trip, seg):
    if 'item_id' not in request.POST:
        return JsonResponse({'message': "Invalid request."}, status = 400)
    seg = seg[0]
    json_data = seg.segment_detail['data']
    seg.segment_img = json_data[int(request.POST['item_id'])]['thumbnails'][-1]['url']
    print seg.segment_img
    seg.save()
    return JsonResponse({'message': 'New album cover set.'})


@check_trip_access(True)
def edit_trip_info(request, trip, *args):
    try:
        URLValidator()(request.POST['pp_url'])
    except ValidationError as e:
        messages.error(request, "Malformed URL for the banner picture.")
        return redirect('splitter:trip_edit', pk=trip.pk)

    trip.trip_description = request.POST['description']
    trip.trip_start = datetime.strptime(request.POST['start_date'], '%Y/%m/%d').date()
    trip.trip_end = datetime.strptime(request.POST['end_date'], '%Y/%m/%d').date()
    trip.profile_pic = request.POST['pp_url']
    trip.is_private = 'private' in request.POST
    trip.save()
    return redirect(trip)

def new_trip(request):
    if 'travelers' not in request.POST:
        messages.error(request, "Add at least one traveler to the trip.")
        return redirect('splitter:new_trip')
    if not request.POST['title']:
        messages.error(request, "Please enter a name for the trip.")
        return redirect('splitter:new_trip')
    trip = Trip(trip_name = request.POST['title'])
    trav_pks = request.POST.getlist('travelers')
    try:
        travs = Traveler.objects.filter(pk__in=trav_pks)
    except Traveler.DoesNotExist:
        messages.error(request, "Invalid travelers submitted.")
        return redirect('splitter:new_trip')

    trip.save()
    trip.travelers.add(*trav_pks)
    messages.success(request, "Trip created :)")
    messages.info(request, "Fill out the rest of the details.")
    return redirect('splitter:trip_edit', pk=trip.pk)
