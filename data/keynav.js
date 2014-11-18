$(document).ready(function() {


// the active, highlighted link, with methods for deactivating and updating
var activeLink = {

    link: undefined,

    get active() { return (typeof this.link !== 'undefined'); },

    get url() { return this.link.get(0).href; },

    visible: function(viewportEdges) {
        return (this.edges.bottom > viewportEdges.top
                && this.edges.top < viewportEdges.bottom
                && this.edges.right > viewportEdges.left
                && this.edges.left < viewportEdges.right); },

    updateEdges: function() {
        if (!this.link) return;
        var rect = this.link[0].getBoundingClientRect();
        this.edges = {
            'top': rect.top + window.pageYOffset,
            'bottom': rect.bottom + window.pageYOffset,
            'left': rect.left + window.pageXOffset,
            'right': rect.right + window.pageXOffset
        };
    },

    saveOriginalCss: function() {
        this.originalBackgroundColour = (this.link.css('background-color') || 'inherit');
        this.originalOutline = (this.link.css('outline') || 'none');
    },

    highlight: function() {
        this.link.css('background-color', '#5B9DD9');
        this.link.css('outline', '2px solid #5B9DD9');
    },

    reset: function() {
        this.link.css('background-color', this.originalBackgroundColour);
        this.link.css('outline', this.originalOutline);
        this.link = undefined;
    },

    setLink: function(link) {
        if (this.link) this.reset();
        this.link = link;
        this.updateEdges();
        this.saveOriginalCss();
        this.highlight();
    }
}


// compute all links & their edges (positions in the document)
var allLinks = {

    computing: false,

    compute: function() {
        if (this.computing) return;  // do not recompute if already underway
        this.computing = true;
        // as an optimization, do not calculate correct position of links at this point,
        // (i.e. add scroll offsets) instead save offsets at this point, then subtract when doing getNextLink
        this.pageYOffset = window.pageYOffset;
        this.pageXOffset = window.pageXOffset;
        this.linkIndexToEdges = [];
        this.linkIndexToLinks = [];
        var links = document.getElementsByTagName('a');
        for(var i = 0, l = links.length; i < l; i++) {
            var link = links[i];
            if (!(link.offsetWidth > 0 && link.offsetHeight > 0)) continue;  // must be visible
            this.linkIndexToLinks.push(link);
            this.linkIndexToEdges.push(link.getBoundingClientRect());
        }
        this.computing = false;
    },

    recompute: function() {
        this.compute();
        activeLink.updateEdges();
    }
}
allLinks.compute();  // onload, pre-compute all link edges


function getViewportEdges() {
    // do not use jquery for window dimensions, returns document dimensions if no doctype
    return {
            'top': window.pageYOffset,
            'bottom': window.pageYOffset + window.innerHeight,
            'left': window.pageXOffset,
            'right': window.pageXOffset + window.innerWidth
        };
}


// recompute when window changes
$(window).resize(function(){
    allLinks.recompute();
})


// watch the DOM and keep track of changes
function DomWatch(){

    // when DOM changes, set flag to recompute on next link change - do not recompute immediately to avoid
    // wasteful recomputing when script make lots of successive DOM changes
    this.domChanged = false;
    this.MutationObserver = window.MutationObserver || window.WebKitMutationObserver || window.MozMutationObserver;
    var that = this;

    var obs = new MutationObserver(function(mutations, observer){
        mutations.every(function(mutation) {
            // hacky bugfix - some sites do a weird thing where one text node changes to the same thing on every scroll...
            if ((mutation.addedNodes.length == 1 && mutation.addedNodes.item(0).nodeType == 3)
                || (mutation.removedNodes.length == 1 && mutation.removedNodes.item(0).nodeType == 3)) {
                return false;
            }
            that.domChanged = true;
            return false;
        });

    });

    obs.observe(document, {childList: true, subtree: true});
}
var domWatch = new DomWatch();


// if active link is off-screen, scroll to make it visible
function adjustScroll() {

    var viewportEdges = getViewportEdges();

    // if link is beyond bottom
    if (activeLink.edges.bottom > viewportEdges.bottom) {
        $(window).scrollTop(activeLink.edges.bottom - window.innerHeight + 10);
    }

    // if link is beyond top
    if (activeLink.edges.top < viewportEdges.top) {
        $(window).scrollTop(activeLink.edges.top - 10);
    }

    // if link is beyond left
    if (activeLink.edges.left < viewportEdges.left) {
        $(window).scrollLeft(activeLink.edges.left - 50);
    }

    // if link is beyond right
    if (activeLink.edges.right > viewportEdges.right) {
        $(window).scrollLeft(activeLink.edges.left - 50);
    }
}


// methods for comparing two links, to find which is better
function CompareLinks(plane) {

    this.hozOverlap = function(activeEdges, otherEdges) {
        // if active link left-most point is between left & right of other link
        if (activeEdges.left > otherEdges.left && activeEdges.left < otherEdges.right) return true;
        // if active link right-most point is between left & right of other link
        if (activeEdges.right > otherEdges.left && activeEdges.right < otherEdges.right) return true;
        // if active link completely encompasses other link
        if (activeEdges.left <= otherEdges.left && activeEdges.right >= otherEdges.right) return true;
        return false;
    }

    this.vertOverlap = function(activeEdges, otherEdges) {
        // if active link top-most point is between top & bottom of other link
        if (activeEdges.top > otherEdges.top && activeEdges.top < otherEdges.bottom) return true;
        // if active link bottom-most point is between top & bottom of other link
        if (activeEdges.bottom > otherEdges.top && activeEdges.bottom < otherEdges.bottom) return true;
            // if active link completely encompasses other link
        if (activeEdges.top <= otherEdges.top && activeEdges.bottom >= otherEdges.bottom) return true;
        return false;
    }

    this.hozNearness = function(activeEdges, otherEdges) {
        // if there is any overlap: 0; otherwise closest point
        if (this.hozOverlap(activeEdges, otherEdges)) {
            return 0;
        } else if (activeEdges.right < otherEdges.left) {
            return otherEdges.left - activeEdges.right;
        } else {
            return activeEdges.left - otherEdges.right;
        }
    }

    this.vertNearness = function(activeEdges, otherEdges) {
        // if there is any overlap: 0; otherwise closest point
        if (this.vertOverlap(activeEdges, otherEdges)) {
            return 0;
        } else if (activeEdges.bottom < otherEdges.top) {
            return otherEdges.top - activeEdges.bottom;
        } else {
            return activeEdges.top - otherEdges.bottom;
        }
    }

    this.hozDistance = function(activeEdges, otherEdges) {
        if (activeEdges.left > otherEdges.right) {
            return activeEdges.left - otherEdges.right;
        } else if (activeEdges.right < otherEdges.left) {
            return otherEdges.left - activeEdges.right;
        } else {
            throw 'invalid hozDistance';
        }
    }

    this.vertDistance = function(activeEdges, otherEdges) {
        if (activeEdges.top > otherEdges.bottom) {
            return activeEdges.top - otherEdges.bottom;
        } else if (activeEdges.bottom < otherEdges.top) {
            return otherEdges.top - activeEdges.bottom;
        } else {
            throw 'invalid vertDistance';
        }
    }

    this.vertFitness = function(activeEdges, foundEdges) {
        return this.vertDistance(activeEdges, foundEdges) + (this.hozNearness(activeEdges, foundEdges) * 2.5);
    }

    this.hozFitness = function(activeEdges, foundEdges) {
        return this.hozDistance(activeEdges, foundEdges) + (this.vertNearness(activeEdges, foundEdges) * 2.5);
    }

    if (plane == 'vertical') {
        this.fitness = this.vertFitness;
    } else {
        this.fitness = this.hozFitness;
    }

    this.foundBeatsBest = function(activeEdges, foundEdges, bestEdges) {
        // todo: handling for if equal (or very close...)
        return (this.fitness(activeEdges, foundEdges) < this.fitness(activeEdges, bestEdges));
    }
}


// find if a link is offscreen beyond a given threshold
function tooFarOffscreen(viewportEdges, foundEdges, tooFar) {
    if (foundEdges.bottom < viewportEdges.top - tooFar) return true;
    if (foundEdges.top > viewportEdges.bottom + tooFar) return true;
    if (foundEdges.left > viewportEdges.right + tooFar) return true;
    if (foundEdges.right < viewportEdges.left - tooFar) return true;
    return false;
}


function simpleCopy(obj) {
    var newObj = {};
    for (var key in obj) newObj[key] = obj[key];
    return newObj;
}


// when a direction key is pressed, decide which link to activate
function getNextLink(direction) {

    // if DOM has changed, need to recompute positions of links
    if (domWatch.domChanged) {
        allLinks.recompute();
        domWatch.domChanged = false;
    }

    var viewportEdges = getViewportEdges();

    if (!activeLink.active || !activeLink.visible(viewportEdges)) {

        // if no active link or link is off-screen, find link to activate by imitating
        // a link at some point in the screen, depending on direction pressed
        var activeEdges = simpleCopy(viewportEdges);
        if (direction == 'up') {
            // imitate a 0-size link at bottom-left-middle of screen
            activeEdges.top = activeEdges.bottom;
            var middle = (activeEdges.right - activeEdges.left) / 4;
            activeEdges.left = middle;
            activeEdges.right = middle;
        } else {
            // imitate a 0-size link at appropriate corner of screen
            activeEdges.bottom = activeEdges.top;
            if (direction == 'down' || direction == 'right') {
                // start at top-left, find right
                activeEdges.right = activeEdges.left;
            } else if (direction == 'left') {
                // start at top-right, find left
                activeEdges.left = activeEdges.right;
            }
        }
        var tooFar = 0;  // do not find any links off-screen

    } else {
        // find link relative to activelink, at most 250px off screen
        var tooFar = 250;
        var activeEdges = activeLink.edges;
    }

    // optimization: instead of calculating actual link position for every link on the page
    // by adding scroll offset to their position found when running allLinks.compute(),
    // instead _subtract_ that offset from edges we are comparing them to, so the calculation
    // only has to happen once, instead of for every link.
    activeEdges = {
        'top': activeEdges.top - allLinks.pageYOffset,
        'bottom': activeEdges.bottom - allLinks.pageYOffset,
        'left': activeEdges.left - allLinks.pageXOffset,
        'right': activeEdges.right - allLinks.pageXOffset
    };
    offsetViewportEdges = {
        'top': viewportEdges.top - allLinks.pageYOffset,
        'bottom': viewportEdges.bottom - allLinks.pageYOffset,
        'left': viewportEdges.left - allLinks.pageXOffset,
        'right': viewportEdges.right - allLinks.pageXOffset
    };

    // apply pixel-tweaks to allow moving to adjacent link.
    // also define validPos func to find links in valid position (e.g. left on active link)
    if (direction == 'left') {
        var validPos = function(activeEdges, foundEdges) { return foundEdges.right < activeEdges.left; }
    } else if (direction == 'right') {
        activeEdges.right -= 1;
        var validPos = function(activeEdges, foundEdges) { return foundEdges.left > activeEdges.right; }
    } else if (direction == 'up') {
        activeEdges.top += 1;
        var validPos = function(activeEdges, foundEdges) { return foundEdges.bottom < activeEdges.top; }
    } else if (direction == 'down') {
        activeEdges.bottom -= 1;
        var validPos = function(activeEdges, foundEdges) { return foundEdges.top > activeEdges.bottom; }
    }

    if (direction == 'up' || direction == 'down') compareLinks = new CompareLinks('vertical');
    if (direction == 'left' || direction == 'right') compareLinks = new CompareLinks('horizontal');

    // loop through all links, find those with appropriate position, find best link from those
    var bestLink = undefined;
    var bestEdges = undefined;
    for (i = 0; i < allLinks.linkIndexToEdges.length; ++i) {

        var foundLink = allLinks.linkIndexToLinks[i];
        var foundEdges = allLinks.linkIndexToEdges[i];

        // first check link is in valid position
        if (!validPos(activeEdges, foundEdges)) continue;

        // check if link isn't too far off screen
        if (tooFarOffscreen(offsetViewportEdges, foundEdges, tooFar)) continue;

        // if we haven't yet found a link satisfying validPos, take the first we find
        if (!bestLink) {
            bestLink = foundLink;
            bestEdges = foundEdges;

        // compare the current best link with the next link, if found link is better than best link, replace
        } else if (compareLinks.foundBeatsBest(activeEdges, foundEdges, bestEdges)) {
            bestLink = foundLink;
            bestEdges = foundEdges;
        }
    }
    if (!bestLink) return;
    activeLink.setLink($(bestLink));
    adjustScroll();
}


// note delay is needed to avoid active link highlight disappearing when holding down a movement key
var delaying = false;
function getNextLinkDelay(direction) {
    if (delaying) return false;
    delaying = true;
    setTimeout(function() { getNextLink(direction); delaying = false; }, 10);
}


var browserIsChrome = (typeof chrome !== 'undefined');


// handle keypresses
$(window).bind('keydown', function(e){

    // if currently focused in input, textarea, or contenteditable, disable keyboard shortcuts
    var focusNode = document.activeElement;
    if (focusNode.nodeName == "INPUT"
        || focusNode.nodeName == "TEXTAREA"
        || focusNode.getAttribute("contenteditable") == 'true') {
        return;
    }

    if (e.which == 27) {  // escape to deactivate
        activeLink.reset();
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
        if (activeLink) {
            if (e.shiftKey) {
                if (e.ctrlKey) {
                    if (browserIsChrome) {
                        chrome.runtime.sendMessage({"openNewBackgroundTab": activeLink.url });
                    } else {
                        self.port.emit("open-new-background-tab", activeLink.url);
                    }
                } else {
                    if (browserIsChrome) {
                        chrome.runtime.sendMessage({"openNewTab": activeLink.url});
                    } else {
                        self.port.emit("open-new-tab", activeLink.url);
                    }
                }
            } else {
                if (browserIsChrome) {
                    chrome.runtime.sendMessage({"open": activeLink.url});
                } else {
                    self.port.emit("open", activeLink.url);
                }
            }
            e.preventDefault();
        }
    }

});

});