from django.http import JsonResponse
from django.shortcuts import render, redirect
from django.utils.dateformat import format
from django.core.validators import URLValidator
from django.core.exceptions import ValidationError
from django.contrib import messages
from django.urls import reverse

from datetime import date, datetime, timedelta

from .models import Segment, Trip, Traveler
from .decorators import check_trip_access_json, check_trip_access
from .utils import watershed_image, process_charge, charge_hash

import requests, time, re, pytz, sys, json, httplib, random

from lxml import objectify
from urllib import urlencode
from urlparse import urlparse



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
        return JsonResponse({'message':  'You do not have linked social accounts.', 'warning_level': 'warning'}, status = 401)
    xml = _picasa_feed(social, kind='album', prettyprint='false')
    if xml == "Token revoked":
        messages.error(request, "Your credential has been revoked.")
        return JsonResponse({'message': 'Your credential has been revoked.', 'warning_level': 'danger', 'action': reverse('logout') + "?next=" + reverse('splitter:index')}, status = 403)

    feed = objectify.fromstring(xml)

    if feed.tag == "error":
        if feed.code.text == "400":
            return JsonResponse({
                'message': 'Please log in again.',
                'warning_level': 'info',
                'action': reverse('login'),
            }, status = 400);
    if not len(feed.find('entry')):
        return JsonResponse({
            'message': 'No albums found in your Google Photos.',
            'warning_level': 'info',
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
        return JsonResponse({'message':  'You do not have linked social accounts.', 'warning_level': 'warning'}, status = 401)

    if 'album_ids[]' not in request.POST:
        return JsonResponse({'message':  'Invalid request.', 'warning_level': 'danger'}, status = 400)

    for album_id in request.POST.getlist('album_ids[]'):
        album_xml = _picasa_feed(social, add_url="/albumid/" + album_id, imgmax=1600)
        if album_xml == "Token revoked":
            messages.error(request, "Your credential has been revoked.")
            return JsonResponse({'message': 'Your credential has been revoked.', 'warning_level': 'danger', 'action': reverse('logout') + "?next=" + reverse('splitter:index')}, status = 403)
        album_feed = objectify.fromstring(album_xml)


        seg = Segment(
            trip=trip,
            segment_name = album_feed.title.text,
            segment_img = album_feed.icon.text,
            segment_album = album_id,
        )
        #print seg
        seg.save()

        seg_pos_ct = 0
        seg_lats = []
        seg_lngs = []
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
                    sd_lat, sd_lng = map(float, node.text.split())
                    seg_det.update({
                        'geo': {
                            'lat': sd_lat,
                            'lng': sd_lng,
                        }
                    })
                    seg_lats.append(sd_lat)
                    seg_lngs.append(sd_lng)
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
            seg.segment_lng = seg_lngs[seg_pos_ct / 2]
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
    return JsonResponse({'message': 'Segments saved.', 'warning_level': 'success'})



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
            'geo': {'lat': seg.segment_lat, 'lng': seg.segment_lng} if seg.segment_lat and seg.segment_lng else None,
            'pk': seg.pk,
            'member_ct': seg.segment_detail['data'][-1]['id'] + 1 if seg.segment_detail['data'] else 0,
        },
        segments
    )

    return JsonResponse({
        'item_data': album_infos,
        'is_album': True,
    })


def output_pics_json(request, trip):
    if 'seg_pk' not in request.POST:
        return JsonResponse({'message':  'Invalid request.', 'warning_level': 'danger'}, status = 400)
    try:
        seg = trip.segment_set.get(pk = request.POST['seg_pk'])
    except Segment.DoesNotExist:
        return JsonResponse({'message': 'Album does not exist.', 'warning_level': 'warning'}, status = 404)

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
            'geo': {'lat': pic['geo']['lat'], 'lng': pic['geo']['lng']} if 'geo' in pic else None,
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
            seg.segment_lat, seg.segment_lng = map(float, post_data['content'].split(','))
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
            return JsonResponse({'message': 'Invalid content. No changes were made.', 'warning_level': 'danger'}, status = 400)
    else:
        return JsonResponse({'message': 'Invalid request.', 'warning_level': 'danger'}, status = 400)

    seg.save()
    trip.save()
    return JsonResponse({'message': 'Modified.', 'warning_level': 'success'})

