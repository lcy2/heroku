from django.conf.urls import url
from . import views


app_name = "splitter"
urlpatterns = [
    url(r'^$', views.index, name = 'index'),
    url(r'^(?P<pk>[0-9]+)/$', views.trip, name = 'trip'),
    url(r'^(?P<pk>[0-9]+)/edit$', views.trip_edit, name = 'trip_edit'),
]
