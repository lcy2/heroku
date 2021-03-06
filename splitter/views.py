# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.shortcuts import render, redirect
from django.contrib.auth.decorators import login_required
from django.http import HttpResponseRedirect, JsonResponse
from django.core import serializers
from django.core.exceptions import ObjectDoesNotExist
from django.contrib import messages
from django.urls import reverse

from social_django.models import UserSocialAuth

from .models import Trip, Segment, Traveler
from . import gateway
from .decorators import check_trip_access
from .utils import process_charge, trip_hash

from lxml import objectify
from urllib import urlencode
from decouple import config

import requests, time, json, re

# Create your views here.

def index(request):
    user = request.user
    private_trips = []
    if user and not user.is_anonymous():
        try:
            private_trips = (user.traveler.trip_set.all() | user.trip_set.all()).distinct().order_by('trip_start')
        except ObjectDoesNotExist:
            pass

    public_trips = Trip.objects.filter(is_private = False).order_by('trip_start')

    context = {
        'private_trips': private_trips,
        'public_trips' : public_trips,
    }

    return render(request, 'splitter/index.html', context)


def gateway_switch(request, action):
    action_dir_trip = {
        'rtfg': gateway.refresh_trek_from_google,
        'rafd': gateway.read_albums_from_db,
        'rpfd': gateway.read_pics_from_db,
        'etd': gateway.edit_trip_info,
        'gpio': gateway.get_preview_info_only,
        'newcharge': gateway.new_charge,
        'delcharge': gateway.del_charge,
        'swapcharge': gateway.swap_charge,
        'sumcharge': gateway.charge_summary,
        'privcharge': gateway.charge_privacy_toggle,
        'ec': gateway.edit_currencies,
    }
    action_dir_seg = {
        'picedits': gateway.pic_edits,
        'picdel': gateway.pic_delete,
        'setcover': gateway.set_album_cover,
    }
    action_dir = {
        'newtrav': gateway.new_traveler,
    }
    if action in action_dir_trip:
        if 'HTTP_REFERER' in request.META:
            p = re.compile(r'(?<=\/)[0-9]+(?=[\/#]|$)')
            pk = int(p.search(request.META['HTTP_REFERER']).group())
            return action_dir_trip[action](request, pk)
        else:
            return JsonResponse({'message': 'Went down the wrong rabbit hole.'}, status = 400)
    elif action in action_dir_seg:
        seg_pk = None
        if 'pk[]' in request.POST:
            seg_pk = map(int, request.POST.getlist('pk[]'))
        elif 'pk' in request.POST:
            seg_pk = [request.POST['pk']]
        else:
            return JsonResponse({'message': 'Invalid request. No album identifier supplied.'}, status = 400)

        if not seg_pk:
            return JsonResponse({'message': 'Album does not exist.'}, status = 404)

        seg = Segment.objects.filter(pk__in = seg_pk)
        pk = seg[0].trip.pk;
        return action_dir_seg[action](request, pk, seg = seg)

    elif action in action_dir:
        return action_dir[action](request)

    messages.error(request, "Went down the wrong rabbit hole.")
    return redirect("splitter:index")

@check_trip_access(False)
def trip_overview(request, trip, editable):
    if not editable:
        return redirect('splitter:phototrek', pk = trip.pk)

    context = {
        'trip': trip,
        'edit_permission': editable,
    }
    return render(request, 'splitter/trip_overview.html', context)

@check_trip_access(True)
def trip_edit(request, trip, editable):
    context = {
        'trip': trip,
        'edit_permission': editable,
    }
    return render(request, 'splitter/trip_edit.html', context)

# adapted from https://github.com/morganwahl/photos-db/blob/master/photosdb/photosdb/views.py
@check_trip_access(True)
def phototrek_edit(request, trip, editable):
    """ return all albums """
    refresh_buttons = dict()
    try:
        google_social = request.user.social_auth.get(provider='google-oauth2')
        refresh_buttons['google'] = True
    except UserSocialAuth.DoesNotExist:
        refresh_button['google'] = False

    if not any(refresh_buttons.values()):
        messages.error(request, "You do not have linked social accounts.")
        return redirect("splitter:index")

    context = {
        'trip': trip,
        'refresh_buttons': refresh_buttons,
        'edit_permission': editable,
        'path': request.path,
    }

    # determine whether additional Google access is needed
    if refresh_buttons['google']:
        # True indicates that access token has the right scope
        google_photo_scope = 'scope' in google_social.extra_data and \
            "https://picasaweb.google.com/data/" in google_social.extra_data['scope'] and \
            "https://photos.googleapis.com/data/" in google_social.extra_data['scope']
        context.update({'google_photo_scope': google_photo_scope})

    return render(request, 'splitter/phototrek_edit.html', context)