@check_trip_access_json(True)
def pic_delete(request, trip, seg):
    seg.delete()
    return JsonResponse({'message': 'Deleted.', 'warning_level': 'success'})

@check_trip_access_json(True)
def set_album_cover(request, trip, seg):
    if 'item_id' not in request.POST:
        return JsonResponse({'message': "Invalid request.", 'warning_level': 'danger'}, status = 400)
    seg = seg[0]
    json_data = seg.segment_detail['data']
    seg.segment_img = json_data[int(request.POST['item_id'])]['thumbnails'][-1]['url']
    seg.save()
    return JsonResponse({'message': 'New album cover set.', 'warning_level': 'success'})


def is_url_image(url):
    parse_object = urlparse(url)
    conn = httplib.HTTPConnection(parse_object.netloc)
    try:
        conn.request("HEAD", parse_object.path)
    except Exception:
        return False
    res = conn.getresponse()
    headers = res.getheaders()

    # check to see if it's a redirection url
    for header in headers:
        if header[0] == "location":
            try:
                URLValidator()(header[1])
            except ValidationError as e:
                return False
            return is_url_image(header[1])
        elif header[0] == "content-type" and header[1].split('/')[0] == 'image':
            return True
    return False

@check_trip_access(True)
def edit_trip_info(request, trip, *args):
    try:
        URLValidator()(request.POST['pp_url'])
    except ValidationError as e:
        messages.error(request, "Malformed URL for the banner image.")
        return redirect('splitter:trip_edit', pk=trip.pk)

    if len(request.POST['pp_url']) > 200:
        messages.error(request, "URL too long. Please limit it to 200 characters.")
        return redirect('splitter:trip_edit', pk=trip.pk)

    if not is_url_image(request.POST['pp_url']):
        messages.error(request, "Unable to request the banner image.")
        return redirect('splitter:trip_edit', pk=trip.pk)

    trip.trip_description = request.POST['description']
    trip.trip_start = datetime.strptime(request.POST['start_date'], '%Y/%m/%d').date()
    trip.trip_end = datetime.strptime(request.POST['end_date'], '%Y/%m/%d').date()
    if trip.profile_pic != request.POST['pp_url']:
        trip.profile_pic = request.POST['pp_url']
        trip.profile_misc['svg']['paths'], trip.profile_misc['svg']['bounds'] = watershed_image(trip.profile_pic)
    trip.is_private = 'private' in request.POST
    trip.save()
    messages.success(request, "Trip edited.")
    return redirect(trip)

def new_trip(request):
    if 'travelers' not in request.POST:
        messages.error(request, "Add at least one traveler to the trip.")
        return redirect('splitter:new_trip')
    if not request.POST['title']:
        messages.error(request, "Please enter a name for the trip.")
        return redirect('splitter:new_trip')

    throttle_time = datetime.now() - timedelta(hours = 1)
    recent_trip_counts = request.user.traveler.trip_set.filter(time_created__gte = throttle_time).count()
    if recent_trip_counts > 5:
        messages.warning(request, "Please limit to creating only 5 trips an hour.")
        return redirect('splitter:index')


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


# for handling the creation of new travelers unassociated with actual users
def new_traveler(request):
    if not request.user or request.user.is_anonymous():
        return JsonResponse({
            'message': 'Please log in.',
            'warning_level': 'warning',
        }, status = 401)

    if (Traveler.objects.filter(traveler_name = request.POST['trav_name'])):
        return JsonResponse({
            'message': 'Traveler name is already taken.',
            'warning_level': 'info',
        })

    new_trav = Traveler(traveler_name = request.POST['trav_name'])
    new_trav.save()
    return JsonResponse({
        'message': 'New traveler ' + request.POST['trav_name'] + ' added.',
        'warning_level': 'success',
        'new_pk': new_trav.pk,
    })

