# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.shortcuts import render
from django.contrib.auth.decorators import login_required

from .models import Trip

# Create your views here.

def index(request):
    user = request.user
    private_trips = []
    if not user.is_anonymous():
        traveler_roles = user.traveler_set.all()
        private_trips = reduce(lambda x, y: x.union(y), [role.trip_set.all() for role in traveler_roles])

    public_trips = Trip.objects.filter(is_private = False)

    context = {
        'private_trips': private_trips,
        'public_trips' : public_trips,
    }


    return render(request, 'splitter/index.html', context)