@check_trip_access(False)
def phototrek(request, trip, editable):
    context = {
        'trip': trip,
        'edit_permission': editable,
    }
    return render(request, 'splitter/phototrek_display.html', context)

@login_required
def new_trip(request):
    try:
        request.user.traveler
    except ObjectDoesNotExist:
        trav = Traveler(user=request.user, traveler_name = request.user.first_name if request.user.first_name else request.user.username)
        trav.save()

    context = {
        'travelers': Traveler.objects.all()
    }
    return render(request, 'splitter/new_trip.html', context)

def trip_plan(request):
    return render(request, 'splitter/trip_plan.html', {})


# legacy mapbox json calls
@login_required
def outward(request):
    if 'target' not in request.GET:
        return JsonResponse({'message': 'Unknown request.', 'warning_level': 'warning'}, status = 400)

    def mapbox_tsp():
        params = ['latlon_string', 'access_token', 'mode']
        if not all([p in request.GET for p in params]):
            return JsonResponse({'message': 'Missing parameters.'}, status = 400)
        url = 'https://api.mapbox.com/optimized-trips/v1/mapbox/' + request.GET['mode'] + '/' + request.GET['latlon_string']
        query = {
            'access_token': request.GET['access_token'],
            'geometries': 'geojson',
            'overview': 'full',
            'roundtrip': request.GET['roundtrip'] if 'roundtrip' in request.GET else 'true',
            'source': 'first',
            'destination': 'last',
        }
        url += '?' + urlencode(query)
        return requests.get(url).json()

    def mapbox_dir():
        params = ['latlon_string', 'access_token', 'mode']
        if not all([p in request.GET for p in params]):
            return JsonResponse({'message': 'Missing parameters.'}, status = 400)
        url = 'https://api.mapbox.com/directions/v5/mapbox/' + request.GET['mode'] + '/' + request.GET['latlon_string']
        query = {
            'access_token': request.GET['access_token'],
            'geometries': 'geojson',
        }
        url += '?' + urlencode(query)
        return requests.get(url).json()

    def mapbox_rgeo():
        params = ['latlon_string', 'access_token']
        if not all([p in request.GET for p in params]):
            return JsonResponse({'message': 'Missing parameters.'}, status = 400)
        url = 'https://api.mapbox.com/geocoding/v5/mapbox.places/' + request.GET['latlon_string'] + '.json'
        query = {
            'access_token': request.GET['access_token'],
        }
        url += "?" + urlencode(query)
        return requests.get(url).json()

    outward_action = {
        'mapbox_tsp': mapbox_tsp,
        'mapbox_dir': mapbox_dir,
        'mapbox_rgeo': mapbox_rgeo,
    }

    return JsonResponse(outward_action[request.GET['target']]())


def traveler(request, trav):
    try:
        traveler = Traveler.objects.get(traveler_name = trav)
    except ObjectDoesNotExist:
        messages.warning("traveler doesn't exist.")
        return redirect('splitter:index')

    user = request.user
    trips = traveler.trip_set.filter(is_private= False)
    if user and not user.is_anonymous():
        trips = (user.traveler.trip_set.all() | user.trip_set.all() & traveler.trip_set.all() | trips).distinct()

    if not trips:
        messages.warning("No viewable trips available.")
        return redirect('splitter:index')

    context = {
        'traveler': traveler,
        'trips': trips,
    }

    return render(request, 'splitter/traveler.html', context)

