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



class Trip(models.Model):
    # name of the trip
    trip_name = models.CharField(max_length = 50, default = "Unname Trip")
    trip_description = models.CharField(max_length = 300, blank = True)
    # comma-separated names of travelers
    travelers = models.ManyToManyField(Traveler)
    trip_start = models.DateField(default=date.today)
    trip_end = models.DateField(default=date.today)
    time_modified = models.DateTimeField(auto_now = True)
    profile_pic = models.URLField(default = 'https://unsplash.it/360/200/?random')
    authorized_viewers = models.ManyToManyField(User, blank = True)
    is_private = models.BooleanField(default = True)

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
    segment_lon = models.FloatField(blank = True, null = True)
    segment_lat = models.FloatField(blank = True, null = True)
    segment_img = models.URLField(blank = True)
    segment_album = models.URLField(blank = True)
    segment_detail = JSONField(blank = True, null = True, default = dict)

    def __unicode__(self):
        return self.segment_name

#class Segment_Detail(models.Model):
#    segment = models.ForeignKey(Segment, on_delete = models.CASCADE)
#    sd_name = models.CharField(max_length = 50)
#    sd_img = models.URLField(blank = True)
#    sd_description = models.TextField(blank = True)
#    sd_lon = models.FloatField(blank = True, null = True)
#    sd_lat = models.FloatField(blank = True, null = True)
#    sd_time = models.DateTimeField(blank = True, null = True)
#
#    def __unicode__(self):
#        return self.sd_name
#    def __str__(self):
#        return repr(self)

class Currency(models.Model):
    trip = models.ForeignKey(Trip, on_delete = models.CASCADE)
    code = models.CharField(max_length = 3)
    symbol = models.CharField(max_length = 3)
    rate = models.DecimalField(max_digits = 10, decimal_places = 2)

    def __repr__(self):
        return self.code
    def __str__(self):
        return repr(self)

class Charge(models.Model):
    trip = models.ForeignKey(Trip, on_delete = models.CASCADE)
    date_incurred = models.DateTimeField()
    description = models.CharField(max_length = 200)
    category = models.CharField(max_length = 50)
    currency = models.ForeignKey(Currency)
    amount = models.DecimalField(max_digits = 10, decimal_places = 2)
    charge_detail = JSONField(blank = True, null = True)

    def __repr__(self):
        return self.currency.symbol + str(self.amount)
    def __str__(self):
        return repr(self)

#class Charge_Detail(models.Model):
#    charge = models.ForeignKey(Charge, on_delete = models.CASCADE)
#    traveler = models.ForeignKey(Traveler, null = True, on_delete = models.SET_NULL)
#    amount = models.DecimalField(max_digits = 10, decimal_places = 2)
#
#    def __repr__(self):
#        return self.user.username + ":" + self.charge.currency.symbol + str(self.amount)
#
#    def __str__(self):
#        return repr(self)