@check_trip_access(True)
def init_charges(request, trip, editable):
    # this writes the selected currency list into json
    if 'currencies' not in request.POST:
        messages.error(request, "Add at least one currency.")
        return redirect('splitter:trip_charges', pk = trip.pk)

    currencies = list()
    curr_strs = request.POST.getlist('currencies')
    for curr_str in curr_strs:
        full_name, abbrev, rate = curr_str.split(":")
        rate = float(rate)
        currencies.append({
            'name': full_name,
            'abbr': abbrev,
            'xrate': rate,
            'custom_xrate': rate,
        })
    trip.accounting['currencies'] = currencies
    trip.save()
    return redirect("splitter:edit_currencies", pk=trip.pk)

@check_trip_access(True)
def edit_currencies(request, trip, editable):
    if 'HTTP_REFERER' not in request.META:
        messages.error(request, "Went down the wrong rabbit hole.")
        return redirect("splitter:index")

    p = re.compile(r'(?<=\/)[0-9]+(?=[\/#]|$)')
    pk = int(p.search(request.META['HTTP_REFERER']).group())
    trip = Trip.objects.get(pk = pk)
    trip_currencies = trip.accounting['currencies']

    xrates = request.POST.getlist('currencies')
    # make sure the custom rates are not too different from the retrieved rates
    # +/- 15%, or it's 0
    tolerance = 0.15
    for curr, new_rate in zip(trip_currencies, map(float, xrates)):
        if not (float(curr['xrate']) * (1.0 - tolerance) < new_rate < float(curr['xrate']) * (1.0 + tolerance)) and new_rate != 0:
            messages.error(request, "Custom rates deviate too much from official exchange rates.")
            messages.error(request, [float(curr['xrate']) * (1.0 - tolerance), new_rate, float(curr['xrate']) * (1.0 + tolerance)])
            return redirect("splitter:edit_currencies", pk=pk)

    for currency, xrate in zip(trip_currencies, xrates):
        currency['custom_xrate'] = float(xrate)

    trip.save()
    messages.success(request, "Custom rates have been updated.")

    return redirect("splitter:trip_charges", pk=pk)

@check_trip_access_json(True)
def new_charge(request, trip):
    #for key in request.POST:
    #    print str(key) + " " + str(request.POST.getlist(key))

    travelers = trip.travelers.all()

    #verify necessary pieces of information are present
    if any(x not in request.POST for x in ['payer', 'debtors[]', 'currency', 'amount', 'time', 'distribution', 'description']):
        return JsonResponse({'message':  'Invalid request.', 'warning_level': 'danger'}, status = 400)
    if request.POST['distribution'] == "itemized" and any('itemized[' + x + ']' not in request.POST for x in request.POST.getlist('debtors[]')):
        return JsonResponse({'message':  'Invalid request.', 'warning_level': 'danger'}, status = 400)

    #verify the itemized accounts do add up
    if request.POST['distribution'] == 'itemized' and abs(sum(map(float, [request.POST['itemized[' + x + ']'] for x in request.POST.getlist('debtors[]')])) / float(request.POST['amount']) - 1) > 0.01:
        return JsonResponse({'message': "There's a mismatch between the sum of the itemized inputs and the total sum.", 'warning_level': "warning"}, status = 400)

    #verify the payer and debtors are indeed among the travelers
    post_travs = set([int(request.POST['payer'])] + map(int, request.POST.getlist('debtors[]')))
    if not post_travs.issubset(set([traveler.pk for traveler in travelers])):
        return JsonResponse({'message':  'Invalid travelers detected.', 'warning_level': 'danger'}, status = 400)

    # execute the database op
    distro_obj = {}
    if request.POST['distribution'] == 'itemized':
        for x in request.POST.getlist('debtors[]'):
            distro_obj[x] = float(request.POST['itemized[' + x + ']'])
    else:
        debtor_len = len(request.POST.getlist('debtors[]'))
        for x in request.POST.getlist('debtors[]'):
            distro_obj[x] = float("{0:.2f}".format(float(request.POST['amount']) / debtor_len))

    new_charge = {
        'payer': int(request.POST['payer']),
        'debtors': map(int, request.POST.getlist('debtors[]')),
        'amount': float(request.POST['amount']),
        'currency': int(request.POST['currency']),
        'time': request.POST['time'],
        'distribution': request.POST['distribution'],
        'breakdown': distro_obj,
        'description': request.POST['description'],
    }
    if 'tip_rate' in request.POST:
        new_charge['tip_rate'] = float(request.POST['tip_rate'])

    hash_val = str(random.getrandbits(128))
    trip.accounting['charges'][hash_val] = new_charge
    trip.save()

    response = process_charge(trip, trip.travelers.all().order_by('pk'), {hash_val: new_charge})[0]
    response.update({'message': "Charge added."})
    return JsonResponse(response)


