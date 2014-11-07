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
- update indexes at some point for when links change with js (moved/added/deleted)
- handling for links that wrap onto two lines
- make highlighting use border/outline, but in a way that works with overflow: hidden
- redo pixel adjustment for adjacent links
- secondarily sort by leftness after sorting vertical
- what happens when you hold down shift-down?
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

function getLinkEdges($link) {
	var offset = $link.offset();
	return {
		'top': offset.top,
		'bottom': offset.top + $link.height(),
		'left': offset.left,
		'right': offset.left + $link.width()
	}
}

// onload, pre-compute all link edges
var linkIndexToEdges = []
var linkIndexToLinks = []
function blah() {
	$('a').map(function(i){
		$link = $(this);
		linkIndexToLinks.push($link);
		linkIndexToEdges.push(getLinkEdges($link));
	});
}
blah();

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

function adjustScroll() {
	// if link is off-screen, scroll

	var windowEdges = getWindowEdges();

	// if link is beyond bottom
	if (activeLinkEdges.bottom > windowEdges.bottom) {
		$(window).scrollTop(activeLinkEdges.bottom - window.innerHeight + 50);
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

function getNextLink(positionFunc, sortFunc) {

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

	 	var sortFunc = function(a, b){
	 		// todo leftmost
	     	return a.offset().top > b.offset().top;
	 	}

		var edges = windowEdges;  // we want to check positionFunc against the window edges
	} else {
		var edges = activeLinkEdges;   // we want to check positionFunc against the active link edges
	}

	// loop through all links on the page, finding those with appropriate position
	// (e.g. for shift-down, should be below active link)
	var foundLinks = [];
	for (i = 0; i < linkIndexToEdges.length; ++i) {
	    if (positionFunc(edges, linkIndexToEdges[i])) {
	    	foundLinks.push(linkIndexToLinks[i]);
	    }
	}
	console.log('found ' + foundLinks.length)
    foundLinks.sort(sortFunc);
    if (!foundLinks.length) return;
    if ($activeLink) resetLink();
	$activeLink = foundLinks[0];
	activeLinkEdges = getLinkEdges($activeLink);
	originalBackgroundColour = getOriginalBackgroundColour();
	highlightLink()
	adjustScroll();
}

function getNextLinkUp() {
	// edges.top += 1;

 	var positionFunc = function(edges, foundEdges) {
		return (edges.top > foundEdges.bottom) && overlapVertical(edges, foundEdges);
 	}

 	var sortFunc = function(a, b){
     	return a.offset().top < b.offset().top;
 	}

 	return getNextLink(positionFunc, sortFunc);
}


function getNextLinkDown() {
	// edges.bottom -= 1;

 	var positionFunc = function(edges, foundEdges) {
		return (edges.bottom < foundEdges.top) && overlapVertical(edges, foundEdges);
 	}

 	var sortFunc = function(a, b){
     	return a.offset().top > b.offset().top;
 	}

    return getNextLink(positionFunc, sortFunc);
}

function getNextLinkRight() {

	// edges.right -= 1;

    var positionFunc = function(edges, foundEdges) {
    	return edges.right < foundEdges.left && overlapHorizontal(edges, foundEdges);
    }

    var sortFunc = function(a, b){
    	return a.offset().left > b.offset().left;
    }

    return getNextLink(positionFunc, sortFunc);
}

function getNextLinkLeft() {

	// edges.left += 1;  // not needed

    var positionFunc = function(edges, foundEdges) {
    	return edges.left > foundEdges.left && overlapHorizontal(edges, foundEdges);
    }

    var sortFunc = function(a, b){
    	return a.offset().left < b.offset().left;
    }

    return getNextLink(positionFunc, sortFunc);
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