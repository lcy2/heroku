# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.shortcuts import render, redirect
from django.contrib.auth.decorators import login_required
from django.http import HttpResponseRedirect
from django.core import serializers
from django.contrib import messages
from django.urls import reverse

from .models import Trip

from lxml import objectify
from urllib import urlencode
import requests
import time
import json
import re

# Create your views here.

def index(request):
    user = request.user
    private_trips = []
    if user and not user.is_anonymous():
        traveler_roles = user.traveler_set.all()
        all_trips = [role.trip_set.all() for role in traveler_roles]
        if all_trips:
            private_trips = reduce(lambda x, y: x.union(y), all_trips)

    public_trips = Trip.objects.filter(is_private = False)

    context = {
        'private_trips': private_trips,
        'public_trips' : public_trips,
    }

    return render(request, 'splitter/index.html', context)

def check_trip_access(fun):
    """Make sure the user has access to the trip

    passing the resultant trip to the view function
    also appending the editable permission to the context upon its return
    """

    def wrapper(request, pk, *args):
        try:
            trip = Trip.objects.get(pk = pk)
        except Trip.DoesNotExist:
            messages.error(request, "This trip does not exist.")
            return redirect('splitter:index')
        editable = False
        # if the user is not logged in
        if trip.is_private and (not request.user or request.user.is_anonymous()):
            messages.info(request, "Please log in.")
            return HttpResponseRedirect(reverse('login') + '?next='+request.path)

        editors = filter(lambda x: x, set([trav.user for trav in trip.travelers.all()]))
        if request.user in editors:
            editable = True
        elif (request.user in trip.authorized_viewers.all()) or (not trip.is_private):
            pass
        else:
            # if this user is not authorized
            # return to splitter:index with a message
            messages.error(request, "You are not authorized to view " + trip.trip_name + ".")
            return redirect('splitter:index')


        target, context = fun(request, trip, *args)
        context['edit_permission'] = editable
        return render(request, target, context)
    return wrapper

#def show_fields(MyModel):
#    raw_fields = [
#    (f, f.model if f.model != MyModel else None)
#    for f in MyModel._meta.get_fields()
#    if not f.is_relation
#        or f.one_to_one
#        or (f.many_to_one and f.related_model)
#    ]
#
#    return map(lambda x: str(x[0]).split('.')[-1], raw_fields)

@check_trip_access
def trip(request, trip, *args):
    context = {
        'trip': trip,
    }
    return ('splitter/trip_overview.html', context)

@check_trip_access
def trip_edit(request, trip, *args):
    context = {
        'trip': trip,
        #'fields': {field: getattr(trip, field) for field in show_fields(trip)}
    }
    return ('splitter/trip_edit.html', context)

# from https://github.com/morganwahl/photos-db/blob/master/photosdb/photosdb/views.py
def _picasa_feed(google, **query):
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
    url = url_base
    if query:
        url += '?' + urlencode(query)
    response = requests.get(url, headers=extra_headers)
    #print "Request headers %r", response.request.headers
    #print "Response headers %r", response.headers
    return response.content


# adapted from https://github.com/morganwahl/photos-db/blob/master/photosdb/photosdb/views.py
@check_trip_access
def phototrek_edit(request, trip, *args):
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
    print '-' * 50
    media_ns = feed.nsmap['media']
    album_infos = [{
        'title': unicode(el.title),
        'thumbnail': el["{" + media_ns + "}group"]["{" + media_ns + "}thumbnail"].get('url'),
    } for el in feed.entry]

    # only show the ones preceded with '201xxxxx - '
    r = re.compile(r'^[0-9]{8} - ')
    print trip.trip_start.strftime('%Y%m%d')
    print trip.trip_end.strftime('%Y%m%d')
    album_infos = filter(
        lambda x:
            r.match(x['title']) and
            x['title'][:8] >= trip.trip_start.strftime('%Y%m%d') and
            x['title'][:8] <= trip.trip_end.strftime('%Y%m%d'),
        album_infos
    )

    context = {
        'trip': trip,
        'album_infos': album_infos,
    }
    return ('splitter/phototrek_edit.html', context)
