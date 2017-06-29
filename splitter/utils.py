import cv2
import numpy as np
import urllib, random
from collections import deque
from .models import Trip
import sys

def navigate_points(ws_marker, n = 3):
    visited = np.zeros(shape = ws_marker.shape, dtype = bool)
    # -1 indicates borders
    border_y, border_x = np.where((ws_marker == -1) & (visited == False))

    border_points = zip(border_y, border_x)
    directions = [(-1, 0), (-1, 1), (0, 1), (1, 1), (1, 0), (1, -1), (0, -1), (-1, -1)]

    def vector_add(a, b):
        return tuple([ai + bi for ai, bi in zip(a, b)])

    def is_step_accessible(location, grid_size):
        def in_grid(location, grid_size):
            sys.stdout.write("checking grid %r, %r\r" % (location, grid_size))

            return (0 < location[0] < grid_size[0] - 1) and (0 < location[1] < grid_size[1] - 1)

        return in_grid(location, grid_size) and (not visited[location]) and ws_marker[location] == -1

    def reform_step(step):
        return tuple(zip(*step))


    output = []
    for i in xrange(n):
        # pick a random point on the border
        seed = random.choice(border_points)

        # find the initial pointing
        branches = filter(lambda x: is_step_accessible(x, ws_marker.shape), [vector_add(seed, x) for x in directions])

        seed_ctr = 0
        # get a new seed if its location is bad
        while not branches and seed_ctr < 100:
            seed = random.choice(border_points)
            branches = filter(lambda x: is_step_accessible(x, ws_marker.shape), [vector_add(seed, x) for x in directions])
            seed_ctr += 1

        if seed_ctr == 100:
            break

        visited[seed] = True
        visited[reform_step(branches)] = True

        contour_segments = []
        for branch in branches:
            # find the longest branch within this branch direction
            # use DFS, -> queue
            queue = deque([(branch, 'b')])
            listings = dict()
            listings['b'] = [branch[::-1]]
            last_id = 'b'

            while queue:
                print queue
                step, id = queue.popleft()
                last_id = id

                # are there next steps?
                next_steps = filter(lambda x: is_step_accessible(x, ws_marker.shape), [vector_add(step, x) for x in directions])

                if not next_steps:
                    if queue:
                        del listings[id]
                    # if no more queue -> sole survivor, exit loop
                    continue

                # if there is only one branch, just keep on propagating
                if len(next_steps) == 1:
                    queue.append((next_steps[0], id))
                    listings[id].append(next_steps[0][::-1])
                    visited[next_steps[0]] = True
                    continue

                # if branching occurs:
                trajectory = listings.pop(id)
                for i, next_step in enumerate(next_steps):
                    new_id = id + str(i)
                    queue.append((next_step, new_id))
                    visited[next_step] = True
                    listings[new_id] = trajectory[:]
                    listings[new_id].append(next_step[::-1])


            contour_segments.append(np.array(listings[last_id], dtype=np.int32))

        # rank according to how long the segments are
        contour_segments.sort(key=lambda x: -x.shape[0])
        if len(contour_segments) > 1:
            output.append(np.concatenate((np.flipud(contour_segments[0]), contour_segments[1]), 0))
        elif len(contour_segments) == 1:
            output.append(contour_segments[0])
        else:
            print "No contours found"
    return output


def svg_path_from_contour(contour):
    output = "M %.0f,%.0f" % (contour[0,0,0], contour[0,0,1])
    for point in contour[1:]:
        output += "L %.0f,%.0f" % (point[0,0], point[0, 1])
    return output

def cv_img_from_url(url):
    resp = urllib.urlopen(url)
    img = np.asarray(bytearray(resp.read()), dtype="uint8")
    img = cv2.imdecode(img, cv2.IMREAD_COLOR)
    return img


#https://lh3.googleusercontent.com/-zjf3sU5qBK4/WR89EhyfckI/AAAAAAAAUGg/bSPi6u0tRewCXj7uy2pn1WodvFus81hygCHM/s1600/PANO_20160507_175518.jpg
def watershed_image(url):
    img = cv_img_from_url(url)
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    blurred = cv2.GaussianBlur(gray, (5, 5), 14)

    ret, thresh = cv2.threshold(gray,0,255,cv2.THRESH_BINARY_INV+cv2.THRESH_OTSU)

    kernel = np.ones((3,3),np.uint8)
    opening = cv2.morphologyEx(thresh,cv2.MORPH_OPEN,kernel, iterations = 2)

    # sure background area
    sure_bg = cv2.dilate(opening,kernel,iterations=3)

    # Finding sure foreground area
    dist_transform = cv2.distanceTransform(opening,cv2.DIST_L2,5)
    ret, sure_fg = cv2.threshold(dist_transform,0.7*dist_transform.max(),255,0)

    # Finding unknown region
    sure_fg = np.uint8(sure_fg)
    unknown = cv2.subtract(sure_bg,sure_fg)

    # Marker labelling
    ret, markers = cv2.connectedComponents(sure_fg)

    # Add one to all labels so that sure background is not 0, but 1
    markers = markers+1

    # Now, mark the region of unknown with zero
    markers[unknown==255] = 0

    markers = cv2.watershed(img,markers)

    contours = navigate_points(markers, 10)
    new_img = img.copy()

    output = []
    for contour in contours:
        epsilon = 0.001*cv2.arcLength(contour,False)
        approx = cv2.approxPolyDP(contour,epsilon,False)
        output.append(svg_path_from_contour(approx))
    return output

def watershed_all():
    trips = Trip.objects.all()
    for trip in trips:
        trip.profile_misc['svg'] = watershed_image(trip.profile_pic)
        trip.save()
        print "Watershedded %s" % trip.trip_name