@check_trip_access(True)
def charges(request, trip, editable):
    # if there are no records in charges
    # redirect to the page for creating the initial sets of parameters
    if not trip.accounting['currencies']:
        # get list of currencies from openexchangerate
        url = 'https://openexchangerates.org/api/latest.json?app_id=' + config('OXR_API_KEY')
        rates = requests.get(url).json()['rates']
        url = 'https://openexchangerates.org/api/currencies.json'
        currencies = [(abbrev, 1 / float(rates[abbrev]), full_name) for abbrev, full_name in requests.get(url).json().iteritems()]
        context = {
            'trip': trip,
            'currencies': currencies,
        }
        return render(request, 'splitter/new_charges.html', context)

    # process charges into strings
    travelers = trip.travelers.all().order_by('pk')
    charges = process_charge(trip, travelers, trip.accounting['charges'], trip.accounting['order'])
    context = {
        'trip': trip,
        'charges': charges,
        'travelers': travelers,
        'currencies': trip.accounting['currencies'],
        'editable': editable,
        'share_url': '' if trip.accounting['is_private'] else request.build_absolute_uri(reverse("splitter:public_charge_url", kwargs={'pk':trip.pk, 'hash_val':trip_hash(trip,'charge')})),
    }
    return render(request, 'splitter/trip_charges.html', context)


def published_charges(request, pk, hash_val):
    trip = Trip.objects.get(pk = pk)

    editors = set([trav.user for trav in trip.travelers.all() if trav.user])
    if request.user and request.user in editors:
        return redirect('splitter:trip_charges', pk=pk)

    if trip.accounting['is_private']:
        messages.info(request, "This trip's finances are kept private.")
        return redirect('splitter:trip_overview', pk=trip.pk)

    if hash_val == trip_hash(trip, 'charge'):
        # process charges into strings
        travelers = trip.travelers.all().order_by('pk')
        charges = process_charge(trip, travelers, trip.accounting['charges'], trip.accounting['order'])
        context = {
            'trip': trip,
            'charges': charges,
            'travelers': travelers,
            'currencies': trip.accounting['currencies'],
            'editable': False,
            'share_url': reverse("splitter:public_charge_url", kwargs={'pk':pk, 'hash_val':hash_val}),
        }
        return render(request, 'splitter/trip_charges.html', context)

    messages.error(request, "Incorrect hash used.")
    return redirect('splitter:trip_overview', pk = pk)


@check_trip_access(True)
def itinerary(request, trip, editable):
    # process charges into strings
    context = {
        'trip': trip,
        'editable': editable,
        'share_url': '' if trip.itinerary['is_private'] else request.build_absolute_uri(reverse("splitter:public_charge_url", kwargs={'pk':trip.pk, 'hash_val':trip_hash(trip, 'itinerary')})),
    }
    return render(request, 'splitter/trip_itinerary.html', context)


def published_itinerary(request, pk, hash_val):
    trip = Trip.objects.get(pk = pk)

    editors = set([trav.user for trav in trip.travelers.all() if trav.user])
    if request.user and request.user in editors:
        return redirect('splitter:trip_itinerary', pk=pk)

    if trip.itinerary['is_private']:
        messages.info(request, "This trip's itinerary is kept private.")
        return redirect('splitter:trip_overview', pk=trip.pk)

    if hash_val == trip_hash(trip, 'itinerary'):
        # process charges into strings
        context = {
            'trip': trip,
            'editable': False,
            'share_url': reverse("splitter:public_charge_url", kwargs={'pk':pk, 'hash_val':hash_val}),
        }
        return render(request, 'splitter/trip_itinerary.html', context)

    messages.error(request, "Incorrect hash used.")
    return redirect('splitter:trip_overview', pk = pk)



@check_trip_access(True)
def edit_currencies(request, trip, editable):
    # this allows the user to edit currency exchange rates
    if not trip.accounting['currencies']:
        messages.error("This trip's finances have yet to be initialized.")
        return redirect('splitter:charges', pk=trip.pk)

    context = {
        'trip': trip,
        'currencies': trip.accounting['currencies'],
    }
    return render(request, 'splitter/edit_currencies.html', context)

def debug(request):
    posts = [key + ":" + repr(request.POST.getlist(key)) for key in request.POST]
    gets = [key + ":" + repr(request.GET.getlist(key)) for key in request.GET]
    context = {
        'posts': posts,
        'gets': gets,
    }
    return render(request, "splitter/test.html", context)
