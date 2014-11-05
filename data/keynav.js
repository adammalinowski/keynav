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
- make moving off-screen do scrolling
- when no link is active, select top-left visible link on any shift-direction press

*/

$(document).ready(function() {

var link = $('a').eq(0);

function getOriginalBackgroundColour() {
	return (link.css('background-color') || 'inherit');
}
var originalBackgroundColour = getOriginalBackgroundColour();

function highlightLink() {
	link.css('background-color', 'red');
}
highlightLink();

function resetLink(){
	link.css('background-color', originalBackgroundColour);
}

function linkEdges($link) {
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
		linkIndexToEdges.push(linkEdges($link));
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

function getNextLink($link, positionFunc, sortFunc) {

	var edges = linkEdges($link)

	var foundLinks = [];
	for (i = 0; i < linkIndexToEdges.length; ++i) {
	    if (positionFunc(edges, linkIndexToEdges[i])) {
	    	foundLinks.push(linkIndexToLinks[i]);
	    }
	}

    console.log('found ' + foundLinks.length)
    foundLinks.sort(sortFunc);
    if (!foundLinks.length) return;
	resetLink();
	link = foundLinks[0];
	originalBackgroundColour = getOriginalBackgroundColour();
	highlightLink()
}

function getNextLinkUp($link) {
	// edges.top += 1;

 	var positionFunc = function(edges, foundEdges) {
		return (edges.top > foundEdges.bottom) && overlapVertical(edges, foundEdges);
 	}

 	var sortFunc = function(a, b){
     	return a.offset().top < b.offset().top;
 	}

 	return getNextLink($link, positionFunc, sortFunc);
}


function getNextLinkDown($link) {
	// edges.bottom -= 1;

 	var positionFunc = function(edges, foundEdges) {
		return (edges.bottom < foundEdges.top) && overlapVertical(edges, foundEdges);
 	}

 	var sortFunc = function(a, b){
     	return a.offset().top > b.offset().top;
 	}

    return getNextLink($link, positionFunc, sortFunc);
}

function getNextLinkRight($link) {

	// edges.right -= 1;

    var positionFunc = function(edges, foundEdges) {
    	return edges.right < foundEdges.left && overlapHorizontal(edges, foundEdges);
    }

    var sortFunc = function(a, b){
    	return a.offset().left > b.offset().left;
    }

    return getNextLink($link, positionFunc, sortFunc);
}

function getNextLinkLeft($link) {

	// edges.left += 1;  // not needed

    var positionFunc = function(edges, foundEdges) {
    	return edges.left > foundEdges.left && overlapHorizontal(edges, foundEdges);
    }

    var sortFunc = function(a, b){
    	return a.offset().left < b.offset().left;
    }

    return getNextLink($link, positionFunc, sortFunc);
}


$(window).bind('keydown', function(e){

	if (e.which == 27) {  // escape to deactivate
		resetLink();
	}

	if (e.shiftKey && e.which == 37) {
		getNextLinkLeft(link);
		e.preventDefault();
	}

	if (e.shiftKey && e.which == 39) {
		getNextLinkRight(link);
		e.preventDefault();
	}

	if (e.shiftKey && e.which == 38) {
		getNextLinkUp(link);
		e.preventDefault();
	}

	if (e.shiftKey && e.which == 40) {
		getNextLinkDown(link);
		e.preventDefault();
	}

	if (e.which == 13) {
		// check if link is selected
		if (e.shiftKey) {
			if (e.ctrlKey) {
				self.port.emit("open-new-tab", link.attr('href'));
			} else {
				self.port.emit("open-new-background-tab", link.attr('href'));
			}
		} else {
			self.port.emit("open", link.attr('href'));
		}
		e.preventDefault();
	}

});

});