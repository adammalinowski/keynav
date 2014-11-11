/*

todo
- todo deactivate keyboard when focused in contenteditable
- handling for links that wrap onto two lines?
- make highlighting use border/outline, but in a way that works with overflow: hidden?
  - not going well. firefox's default link focus is a hard-to-see dotted line, that just used
    css outline, and thus fails if the link has overflow:hidden. box-shadow has same issue.
- somehow make enter work for elements that aren't real links but expect mouse
  - note looks like you can't just trigger because content script cannot trigger page script
    https://developer.mozilla.org/en-US/Add-ons/SDK/Guides/Content_Scripts/Interacting_with_page_scripts

*/

$(document).ready(function() {

var $activeLink = undefined;
var activeLinkEdges = undefined;
var originalBackgroundColour = undefined;
var originalOutline = undefined;

function updateOriginalBackgroundColour() {
    originalBackgroundColour = ($activeLink.css('background-color') || 'inherit');
    originalOutline = ($activeLink.css('outline') || 'none');
}

function highlightLink() {
    $activeLink.css('background-color', '#5B9DD9');
    $activeLink.css('outline', '2px solid #5B9DD9');
}

function resetLink(){
    $activeLink.css('background-color', originalBackgroundColour);
    $activeLink.css('outline', originalOutline);
}

function updateActiveLinkEdges(link) {
    var rect = $activeLink[0].getBoundingClientRect()
    activeLinkEdges = {
        'top': rect.top + window.pageYOffset,
        'bottom': rect.bottom + window.pageYOffset,
        'left': rect.left + window.pageXOffset,
        'right': rect.right + window.pageXOffset
    }
}

// onload, pre-compute all link edges
var linkIndexToEdges, linkIndexToLinks;
var computing = false;
var pageYOffset = window.pageYOffset;
var pagexOffset = window.pageXOffset;
function computeLinks() {
    if (computing) return;  // do not recompute if already underway
    start = performance.now()
    computing = true;
    // as an optimization, do not calculate correct position of links at this point,
    // (i.e. add scroll offsets) instead subtract offsets when doing getNextLink
    pageYOffset = window.pageYOffset;
    pagexOffset = window.pageXOffset;
    linkIndexToEdges = []
    linkIndexToLinks = []
    var links = document.getElementsByTagName('a');
    console.log('found ' + links.length)
    for(var i = 0, l = links.length; i < l; i++) {
        var link = links[i];
        if (!(link.offsetWidth > 0 && link.offsetHeight > 0)) continue;  // must be visible
        linkIndexToLinks.push(link);
        linkIndexToEdges.push(link.getBoundingClientRect());
    }
    computing = false;
    end = performance.now()
    console.log('done in ' + (end-start))
}
computeLinks();

function getWindowEdges() {
    // do not use jquery for viewport dimensions, returns document dimensions if no doctype
    return {
            'top': $(window).scrollTop(),
            'bottom': $(window).scrollTop() + window.innerHeight,
            'left': $(window).scrollLeft(),
            'right': $(window).scrollLeft() + window.innerWidth
        }
}

function recomputeLinks() {
    computeLinks();
    if ($activeLink) updateActiveLinkEdges();
}

// recompute when window changes
$(window).resize(function(){
    recomputeLinks();
})

// when DOM changes, set flag to recompute on next link change - do not recompute immediately to avoid
// wasteful recomputing when script make lots of successive DOM changes
var domChanged = false;
var MutationObserver = window.MutationObserver || window.WebKitMutationObserver || window.MozMutationObserver;
var obs = new MutationObserver(function(mutations, observer){
    mutations.every(function(mutation) {
        // hacky bugfix - some sites do a weird thing where one text node changes to the same thing on every scroll...
        if ((mutation.addedNodes.length == 1 && mutation.addedNodes.item(0).nodeType == 3)
            || (mutation.removedNodes.length == 1 && mutation.removedNodes.item(0).nodeType == 3)) {
            return false;
        }
        domChanged = true;
        return false;
    });

});
obs.observe(document, {childList: true, subtree: true})

function adjustScroll() {
    // if link is off-screen, scroll

    var windowEdges = getWindowEdges();

    // if link is beyond bottom
    if (activeLinkEdges.bottom > windowEdges.bottom) {
        $(window).scrollTop(activeLinkEdges.bottom - window.innerHeight + 10);
    }

    // if link is beyond top
    if (activeLinkEdges.top < windowEdges.top) {
        $(window).scrollTop(activeLinkEdges.top - 10);
    }

    // if link is beyond left
    if (activeLinkEdges.left < windowEdges.left) {
        $(window).scrollLeft(activeLinkEdges.left - 50);
    }

    // if link is beyond right
    if (activeLinkEdges.right > windowEdges.right) {
        $(window).scrollLeft(activeLinkEdges.left - 50);
    }
}

function hozOverlap(activeEdges, otherEdges) {
    // if active link left-most point is between left & right of other link
    if (activeEdges.left > otherEdges.left && activeEdges.left < otherEdges.right) return true
    // if active link right-most point is between left & right of other link
    if (activeEdges.right > otherEdges.left && activeEdges.right < otherEdges.right) return true
    // if active link completely encompasses other link
    if (activeEdges.left <= otherEdges.left && activeEdges.right >= otherEdges.right) return true
    return false
}

function vertOverlap(activeEdges, otherEdges) {
    // if active link top-most point is between top & bottom of other link
    if (activeEdges.top > otherEdges.top && activeEdges.top < otherEdges.bottom) return true
    // if active link bottom-most point is between top & bottom of other link
    if (activeEdges.bottom > otherEdges.top && activeEdges.bottom < otherEdges.bottom) return true
        // if active link completely encompasses other link
    if (activeEdges.top <= otherEdges.top && activeEdges.bottom >= otherEdges.bottom) return true
    return false
}

function hozNearness(activeEdges, otherEdges) {
    // if there is any overlap: 0; otherwise closest point
    if (hozOverlap(activeEdges, otherEdges)) {
        return 0
    } else if (activeEdges.right < otherEdges.left) {
        return otherEdges.left - activeEdges.right;
    } else {
        return activeEdges.left - otherEdges.right;
    }
}

function vertNearness(activeEdges, otherEdges) {
    // if there is any overlap: 0; otherwise closest point
    if (vertOverlap(activeEdges, otherEdges)) {
        return 0
    } else if (activeEdges.bottom < otherEdges.top) {
        return otherEdges.top - activeEdges.bottom;
    } else {
        return activeEdges.top - otherEdges.bottom;
    }
}

function hozDistance(activeEdges, otherEdges) {
    if (activeEdges.left > otherEdges.right) {
        return activeEdges.left - otherEdges.right;
    } else if (activeEdges.right < otherEdges.left) {
        return otherEdges.left - activeEdges.right;
    } else {
        return 0; // overlap - shouldn't happen if pos works...
    }
}

function vertDistance(activeEdges, otherEdges) {
    if (activeEdges.top > otherEdges.bottom) {
        return activeEdges.top - otherEdges.bottom;
    } else if (activeEdges.bottom < otherEdges.top) {
        return otherEdges.top - activeEdges.bottom;
    } else {
        return 0; // overlap - shouldn't happen if pos works...
    }
}

function vertFitness(activeEdges, foundEdges) {
    return vertDistance(activeEdges, foundEdges) + (hozNearness(activeEdges, foundEdges) * 2.5)
}

function hozFitness(activeEdges, foundEdges) {
    return hozDistance(activeEdges, foundEdges) + (vertNearness(activeEdges, foundEdges) * 2.5)
}

function getNextLink(direction) {

    if (domChanged) {
        recomputeLinks();
        domChanged = false;
    }
    var windowEdges = getWindowEdges()
    if ($activeLink) {
        var linkVisible = (activeLinkEdges.bottom > windowEdges.top && activeLinkEdges.top < windowEdges.bottom && activeLinkEdges.right > windowEdges.left && activeLinkEdges.left < windowEdges.right)
    }

    // if no active link, or link is off-screen, find link to activate
    if (!$activeLink || !linkVisible) {
        var activeEdges = windowEdges;  // we want to check pos against the window edges

        // fake a 1px high link at top or bottom of screen, make fitness be vertically closest to fake link
        if (direction == 'up') {
            activeEdges.top = activeEdges.bottom
            var fitness = function(activeEdges, foundEdges) { return activeEdges.top - foundEdges.bottom; }
        } else {
            activeEdges.bottom = activeEdges.top
            var fitness = function(activeEdges, foundEdges) { return foundEdges.top - activeEdges.bottom; }
        }
    } else {
        var activeEdges = activeLinkEdges;   // we want to check pos against the active link edges
    }

    // optimization: instead of calculating actual link position for all links on the page
    // subtract from edges of thing we are comparing to
    activeEdges = {
        'top': activeEdges.top - pageYOffset,
        'bottom': activeEdges.bottom - pageYOffset,
        'left': activeEdges.left - pageXOffset,
        'right': activeEdges.right - pageXOffset
    }

    // apply pixel-tweaks to allow moving to adjacent link, define pos func to find links in valid position
    if (direction == 'left') {
        var pos = function(activeEdges, foundEdges) { return foundEdges.right < activeEdges.left; }
    } else if (direction == 'right') {
        activeEdges.right -= 1;
        var pos = function(activeEdges, foundEdges) { return foundEdges.left > activeEdges.right; }
    } else if (direction == 'up') {
        activeEdges.top += 1;
        var pos = function(activeEdges, foundEdges) { return foundEdges.bottom < activeEdges.top; }
    } else if (direction == 'down') {
        activeEdges.bottom -= 1;
        var pos = function(activeEdges, foundEdges) { return foundEdges.top > activeEdges.bottom; }
    }

    if (direction == 'up' || direction == 'down') fitness = vertFitness;
    if (direction == 'left' || direction == 'right') fitness = hozFitness;

    // loop through all links, find those with appropriate position, find best link from those
    var bestLink = undefined;
    var bestEdges = undefined;
    for (i = 0; i < linkIndexToEdges.length; ++i) {
        var foundEdges = linkIndexToEdges[i]
        // first check link is in valid position
        if (!pos(activeEdges, foundEdges)) continue;
        if (!bestLink) {
            // if we haven't yet found a link satisfying pos, take the first we find
            bestLink = linkIndexToLinks[i];
            bestEdges = foundEdges;
        // todo: handling for if equal (or very close...)
        } else if (fitness(activeEdges, foundEdges) < fitness(activeEdges, bestEdges)) {
            // compare the current best link with the next link
            // if the found link is better than the best link, replace (lower is better)
            bestLink = linkIndexToLinks[i];
            bestEdges = foundEdges;
        }
    }
    if (!bestLink) return;
    if ($activeLink) resetLink();
    $activeLink = $(bestLink);
    updateActiveLinkEdges();
    updateOriginalBackgroundColour();
    highlightLink()
    adjustScroll();
}

// note delay is needed to avoid active link highlight disappearing when holding down movement key
var delaying = false;
function getNextLinkDelay(direction) {
    if (delaying) return false
    delaying = true;
    setTimeout(function() { getNextLink(direction); delaying = false; }, 10)
}

function getActiveLinkUrl() {
    return $activeLink.get(0).href
}

$(window).bind('keydown', function(e){

    // if currently focused in input/textarea, disable keyboard shortcuts
    if ($("input:focus,textarea:focus").length) {
        return;
    }

    if (e.which == 27) {  // escape to deactivate
        if ($activeLink) {
            resetLink();
            $activeLink = undefined;
        }
        e.preventDefault();
    }

    if (e.shiftKey && e.which == 37) {
        getNextLinkDelay('left');
        e.preventDefault();
    }

    if (e.shiftKey && e.which == 39) {
        getNextLinkDelay('right');
        e.preventDefault();
    }

    if (e.shiftKey && e.which == 38) {
        getNextLinkDelay('up');
        e.preventDefault();
    }

    if (e.shiftKey && e.which == 40) {
        getNextLinkDelay('down');
        e.preventDefault();
    }

    // enter to open link
    if (e.which == 13) {
        if ($activeLink) {
            if (e.shiftKey) {
                if (e.ctrlKey) {
                    self.port.emit("open-new-background-tab", getActiveLinkUrl());
                } else {
                    self.port.emit("open-new-tab", getActiveLinkUrl());
                }
            } else {
                self.port.emit("open", getActiveLinkUrl());
            }
            e.preventDefault();
        }
    }

});

});