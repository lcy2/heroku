from django.contrib import messages
from django.http import JsonResponse, HttpResponseRedirect
from django.shortcuts import render, redirect
from django.urls import reverse

from .models import Trip


def check_trip_access(enforce_edit):
    """Make sure the user has access to the trip

    passing the resultant trip to the view function
    also appending the editable permission to the context upon its return
    """
    def real_decorator(fun):
        def wrapper(request, pk, **kwargs):
            try:
                trip = Trip.objects.get(pk = pk)
            except Trip.DoesNotExist:
                messages.error(request, "This trip does not exist.")
                return redirect('splitter:index')
            editable = False
            # if the user is not logged in
            if trip.is_private and (not request.user or request.user.is_anonymous()):
                messages.info(request, "Please log in.")
                return HttpResponseRedirect(reverse('login') + '?next='+request.path)

            editors = set([trav.user for trav in trip.travelers.all() if trav.user])
            if request.user in editors:
                editable = True
            elif ((request.user in trip.authorized_viewers.all()) or (not trip.is_private)) and not enforce_edit:
                pass
            else:
                # if this user is not authorized
                # return to splitter:index with a message
                messages.error(request, "You are not authorized to view " + trip.trip_name + ".")
                return redirect('splitter:index')

            return fun(request, trip, editable, **kwargs)
        return wrapper
    return real_decorator


def check_trip_access_json(enforce_edit):
    """Make sure the user has access to the trip

    passing the resultant trip to the view function
    """
    def real_decorator(fun):
        def wrapper(request, pk, **kwargs):
            try:
                trip = Trip.objects.get(pk = pk)
            except Trip.DoesNotExist:
                return JsonResponse({'message': 'Trip does not exist'}, status = 404)
            # if the user is not logged in for a private trip
            if trip.is_private and (not request.user or request.user.is_anonymous()):
                return JsonResponse({'message': 'User not logged in.'}, status = 403)

            editors = set([trav.user for trav in trip.travelers.all() if trav.user])
            if request.user in editors:
                return fun(request, trip, **kwargs)
            elif ((request.user in trip.authorized_viewers.all()) or (not trip.is_private)) and not enforce_edit:
                return fun(request, trip, **kwargs)
            # if this user is not authorized
            # return to splitter:index with a message
            return JsonResponse({'message': "You're not authorized"}, status = 403)

        return wrapper
    return real_decorator
