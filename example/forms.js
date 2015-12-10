/* global d3, document, colorbrewer */
/*jshint laxcomma: true, plusplus: true */
(function(){
"use strict";

var fn=function(){

	// a select element made from the colorbrewer data
	var col_abbr = {
		B: 'Blue',
		Br: 'Brown',
		Bu: 'Blue',
		G: 'Green',
		Gn: 'Green',
		Gy: 'Grey',
		Or: 'Orange',
		P: 'Purple',
		Pi: 'Pink',
		Pu: 'Purple',
		R: 'Red',
		Rd: 'Red',
		Y: 'Yellow',
		Yl: 'Yellow',
	}
	, col_arr = Object.keys( colorbrewer ).filter(function(c){
		return colorbrewer[c].hasOwnProperty('9');
	})
	, col_titles = {}
	, cal
	, c
	, schema = {
		type: "object",
		properties: {
			color_arr: {
				name: 'color_arr',
				type: 'string',
				title: 'Colour scheme',
				control: 'select',
				enum: col_arr
			}
		}
	}
	;
	for (c = 0, cal = col_arr.length; c < cal; c++) {
		// split by capital letters, substitute in the col_abbr
		var name = col_arr[c].split( /(?=[A-Z])/ )
		col_titles[ col_arr[c] ] = name.map( function(n){
			return ( col_abbr[n] ? col_abbr[n] : n );
		}).join('/');
	}

	schema.properties.color_arr.enum_map = col_titles;

	var form = d3.select('#select')
		.chart("FormMaker")
		.schema( schema )
		.form( form );

	form.draw( schema );

	console.log( schema );

	form = d3.select('#dnd_thing')
		.chart('FormMaker');
	schema.properties.color_arr.control = 'dnd_box';



	form.draw( schema );

/**

		d3.select('#colorPicker')
			.append('select')
			.attr('name', 'colors')
			.html( col_arr.join(' ') )
			.on("change", function() {
				chart.colors( this.value );
			});



	var t = document.getElementById('target')
	, got_controls = false
	, chart
	;
	t.classList.add('resizable');
	t.innerHTML = '';


	var form = document.getElementById("chart_maker");
	form.addEventListener("submit", function(event) {
		event.preventDefault();

		var err_els = form.querySelectorAll('.error')
		, errs
		, e
		, el
		, element
		, rslt
		, cols
		;
		if ( err_els.length > 0 ) {
			for ( e = 0, el = err_els.length; e < el; e++ ) {
				err_els[e].classList.remove('error');
			}
		}

		rslt = parse_data({ format: form.elements.format.value, data: form.elements.data.value, cols: form.elements.cols.value });
		if ( rslt.error ) {
			for (e = 0, el = rslt.error.length; e < el; e++ ) {
				element = form.elements[ rslt.error[e].param ].parentNode;
				element.classList.add('error');
			}
			return;
		}
		if ( rslt.data && ! got_controls ) {
			add_controls( rslt );
			got_controls = true;
		}

		// add the columns chooser
		cols = get_columns( rslt.data );

		column_chooser( cols );

		return;

	});

	function get_columns( data ) {

		var cols = data[0].map( function(c) {
			return { title: c, value: c.replace( /[^a-zA-Z_]+/g, '' ) };
		});

	}



	function parse_data( args ){
		var fmt = args.format || 'csv'
		, data
		, cols
		, errs = []
		;
		if ( 'csv' === fmt || 'tsv' === fmt ) {
			// try reading the string.
			data = d3[fmt].parse( args.data );
		}
		else if ( 'json' === fmt ) {
			data = JSON.parse( args.data );
		}
		else {
			errs.push( { param: 'format' } );
		}
		if ( data.length === 0 ) {
			return { error: [{ param: 'data' }] };
		}
		return { data: data };
	}

	function column_chooser( args ){




		cc.on('submit', function(
	}


	function render_chart( args ){

		var fmt = args.format || 'csv'
		, data
		, cols
		, errs = []
		;
		if ( 'csv' === fmt || 'tsv' === fmt ) {
			// try reading the string.
			data = d3[fmt].parse( args.data );
			cols = d3[fmt].parseRows( args.cols )[0];
		}
		else if ( 'json' === fmt ) {
			data = JSON.parse( args.data );
			cols = d3.csv.parseRows( args.cols )[0];
		}
		else {
			errs.push( { param: 'format' } );
		}


		if ( data.length === 0 ) {
			errs.push( { param: 'data' } );
		}
		if ( cols.length === 0 ) {
			errs.push( { param: 'cols' } );
		}

		if ( errs.length > 0 ) {
			return { error: errs };
		}

		// otherwise, render the chart
		t.setAttribute( 'style', 'height: ' + ( 30 * data.length ) + 'px' );
		t.innerHTML = '';

		chart = d3.select(t)
			.append("svg")
			.chart("TippedMatrix", { columns: cols });

		chart.draw( data );

		return { chart: chart };
	}

	function add_controls( args ){

		var hidden = document.querySelectorAll('.js_hide')
		, hl = hidden.length
		, h
		, col_arr = Object.keys( colorbrewer ).filter(function(c){
			return colorbrewer[c].hasOwnProperty('9');
		}).map(function(c){
			return '<option value="' + c + '">' + c + '</option>';
		})
		;
		for (h = 0; h < hl; h++) {
			hidden[h].classList.remove('js_hide');
		}

		d3.select('#colorPicker')
			.append('select')
			.attr('name', 'colors')
			.html( col_arr.join(' ') )
			.on("change", function() {
				chart.colors( this.value );
			});

		d3.select('.parseable')
			.on('click', function(d, i){
				var e = d3.event.target
				, param = e.getAttribute('data-param')
				, value = e.getAttribute('data-value') || null
				, value_args
				;
				if( value && -1 !== value.indexOf('"') ){
					value_args = JSON.parse( value );
					if( 'sortable' === param ){
						var k = Object.keys( value_args )[0];
						chart[param]( value_args[k], k );
					}
					else {
						chart[param]( value_args );
					}
				}
				else {
					chart[param]( value );
				}
			});

		// checkbox to turn text labels on or off
		d3.select('#labels')
			.on('click', function(){
				var e = d3.event.target;
				d3.select('svg')
					.classed('text_hidden', function(){
						if ( e.checked ) {
							return false;
						}
						return true;
					});
			});
	}

/** drag and drop stuff
// Full example
(function() {
  var id_ = 'columns-full';
  var cols_ = document.querySelectorAll('#' + id_ + ' .column');
  var dragSrcEl_ = null;

  this.handleDragStart = function(e) {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', this.innerHTML);

    dragSrcEl_ = this;

    // this/e.target is the source node.
    this.addClassName('moving');
  };

  this.handleDragOver = function(e) {
    if (e.preventDefault) {
      e.preventDefault(); // Allows us to drop.
    }

    e.dataTransfer.dropEffect = 'move';

    return false;
  };

  this.handleDragEnter = function(e) {
    this.addClassName('over');
  };

  this.handleDragLeave = function(e) {
    // this/e.target is previous target element.
    this.removeClassName('over');
  };

  this.handleDrop = function(e) {
    // this/e.target is current target element.

    if (e.stopPropagation) {
      e.stopPropagation(); // stops the browser from redirecting.
    }

    // Don't do anything if we're dropping on the same column we're dragging.
    if (dragSrcEl_ != this) {
      dragSrcEl_.innerHTML = this.innerHTML;
      this.innerHTML = e.dataTransfer.getData('text/html');

      // Set number of times the column has been moved.
      var count = this.querySelector('.count');
      var newCount = parseInt(count.getAttribute('data-col-moves')) + 1;
      count.setAttribute('data-col-moves', newCount);
      count.textContent = 'moves: ' + newCount;
    }

    return false;
  };

  this.handleDragEnd = function(e) {
    // this/e.target is the source node.
    [].forEach.call(cols_, function (col) {
      col.removeClassName('over');
      col.removeClassName('moving');
    });
  };

  [].forEach.call(cols_, function (col) {
    col.setAttribute('draggable', 'true');  // Enable columns to be draggable.
    col.addEventListener('dragstart', this.handleDragStart, false);
    col.addEventListener('dragenter', this.handleDragEnter, false);
    col.addEventListener('dragover', this.handleDragOver, false);
    col.addEventListener('dragleave', this.handleDragLeave, false);
    col.addEventListener('drop', this.handleDrop, false);
    col.addEventListener('dragend', this.handleDragEnd, false);
  });

})();
 end DnD */

//  rects.draw(data);

/**
  // bind to the input boxes and redraw
  // the chart when the width/height values
  // are changed
	d3.select('#width_box')
	.on('keyup', function(){
		rects.width(this.value);
	});
	d3.select('#height_box')
	.on('keyup',function(){
		rects.height(this.value);
	});
//   $("#height_box").on("keyup", function(e){
//     var newHeight = +($(e.target).val());
//     rects.height(newHeight);
//   });
*/
	};

	if (document.readyState !== 'loading'){
		fn();
	} else if (document.addEventListener) {
		document.addEventListener('DOMContentLoaded', function(){
			fn();
		});
	} else {
		document.attachEvent('onreadystatechange', function() {
			if (document.readyState !== 'loading'){
				fn();
			}
		});
	}
}());
