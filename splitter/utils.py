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
            #sys.stdout.write("checking grid %r, %r\r" % (location, grid_size))

            return (0 < location[0] < grid_size[0] - 1) and (0 < location[1] < grid_size[1] - 1)

        return in_grid(location, grid_size) and (not visited[location]) and ws_marker[location] == -1

    def reform_step(step):
        return tuple(zip(*step))

    class Contour_Branch(object):
        def __init__(self, starting_point, parent=None):
            self.parent = parent if parent else self
            self.children = []
            self.contour = [starting_point]
            self.killed = False

        def terminate(self):

            return self.parent._terminate(self)

        def _terminate(self, target):
            if target == self:
                raise ValueError("Trying to remove the root node")

            self.children.remove(target)
            if self.children or self.parent == self:
                return target.contour
            else:
                return target.contour + self.terminate()


        def get_full_contour_output(self):
            if self.parent == self:
                return map(lambda x: x[::-1], self.contour)
            else:
                return self.parent.get_full_contour_output() + map(lambda x: x[::-1], self.contour)

        def get_propogation_front(self):
            return self.contour[-1]

        def __repr__(self):
            return repr(self.contour[-1])

    output = []
    for i in xrange(n):
        # filter out the available border points
        avail_bp = filter(lambda x: not visited[x], border_points)

        # pick a random point on the border
        try:
            seed = random.choice(avail_bp)
        except IndexError:
            print "No more border points available."
            break

        # find the initial pointing
        branches = filter(lambda x: is_step_accessible(x, ws_marker.shape), [vector_add(seed, x) for x in directions])

        seed_ctr = 0

        # get a new seed if its location is bad
        while avail_bp and not branches and seed_ctr < 200:
            seed = random.choice(avail_bp)
            branches = filter(lambda x: is_step_accessible(x, ws_marker.shape), [vector_add(seed, x) for x in directions])
            seed_ctr += 1

        if not avail_bp or seed_ctr == 200:
            break

        visited[seed] = True
        visited[reform_step(branches)] = True

        contour_segments = []
        for branch in branches:
            # find the longest branch within this branch direction
            # use BFS, -> queue
            root = Contour_Branch(branch)
            queue = deque([root])
            printctr = 0
            while queue:
                printctr += 1
                if printctr % 100 == 0:
                    print "processing: point %d" % printctr

                cb = queue.popleft()
                step = cb.get_propogation_front()

                # are there next steps?
                next_steps = filter(lambda x: is_step_accessible(x, ws_marker.shape), [vector_add(step, x) for x in directions])

                # if there are no next steps, this is a short termination -> get rid of it
                if not next_steps:
                    if queue:
                        # also return its cells back to unvisited
                        unvisits = cb.terminate()
                        visited[reform_step(unvisits)] = False
                        continue
                    # if no more queue -> sole survivor, exit loop
                    contour_segments.append(np.array(cb.get_full_contour_output(), dtype=np.int32))
                    break

                # if there is only one branch, just keep on propagating
                if len(next_steps) == 1:
                    cb.contour.append(next_steps[0])
                    visited[next_steps[0]] = True
                    queue.append(cb)
                    continue

                # if branching occurs:
                for next_step in next_steps:
                    cb_next = Contour_Branch(next_step, cb)
                    cb.children.append(cb_next)
                    queue.append(cb_next)
                    visited[next_step] = True

        # rank according to how long the segments are
        # stitch together the longest two branches
        contour_segments.sort(key=lambda x: -x.shape[0])
        if len(contour_segments) > 1:
            output.append(np.concatenate((np.flipud(contour_segments[0]), np.array([seed[::-1]]), contour_segments[1]), 0))
            for cs in contour_segments[2:]:
                visited[reform_step([c[::-1] for c in cs])] = False
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
    #blurred = cv2.GaussianBlur(gray, (5, 5), 14)


    def shed_from_thresh(img, thresh):
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
        return markers

    ret, thresh = cv2.threshold(gray,0,255,cv2.THRESH_BINARY_INV+cv2.THRESH_OTSU)
    markers = shed_from_thresh(img, thresh)

    ret, thresh = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY | cv2.THRESH_OTSU)
    # put the borders from the second set of markers together
    markers[shed_from_thresh(img, thresh) == -1] = -1

    contours = navigate_points(markers, 10)
    # filter out the contours that are shorter than 5% of the longest contour
    if contours:
        min_contour_len = cv2.arcLength(contours[0], False) * 0.05
        contours = filter(lambda x: cv2.arcLength(x, False) >= min_contour_len, contours)

    bounds = ' '.join(reversed(map(str, markers.shape)))

    paths = []
    for contour in contours:
        epsilon = 0.001*cv2.arcLength(contour,False)
        approx = cv2.approxPolyDP(contour,epsilon,False)
        paths.append(svg_path_from_contour(approx))
    return (paths, bounds)

def watershed_all():
    trips = Trip.objects.all()
    for trip in trips:
        trip.profile_misc['svg'] = dict()
        trip.profile_misc['svg']['paths'], trip.profile_misc['svg']['bounds'] = watershed_image(trip.profile_pic)
        trip.save()
        print "Watershedded %s" % trip.trip_name

def process_charge(trip, travelers, charges):
    traveler_obj = {
        str(traveler.pk): {
            'index': index,
            'name': traveler.traveler_name,
            'pk': traveler.pk,
        } for index, traveler in enumerate(travelers)
    }
    return sorted([process_charge_helper(trip, traveler_obj, hash_val, charge) for hash_val, charge in charges.iteritems()], key=lambda x: x['time'])


def process_charge_helper(trip, travelers, hash_val, charge):
    payer = travelers[str(charge['payer'])]
    debtors = [travelers[str(x)] for x in charge['debtors']]
    currency = trip.accounting['currencies'][charge['currency']]['abbr']
    title = payer['name'] + " paid " + str(charge['amount']) + " " + currency + " for " + charge['description'] + '.'
    footnote = "Paid " + ', '.join([str(charge['breakdown'][str(x['pk'])]) + " " + currency + " for " + x['name'] for x in debtors]) + '.'
    if 'tip_rate' in charge:
        footnote += ' A ' + str(charge['tip_rate']) + "% tax and tip is included."
    newbreakdown = [(travelers[key]['index'], int(round(val / charge['amount'] * 100)), (str(val) + " " + currency), travelers[key]['name']) for key, val in charge['breakdown'].iteritems()]
    print newbreakdown
    return {'title': title, 'footnote': footnote, "breakdown": newbreakdown, 'hash_val': hash_val, 'time': charge['time']}
