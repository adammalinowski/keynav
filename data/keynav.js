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

*/

function linkEdges(link) {
	var offset = link.offset();
	return {
		'top': offset.top,
		'bottom': offset.top + link.height(),
		'left': offset.left,
		'right': offset.left + link.width()
	}
}

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

    var $foundLinks = $("a").map(function() {
        var $foundLink = $(this);
        var foundEdges = linkEdges($foundLink)
        return positionFunc(edges, foundEdges) ? $foundLink : null;
    });
    console.log('found ' + $foundLinks.length)
    $foundLinks.sort(sortFunc);
    if (!$foundLinks.length) return null;
    return $foundLinks[0];
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
	console.log(originalBackgroundColour)
	link.css('background-color', originalBackgroundColour);
}

document.body.style.border = "5px solid yellow";  // is it working?

$(window).bind('keydown', function(e){

	function handleNewLink(new_link) {
		if (new_link) {
			resetLink();
			link = new_link;
			originalBackgroundColour = getOriginalBackgroundColour();
			highlightLink()
		}
	}

	if (e.shiftKey && e.which == 37) {
		console.log('left')
		var new_link = getNextLinkLeft(link);
		handleNewLink(new_link)
		console.log('doneleft')
	}

	if (e.shiftKey && e.which == 39) {
		console.log('right')
		var new_link = getNextLinkRight(link);
		handleNewLink(new_link)
		console.log('doneright')
	}

	if (e.shiftKey && e.which == 38) {
		console.log('up')
		var new_link = getNextLinkUp(link);
		handleNewLink(new_link)
		console.log('doneup')
	}

	if (e.shiftKey && e.which == 40) {
		console.log('down')
		var new_link = getNextLinkDown(link);
		handleNewLink(new_link)
		console.log('donedown')
	}

});

