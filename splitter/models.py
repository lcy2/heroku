# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models
from django.contrib.auth.models import User

class Traveler(models.Model):
    """ An intermediate between a user object and a traveler registered to each trip"""
    user = models.ForeignKey(User, blank = True, null = True)
    traveler_name = models.CharField(max_length = 50, default = "Unknown")

    def __repr__(self):
        return self.traveler_name

    def __str__(self):
        return repr(self)


# Create your models here.
class Trip(models.Model):
    # name of the trip
    trip_name = models.CharField(max_length = 50, default = "Unname Trip")
    trip_description = models.CharField(max_length = 300, blank = True)
    # comma-separated names of travelers
    travelers = models.ManyToManyField(Traveler)
    time_of_trip = models.DateTimeField(blank = True, null = True)
    time_modified = models.DateTimeField(auto_now = True)
    profile_pic = models.URLField(default = 'https://unsplash.it/360/200/?random')
    authorized_viewers = models.ManyToManyField(User, blank = True)
    is_private = models.BooleanField(default = True)

    def __repr__(self):
        return self.trip_name

    def __str__(self):
        return repr(self)



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

    def __repr__(self):
        return self.currency.symbol + str(self.amount)
    def __str__(self):
        return repr(self)

class Charge_Detail(models.Model):
    charge = models.ForeignKey(Charge, on_delete = models.CASCADE)
    traveler = models.ForeignKey(Traveler, null = True, on_delete = models.SET_NULL)
    amount = models.DecimalField(max_digits = 10, decimal_places = 2)

    def __repr__(self):
        return self.user.username + ":" + self.charge.currency.symbol + str(self.amount)

    def __str__(self):
        return repr(self)
