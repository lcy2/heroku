# -*- coding: utf-8 -*-
# Generated by Django 1.11 on 2017-06-17 23:45
from __future__ import unicode_literals

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('splitter', '0030_auto_20170607_1655'),
    ]

    operations = [
        migrations.RenameField(
            model_name='segment',
            old_name='segment_lon',
            new_name='segment_lng',
        ),
    ]
