# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.shortcuts import render, redirect
from django.contrib.auth.decorators import login_required
from django.http import HttpResponseRedirect
from django.core import serializers
from django.contrib import messages
from django.urls import reverse

from .models import Trip

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

def trip(request, pk):
    trip = Trip.objects.get(pk = pk)
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


    data = serializers.serialize( "python", [trip] )
    context = {
        'trip': trip,
        'data': data,
        'editable': editable,
    }
    return render(request, 'splitter/trip_overview.html', context)
