from django.http import JsonResponse
from django.utils.dateformat import format

from datetime import date, datetime

from .models import Trip, Segment

import requests, time, re, pytz, sys

from lxml import objectify
from urllib import urlencode

# TODO: store segment_detail in a json field in segment


def check_trip_access_json(enforce_edit):
    """Make sure the user has access to the trip

    passing the resultant trip to the view function
    """
    def real_decorator(fun):
        def wrapper(request, pk, *args):
            try:
                trip = Trip.objects.get(pk = pk)
            except Trip.DoesNotExist:
                return JsonResponse({'message': 'Trip does not exist'}, status = 404)
            # if the user is not logged in for a private trip
            if trip.is_private and (not request.user or request.user.is_anonymous()):
                return JsonResponse({'message': 'User not logged in.'}, status = 403)

            editors = filter(lambda x: x, set([trav.user for trav in trip.travelers.all()]))
            if request.user in editors:
                return fun(request, trip, *args)
            elif ((request.user in trip.authorized_viewers.all()) or (not trip.is_private)) and not enforce_edit:
                return fun(request, trip, *args)
            # if this user is not authorized
            # return to splitter:index with a message
            return JsonResponse({'message': "You're not authorized"}, status = 403)

        return wrapper
    return real_decorator

# from https://github.com/morganwahl/photos-db/blob/master/photosdb/photosdb/views.py
def _picasa_feed(google, add_url = '', **query):
    """'google' is a GoogleOAuth2 UserSocialAuth instance."""

    # check whether the token needs refreshing
    if (google.extra_data['auth_time'] + google.extra_data['expires'] - 10) <= int(time.time()):
        from social_django.utils import load_strategy
        strategy = load_strategy()
        google.refresh_token(strategy = strategy)

    extra_headers = {
        'GData-Version': '2',
        'Authorization': 'Bearer {}'.format(google.extra_data['access_token'])
    }
    url_base = 'https://picasaweb.google.com/data/feed/api/user/default'
    url = url_base + add_url
    if query:
        url += '?' + urlencode(query)
    response = requests.get(url, headers=extra_headers)
    #print "Request headers %r", response.request.headers
    #print "Response headers %r", response.headers
    return response.content

