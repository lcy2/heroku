# -*- coding: utf-8 -*-
# Generated by Django 1.11 on 2017-05-25 21:35
from __future__ import unicode_literals

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('splitter', '0021_auto_20170525_0308'),
    ]

    operations = [
        migrations.AlterField(
            model_name='segment',
            name='segment_end',
            field=models.DateField(blank=True, null=True),
        ),
        migrations.AlterField(
            model_name='segment',
            name='segment_start',
            field=models.DateField(blank=True, null=True),
        ),
    ]
