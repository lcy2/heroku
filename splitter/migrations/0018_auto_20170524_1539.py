# -*- coding: utf-8 -*-
# Generated by Django 1.11 on 2017-05-24 19:39
from __future__ import unicode_literals

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('splitter', '0017_auto_20170524_1535'),
    ]

    operations = [
        migrations.AlterField(
            model_name='segment',
            name='segment_lat',
            field=models.FloatField(blank=True),
        ),
        migrations.AlterField(
            model_name='segment',
            name='segment_lon',
            field=models.FloatField(blank=True),
        ),
    ]
