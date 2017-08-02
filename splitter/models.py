# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models
from django.contrib.auth.models import User
from django.contrib.postgres.fields import JSONField
from django.urls import reverse

from datetime import date


class Traveler(models.Model):
    """ An intermediate between a user object and a traveler registered to each trip"""
    user = models.OneToOneField(User, blank = True, null = True, on_delete = models.CASCADE)
    traveler_name = models.CharField(max_length = 50, default = "Unknown")

    def __repr__(self):
        return self.traveler_name

    def __str__(self):
        return repr(self)

    def get_absolute_url(self):
        return reverse('splitter:traveler', kwargs={'trav': self.traveler_name})


def charge_json_default():
    return {
        'charges': dict(),
        'currencies': list(),
        'is_private': True,
        'n_charges': 0,
        'order': list(),
    }

def itinerary_json_default():
    return {
        'itinerary': dict(), # each entry contains {date: date, lodging: URL | "" | "inherit", transport: URL | "", segment: str, description: str }
        'is_private': True,
    }

class Trip(models.Model):
    # name of the trip
    trip_name = models.CharField(max_length = 50, default = "Unname Trip")
    trip_description = models.CharField(max_length = 300, blank = True)
    # comma-separated names of travelers
    travelers = models.ManyToManyField(Traveler)
    trip_start = models.DateField(default=date.today)
    trip_end = models.DateField(default=date.today)
    time_modified = models.DateTimeField(auto_now = True)
    time_created = models.DateTimeField(auto_now_add = True)
    profile_pic = models.URLField(default = 'https://unsplash.it/200/300?image=1039')
    profile_misc = JSONField(blank = True, null = True, default = dict)
    authorized_viewers = models.ManyToManyField(User, blank = True)
    is_private = models.BooleanField(default = True)
    accounting = JSONField(default = charge_json_default)
    itinerary = JSONField(default = itinerary_json_default)

    def __repr__(self):
        return unicode(self.trip_name)

    def __unicode__(self):
        return repr(self)

    def get_absolute_url(self):
        return reverse('splitter:trip_overview', kwargs={'pk': self.pk})



class Segment(models.Model):
    trip = models.ForeignKey(Trip, on_delete = models.CASCADE)
    segment_name = models.CharField(max_length = 50)
    segment_start = models.DateField(blank = True, null = True)
    segment_end = models.DateField(blank = True, null = True)
    segment_lng = models.FloatField(blank = True, null = True)
    segment_lat = models.FloatField(blank = True, null = True)
    segment_img = models.URLField(blank = True)
    segment_album = models.CharField(max_length = 30, blank = True)
    segment_detail = JSONField(blank = True, null = True, default = dict)

    def __unicode__(self):
        return self.segment_name
