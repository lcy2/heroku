# -*- coding: utf-8 -*-
# Generated by Django 1.11 on 2017-06-29 04:57
from __future__ import unicode_literals

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('splitter', '0031_auto_20170617_1945'),
    ]

    operations = [
        migrations.AddField(
            model_name='trip',
            name='profile_svg',
            field=models.TextField(blank=True),
        ),
    ]
