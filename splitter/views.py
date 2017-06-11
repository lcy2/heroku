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

from lxml import objectify
from urllib import urlencode

import requests, time, json, re

# Create your views here.

def index(request):
    user = request.user
    private_trips = []
    if user and not user.is_anonymous():
        try:
            private_trips = user.traveler.trip_set.all().order_by('trip_start')
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
        social = request.user.social_auth.get(provider='google-oauth2')
        refresh_buttons['google'] = True
    except UserSocialAuth.DoesNotExist:
        messages.error(request, "You do not have linked social accounts.")
        return redirect("splitter:index")

    context = {
        'trip': trip,
        'refresh_buttons': refresh_buttons,
        'edit_permission': editable,
    }
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
