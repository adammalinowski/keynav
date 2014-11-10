/*


when you move horizontally, you want to move in current plane
- and failing that wrap around, or possibly just don't move

when you move vertically, is a bit more complicated.
  - guess you want to go to the next link beneth it's bottom-left position. or maybe its middle.
- guess you want to go in that plane, mostly? i.e. not stray too much horizontally

but you still need to be able to move around A-B-C at will...

     A


										B


     C

start with whatever is simplest, and see what happens. this is the hard part. first get everything else working

todo
- handling for links that wrap onto two lines
- make highlighting use border/outline, but in a way that works with overflow: hidden
- redo pixel adjustment for adjacent links
- secondarily sort by leftness after sorting vertical
- somehow make enter work for elements that aren't real links but expect mouse
  - note looks like you can't just trigger because content script cannot trigger page script
    https://developer.mozilla.org/en-US/Add-ons/SDK/Guides/Content_Scripts/Interacting_with_page_scripts

*/

$(document).ready(function() {

var $activeLink = undefined;
var activeLinkEdges = undefined;
var originalBackgroundColour = undefined;

function getOriginalBackgroundColour() {
	return ($activeLink.css('background-color') || 'inherit');
}

function highlightLink() {
	$activeLink.css('background-color', 'red');
	$activeLink.css('outline', '1px solid red');
}

function resetLink(){
	$activeLink.css('background-color', originalBackgroundColour);
	$activeLink.css('outline', 'none');
}

function getLinkEdges(link) {
	var rect = link.getBoundingClientRect();
	return {
		'top': rect.top + window.pageYOffset,
		'bottom': rect.bottom + window.pageYOffset,
		'left': rect.left + window.pageXOffset,
		'right': rect.right + window.pageXOffset
	}
}

// onload, pre-compute all link edges
var linkIndexToEdges, linkIndexToLinks;
var computing = false;
function computeLinks() {
	if (computing) return;  // do not recompute if already underway
	start = performance.now()
	computing = true;
	linkIndexToEdges = []
	linkIndexToLinks = []
	$('a').map(function(i){
		linkIndexToLinks.push(this);
		linkIndexToEdges.push(getLinkEdges(this));
	});
	computing = false;
	end = performance.now()
	console.log('done in ' + (end-start))
}
computeLinks();

function overlapVertical(edges, foundEdges) {
	return ((edges.left < foundEdges.right && edges.right > foundEdges.left) ||
			(edges.right > foundEdges.left && edges.left < foundEdges.right));
}

function overlapHorizontal(edges, foundEdges) {
	return ((edges.top < foundEdges.bottom && edges.bottom > foundEdges.top) ||
			(edges.bottom > foundEdges.top && edges.top < foundEdges.bottom));
}

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
	if ($activeLink) activeLinkEdges = getLinkEdges($activeLink[0]);
}

// recompute when window changes
$(window).resize(function(){
	recomputeLinks();
})

// when DOM changes, set flag to recompute on next link change - do not recompute immediately to avoid
// wasteful recomputing when site make lots of DOM changes
var domChanged = false;
var MutationObserver = window.MutationObserver || window.WebKitMutationObserver || window.MozMutationObserver;
var obs = new MutationObserver(function(mutations, observer){
	mutations.every(function(mutation) {
		// hacky bugfix - some sites do a weird thing where one text node changes to the same thing on every scroll...
	    if ((mutation.addedNodes.length && mutation.addedNodes.item(0).nodeType != 3) || (mutation.removedNodes.length && mutation.removedNodes.item(0).nodeType != 3)) {
	    	domChanged = true;
	    	return false;
	    }
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

function getNextLink(positionFunc, betterLinkEdges) {

	if (domChanged) {
		recomputeLinks();
		domChanged = false;
	}
	var windowEdges = getWindowEdges()
	if ($activeLink) {
		var linkVisible = (activeLinkEdges.bottom > windowEdges.top && activeLinkEdges.top < windowEdges.bottom && activeLinkEdges.right > windowEdges.left && activeLinkEdges.left < windowEdges.right)
	}

	// if no active link, or link is off-screen, find top-left visible link
	// or actually should probably be dependent on direction key...
	if (!$activeLink || !linkVisible) {


	 	var positionFunc = function(edges, foundEdges) {
			return edges.top < foundEdges.top && edges.left < foundEdges.left && edges.bottom > foundEdges.bottom && edges.right > foundEdges.left;
	 	}

	 	var betterLinkEdges = function(candidateLink, bestLink){  // want topmost
	 		// todo leftmost
	     	return candidateLink.top < bestLink.top;
	 	}

		var edges = windowEdges;  // we want to check positionFunc against the window edges
	} else {
		var edges = activeLinkEdges;   // we want to check positionFunc against the active link edges
	}

	// loop through all links on the page, finding those with appropriate position
	// (e.g. for shift-down, should be below active link)
	var foundLink = undefined;
	var foundEdges = undefined;
	for (i = 0; i < linkIndexToEdges.length; ++i) {
	    if (positionFunc(edges, linkIndexToEdges[i])) {
	    	if (foundLink) {
	    		if (betterLinkEdges(linkIndexToEdges[i], foundEdges)) {
					foundLink = linkIndexToLinks[i];
					foundEdges = linkIndexToEdges[i];
				}
	    	} else {
	    		foundLink = linkIndexToLinks[i];
	    		foundEdges = linkIndexToEdges[i];
	    	}

	    }
	}
    if (!foundLink) return;
    if ($activeLink) resetLink();
	$activeLink = $(foundLink);
	activeLinkEdges = getLinkEdges($activeLink[0]);
	originalBackgroundColour = getOriginalBackgroundColour();
	highlightLink()
	adjustScroll();
}

var delaying = false;
function getNextLinkDelay(positionFunc, betterLinkEdges) {
	if (delaying) return false
	delaying = true;
	setTimeout(function() { getNextLink(positionFunc, betterLinkEdges); delaying = false; }, 10)
}

function getNextLinkUp() {
	// edges.top += 1;

 	var positionFunc = function(edges, foundEdges) {
		return (edges.top > foundEdges.bottom) && overlapVertical(edges, foundEdges);
 	}

 	var betterLinkEdges = function(candidateLink, bestLink){  // want lowest
     	return candidateLink.top > bestLink.top;
 	}

 	return getNextLinkDelay(positionFunc, betterLinkEdges);
}


function getNextLinkDown() {
	// edges.bottom -= 1;

 	var positionFunc = function(edges, foundEdges) {
		return (edges.bottom < foundEdges.top) && overlapVertical(edges, foundEdges);
 	}

 	var betterLinkEdges = function(candidateLink, bestLink){  // want highest
     	return candidateLink.top < bestLink.top;
 	}

    return getNextLinkDelay(positionFunc, betterLinkEdges);
}


function getNextLinkRight() {

	// edges.right -= 1;

    var positionFunc = function(edges, foundEdges) {
    	return edges.right < foundEdges.left && overlapHorizontal(edges, foundEdges);
    }

    var betterLinkEdges = function(candidateLink, bestLink){  // want leftmost
    	return candidateLink.left < bestLink.left;
    }

    return getNextLinkDelay(positionFunc, betterLinkEdges);
}

function getNextLinkLeft() {

	// edges.left += 1;  // not needed

    var positionFunc = function(edges, foundEdges) {
    	return edges.left > foundEdges.left && overlapHorizontal(edges, foundEdges);
    }

    var betterLinkEdges = function(candidateLink, bestLink){  // want rightmost
    	return candidateLink.left > bestLink.left;
    }

    return getNextLinkDelay(positionFunc, betterLinkEdges);
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
		resetLink();
		$activeLink = undefined;
		e.preventDefault();
	}

	if (e.shiftKey && e.which == 37) {
		getNextLinkLeft();
		e.preventDefault();
	}

	if (e.shiftKey && e.which == 39) {
		getNextLinkRight();
		e.preventDefault();
	}

	if (e.shiftKey && e.which == 38) {
		getNextLinkUp();
		e.preventDefault();
	}

	if (e.shiftKey && e.which == 40) {
		getNextLinkDown();
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