@check_trip_access_json(True)
def refresh_trek_from_google(request, trip):
    """ return all albums """
    # TODO: add refresh button to refresh the album list in the database
    # TODO: store the album list in the database
    try:
        social = request.user.social_auth.get(provider='google-oauth2')
    except social_auth.DoesNotExist:
        # TODO redirect or say that google account is requried
        raise NotImplementedError
    xml = _picasa_feed(social, kind='album', prettyprint='true', imgmax='d')
    feed = objectify.fromstring(xml)

    media_ns = feed.nsmap['media']


    album_infos = [{
        'title': unicode(el.title),
        'albumid': el.id.text.split('/')[-1],
        'thumbnail': el["{" + media_ns + "}group"]["{" + media_ns + "}thumbnail"].get('url'),
        'order': None,
    } for el in feed.entry]

    # TODO: change it to user-selecting which albums to use
    # only show the ones preceded with '201xxxxx - '
    r = re.compile(r'^[0-9]{8} - ')
    album_infos = filter(
        lambda x:
            r.match(x['title']) and
            x['title'][:8] >= trip.trip_start.strftime('%Y%m%d') and
            x['title'][:8] <= trip.trip_end.strftime('%Y%m%d'),
        album_infos
    )

    # get the queryset from db
    # TODO: only modify the entries as needed
    # TODO: pull old info, compare with new, make edits
    # for now just deleting all old info and replace with new

    old_info = trip.segment_set.all()
    old_info.delete()

    url_base = 'https://picasaweb.google.com/data/feed/api/user/default/albumid/'

    for album in album_infos:
        print album['title']
        albumid = album.pop('albumid', '')
        seg = Segment(
            trip=trip,
            segment_name = album['title'],
            segment_img = album['thumbnail'],
            segment_album = url_base + albumid,
        )
        seg.save()

        album_xml = _picasa_feed(social, add_url="/albumid/" + albumid)
        album_feed = objectify.fromstring(album_xml)

        geo_ns = album_feed.nsmap['georss'] if 'georss' in album_feed.nsmap else None
        gml_ns = album_feed.nsmap['gml'] if 'gml' in album_feed.nsmap else None
        exif_ns = album_feed.nsmap['exif'] if 'exif' in album_feed.nsmap else None

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
                'name': el.title,
                'img':  el.content.get('src'),
            }

            # check if geo data exists
            if geo_ns and gml_ns:
                xmllink = '/'.join([
                    '{' + geo_ns + '}where',
                    '{' + gml_ns + '}Point',
                    '{' + gml_ns + '}pos'
                ])
                node = el.find(xmllink)
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
            if exif_ns:
                xmllink = '/'.join([
                    '{' + exif_ns + '}tags',
                    '{' + exif_ns + '}time',
                ])
                node = el.find(xmllink)
                if node:
                    epoch_time =int(node) / 1000
                    sd_time = datetime.fromtimestamp(epoch_time).replace(tzinfo=pytz.UTC)
                    seg_det.update({'time': sd_time})
                    seg_start = min(seg_start, epoch_time)
                    seg_end = max(seg_end, epoch_time)

            seg_JSON['data'].append(seg_det)

        # if there's enough geo info in the album
        if seg_pos_ct > 0:
            seg.segment_lat = seg_lats[seg_pos_ct / 2]
            seg.segment_lon = seg_lons[seg_pos_ct / 2]
            seg.save()

        # if there's enough time info in the album
        if seg_end > 0:
            seg.segment_start = date.fromtimestamp(seg_start)
            seg.segment_end = date.fromtimestamp(seg_end)
        seg.save()
    return output_album_json(request, trip)

@check_trip_access_json(True)
def read_albums_from_db(request, trip, *args):
    """return albums available from db"""
    return output_album_json(request, trip)


def output_album_json(request, trip):
    segments = trip.segment_set.all().order_by('segment_start', 'segment_end')
    album_infos = []
    for seg in segments:
        album = dict()
        album['title'] = seg.segment_name
        album['albumid'] = seg.segment_album.split('/')[-1]
        album['thumbnail'] = seg.segment_img
        album['time_start'] = format(seg.segment_start, 'U') if seg.segment_start else None
        album['time_end'] = format(seg.segment_end, 'U') if seg.segment_end else None
        album['geo'] = {'lat': seg.segment_lat, 'lon': seg.segment_lon} if seg.segment_lat and seg.segment_lon else None
        album['pk'] = seg.pk

        album_infos.append(album)
    return JsonResponse({
        'album_infos': album_infos,
        'is_album': True,
    })

def pic_edits(request):
    pk = request.GET['pk']
    try:
        seg = Segment.objects.get(pk = pk)
    except ObjectDoesNotExist:
        return JsonResponse({'message': 'Object does not exist.'}, status = 404)

    def title_edits():
        seg.segment_name = request.GET['content']
        return True
    def time_edits():
        content_list = request.GET.getlist('content[]')
        def validate(date_str):
            try:
                return datetime.strptime(date_str, '%Y/%m/%d').date()
            except ValueError:
                return None
        seg.segment_start, seg.segment_end = map(validate, content_list)
        return True
    def geo_edits():
        try:
            seg.segment_lat, seg.segment_lon = map(float, request.GET['content'].split(','))
        except ValueError:
            return False
        return True

    allocation = {
        'title': title_edits,
        'time': time_edits,
        'geo': geo_edits,
    }

    if request.GET['target'] and request.GET['target'] in allocation and ('content' in request.GET or 'content[]' in request.GET):
        if not allocation[request.GET['target']]():
            return JsonResponse({'message': 'Invalid content. No changes were made.'}, status = 400)
    else:
        return JsonResponse({'message': 'Invalid request.'}, status = 400)
    seg.save()
    return JsonResponse({'message': 'Modified.'})
