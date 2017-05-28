# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.contrib import admin
from .models import *

# Register your models here.
admin.site.register(Trip)
admin.site.register(Currency)
admin.site.register(Charge)
admin.site.register(Charge_Detail)
admin.site.register(Traveler)
admin.site.register(Segment)
admin.site.register(Segment_Detail)
