from django.conf.urls import url
from . import views, gateway

app_name = "splitter"
urlpatterns = [
    url(r'^gateway/(?P<action>[a-z]+)$', views.gateway_switch, name = 'gateway'),
    url(r'^outward$', views.outward, name = 'outward'),
    url(r'^$', views.index, name = 'index'),
    url(r'^(?P<pk>[0-9]+)$', views.trip_overview, name = 'trip_overview'),
    url(r'^(?P<pk>[0-9]+)/trip_edit$', views.trip_edit, name = 'trip_edit'),
    url(r'^(?P<pk>[0-9]+)/display$', views.phototrek, name = 'phototrek'),
    url(r'^(?P<pk>[0-9]+)/phototrek_edit$', views.phototrek_edit, name = 'phototrek_edit'),
    url(r'^(?P<pk>[0-9]+)/charges$', views.charges, name = 'trip_charges'),
    url(r'^(?P<pk>[0-9]+)/edit_currencies$', views.edit_currencies, name = 'edit_currencies'),
    url(r'^(?P<pk>[0-9]+)/init_charges$', gateway.init_charges, name = 'init_charges'),
    url(r'^(?P<trav>[a-zA-z]+)/display$', views.traveler, name = 'traveler'),
    url(r'^newtrip$', views.new_trip, name = 'new_trip'),
    url(r'^newtrip2$', gateway.new_trip, name = 'new_trip2'),
    url(r'^tripplan$', views.trip_plan, name="trip_plan"),
    url(r'^debug$', views.debug, name="debug"),
]
