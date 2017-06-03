from django.conf.urls import url
from . import views

app_name = "splitter"
urlpatterns = [
    url(r'^gateway/(?P<action>[a-z]+)$', views.gateway_switch),
    url(r'^$', views.index, name = 'index'),
    url(r'^(?P<pk>[0-9]+)$', views.trip_overview, name = 'trip_overview'),
    url(r'^(?P<pk>[0-9]+)/trip_edit$', views.trip_edit, name = 'trip_edit'),
    url(r'^(?P<pk>[0-9]+)/phototrek_edit$', views.phototrek_edit, name = 'phototrek_edit'),
    url(r'^(?P<pk>[0-9]+)/display$', views.phototrek, name = 'phototrek'),
]