@check_trip_access_json(True)
def del_charge(request, trip):
    if 'hash_val' not in request.POST or request.POST['hash_val'] not in trip.accounting['charges']:
        return JsonResponse({'message':  'Invalid request.', 'warning_level': 'danger'}, status = 400)

    entry = trip.accounting['charges'].pop(request.POST['hash_val'])
    trip.save();
    return JsonResponse(entry)

@check_trip_access_json(False)
def charge_summary(request, trip):
    class Account(object):
        def __init__(self, pk, name):
            self.pk = pk
            self.name = name
            self.spent = dict()
            self.paid = dict()
            self.total_spent = 0
            self.total_paid = 0

        def add_charge(self, amount, currency):
            if currency['abbr'] not in self.spent:
                self.spent[currency['abbr']] = dict({'amt': 0, 'portion': 0})
            self.spent[currency['abbr']]['amt'] += amount
            self.total_spent += amount * currency['custom_xrate']

        def add_payment(self, amount, currency):
            if currency['abbr'] not in self.paid:
                self.paid[currency['abbr']] = dict({'amt': 0, 'portion': 0})
            self.paid[currency['abbr']]['amt'] += amount
            self.total_paid += amount * currency['custom_xrate']

        def calc_proportions(self, currencies):
            for currency in currencies:
                if currency['abbr'] in self.spent and self.total_spent > 0:
                    self.spent[currency['abbr']]['portion'] = self.spent[currency['abbr']]['amt'] * currency['custom_xrate'] / self.total_spent
                if currency['abbr'] in self.paid and self.total_paid > 0:
                    self.paid[currency['abbr']]['portion'] = self.paid[currency['abbr']]['amt'] * currency['custom_xrate']/ self.total_paid

        def __repr__(self):
            return '\n'.join([repr(self.spent), str(self.total_spent), repr(self.paid), str(self.total_paid)]) + '\n'

        def output(self):
            return {
                'spent': {curr: obj for curr, obj in self.spent.iteritems() if obj['amt'] > 0},
                'paid': {curr: obj for curr, obj in self.paid.iteritems() if obj['amt'] > 0},
                'total_spent': self.total_spent,
                'total_paid': self.total_paid,
                'pk': self.pk,
                'name': self.name
            }

    accounting = trip.accounting
    trav_accounts = {str(traveler.pk): Account(traveler.pk, traveler.traveler_name) for traveler in trip.travelers.all()}

    for hash_val, charge in accounting['charges'].iteritems():
        curr = accounting['currencies'][charge['currency']]
        # add up all the breakdowns
        for trav_pk, bd_amt in charge['breakdown'].iteritems():
            trav_accounts[trav_pk].add_charge(bd_amt, curr)
        # log the payments
        trav_accounts[str(charge['payer'])].add_payment(charge['amount'], curr)

    # calculate the proportions of each currency
    for trav_pk, account in trav_accounts.iteritems():
        account.calc_proportions(accounting['currencies'])
    response = {
        'accounts': [account.output() for account in trav_accounts.itervalues()],
        'message': "Summarized.",
    }
    return JsonResponse(response)

@check_trip_access_json(True)
def charge_privacy_toggle(request, trip):
    trip.accounting['is_private'] = (request.POST.get('toggle') == 'false')
    trip.save()
    response = {
        'share_url': request.build_absolute_uri(reverse("splitter:public_charge_url", kwargs={'pk':trip.pk, 'hash_val':charge_hash(trip)})),
        'message': "Finance privacy set.",
    }
    return JsonResponse(response)
