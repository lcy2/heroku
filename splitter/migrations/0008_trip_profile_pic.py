# -*- coding: utf-8 -*-
# Generated by Django 1.11 on 2017-05-04 16:33
from __future__ import unicode_literals

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('splitter', '0007_traveler_traveler_name'),
    ]

    operations = [
        migrations.AddField(
            model_name='trip',
            name='profile_pic',
            field=models.URLField(default='https://unsplash.it/200/300/?random'),
        ),
    ]
