/* global d3, document, colorbrewer */
/*jshint laxcomma: true, plusplus: true */
(function(){
"use strict";

var fn=function(){

d3.chart("TippedMatrix", {

	sortable: function( args ){
		this.attach('matrix').sortable( args );
	},

	dimensions: function( args ){
		this.attach('matrix').dimensions( args );
	},

	colors: function( args ){
		this.attach('matrix').colors( args );
	},

	columns: function( args ){
		this.attach('matrix').columns( args );
	},

	tooltip: function( args ){

		var func = function(d) {
			return d[ args ] || 'no data for ' + args;
		};
		this.attach('tips').text( func );
	},

	resize: function() {
		this.trigger('change:size');
		if ( this.data ) {
			this.draw( this.data );
		}
	},

	initialize: function( options ) {

	  // attach the charts under a specific name to the parent chart
		this.attach("matrix",
			this.base
				.chart("MatrixHeatMap", options )
			);

		var tips_options = {
			layer : this.attach('matrix'), // this.matrix
			type : '.matrix > g',
			text : function(d) { return d.taxon_oid + ( d.taxon_display_name ? ', ' + d.taxon_display_name : '' ); }
		};

		this.attach('tips',
			d3.select('body')
				.chart('TooltipMixinChart', tips_options )
			);
		if ( options.tooltip ) {
			this.tooltip( options.tooltip );
		}
	}
});

function colorbrewer_schema () {

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
	// only use colorbrewer schemes with 9 variants
	, col_arr = Object.keys( colorbrewer ).filter(function(c){
		return colorbrewer[c].hasOwnProperty('9');
	})
	, schema = {
		type: "object",
		properties: {
			colors: {
				name: 'color_arr',
				type: 'string',
				title: 'Colour scheme',
				control: 'select',
				enum: col_arr,
				enum_map: {},
				default: 'Greys'
			},
			columns: {
				name: 'columns',
				type: 'string',
				title: 'Heatmap Columns',
				control: 'cbox_array'
			}
		}
	}
	;
	col_arr.forEach(function(c){
		var name = c.split( /(?=[A-Z])/ );
		schema.properties.colors.enum_map[ c ] = name.map( function(n){
			return ( col_abbr[n] ? col_abbr[n] : n );
		}).join('/');
	}
	);
	return schema;
}



var FormMaker = {

	dom: {
		data_input_form: null	// first form: input data
		, data_input_error_el: null	// error message element

		, col_chooser_form: null	// second form: pick columns
		, col_chooser_el: null	// where to append the column choices

		, chart_target: null	// where the graph will appear
	}

	// data storage
	, data: null
	, all_cols: null
	, selected_cols: null

	// the chart!
	, chart: null
	// schema object. Only used for colours at present
	, schema: null
	// booleans
	, got_controls: false

	// initialisation functions
	, init: function( args ) {
		var fm = this;

		// set the DOM elements
		for ( var k in fm.dom ) {
			if ( ! args.hasOwnProperty( k ) ) {
				throw new Error( 'Missing required DOM element ' + k );
			}
			else if ( ! args[k] ) {
				throw new Error( 'Required DOM element ' + k + ' is undefined' );
			}

			fm.dom[k] = args[k];
		}

		if ( ! args.schema ) {
			throw new Error( 'schema required for colour scheme generation!' );
		}
		fm.schema = args.schema;

		fm.dom.data_input_form.addEventListener("submit", function(event) {
			event.preventDefault();
			fm.verify_data_input( fm.dom.data_input_form.elements );
			return;
		});

		fm.dom.col_chooser_form.addEventListener('submit', function(event) {
			event.preventDefault();
			fm.verify_column_choice( fm.dom.col_chooser_form.elements );
			return;
		});

		// make sure that the chart svg fills its space
		this.dom.chart_target.classList.add('resizable');

	}

	// control flow

	, verify_data_input: function( form_els ) {

		// remove existing error messages
		this.dom.data_input_error_el.innerHTML = "";
		this.dom.data_input_form.classList.remove('error');
// 		d3.select( this.dom.data_input_form ).selectAll('.error')
// 			.classed('error', false);

		var errmsg = this.parse_data( form_els );

		if ( errmsg ) {

			this.dom.data_input_error_el.innerHTML = errmsg;
			this.dom.data_input_form.classList.add('error');
			this.dom.col_chooser_form.classList.add('js_hide');
			return;
		}

		this.add_column_chooser( this.all_cols );
		this.dom.col_chooser_form.classList.remove('js_hide');

		return;
	}

	, verify_column_choice: function( form_els ) {

		if ( ! this.data ) {
			return [ 'Please enter your data first' ];
		}
		var errs = this.parse_columns( form_els );

		if ( errs ) {

		}

		// show the controls!
		d3.select('.controls__container.js_hide')
			.classed('js_hide', false);

		// draw the chart
		this.render_chart();

		return;

	}

	// data-related functions

	, make_safe_columns: function ( cols ) {
		var got_this = {}
		, safe_arr = cols.map( function(c,i) {
			var safe = c.replace( /[^a-zA-Z_]+/g, '_' ) || 'column_' + i;
			if ( got_this[ safe ] ) {
				safe = 'column_' + i;
			}
			got_this[ safe ] = c;
			return safe;
		});
		// add to the schema model
		this.schema.properties.columns.enum = safe_arr;
		this.schema.properties.columns.enum_map = got_this;
		return;
	}

	, parse_data: function ( form_els ){
		var fmt = form_els.format.value || 'csv'
		, unparsed = form_els.data.value.trimRight()
		, cols
		, col_title_value
		, data
		, first_line
		;
		if ( 'csv' === fmt || 'tsv' === fmt ) {
			// try reading the first line of the string.
			if ( -1 === unparsed.indexOf("\n") ) {
				return 'No data found!';
			}

			first_line = unparsed.substring(0, unparsed.indexOf("\n"));
			cols = d3[fmt].parseRows( first_line );

			// make sure we have at least two columns
			if ( 2 > cols[0].length ) {
				return 'Only one column found. Please ensure you have chosen the correct data format';
			}
			else {
				data = d3[fmt].parse( unparsed );
			}
		}
		else if ( 'json' === fmt ) {
			try {
				data = JSON.parse( unparsed );
			}
			catch (e) {
				return 'No valid JSON data found.';
			}
		}
		else {
			return 'Invalid format parameter ' + fmt;
		}

		// make sure we have at least two bits of data
		if ( ! data ) {
			return 'no data: Did not find sufficient data for charting';
		}
		if ( 2 > data.length ) {
			return 'data length: Did not find sufficient data for charting';
		}
		if ( 2 > Object.keys( data[0] ).length ) {
			return 'keys length: Did not find sufficient data for charting';
		}

		this.data = data;
		this.all_cols = Object.keys(data[0]);
		this.selected_cols = null;

		return;
	}

	, parse_columns: function ( form_els ){

		// clear out existing cols
		this.data.selected_cols = null;

		var valid = []
		, invalid = []
		, errs = []
		, enum_map = this.schema.properties.columns.enum_map
		;

		d3.select( this.dom.col_chooser_form )
			.selectAll('input[type=checkbox]:checked')
			.each(function(){
				if ( enum_map[ this.value ] ) {
					valid.push( enum_map[ this.value ] );
				}
				else {
					invalid.push( this.value );
				}
			});

		if ( 0 !== invalid.length ) {
			// warn about invalid cols
			console.log('Found invalid columns: ' . invalid.join(', '));
		}

		if ( 2 < valid.length ) {
			this.selected_cols = valid;
		}
		return;
	}

	// DOM functions -- adding, removing, etc., elements

	, add_column_chooser: function(){

		// make sure our columns aren't going to cause JS issues
		this.make_safe_columns( this.all_cols );
		var col_schema = this.schema.properties.columns

		d3.select( this.dom.col_chooser_el ).selectAll('li').remove();
		d3.select( this.dom.col_chooser_el ).selectAll('li')
			.data( col_schema.enum, function(d,i) {
				return i;
			})
			.enter()
				.append('li')
				.classed('col-chooser__item', true)
				.html(function(e){
					return '<input type="checkbox" class="col-chooser__cbox" name="column" value="'
					+ e + '" id="cols_' + e + '" />'
					+ '<label for="cols_' + e + '" class="col-chooser__label">'
					+ ( col_schema.enum_map[e].length === 0 ? e : col_schema.enum_map[e] )
					+ '</label>';
				});

		// just in case
		d3.select('#js_tooltip_picker select').remove();

		// tooltip picker
		d3.select('#js_tooltip_picker label')
			.append('select')
			.attr('name', 'colors' )
			.attr('id', "colors_select" )
			.html( function(){
			return col_schema.enum.map( function(e){
				return '<option value="'
					+ e
					+ '">'
		+ ( col_schema.enum_map[e].length === 0 ? e : col_schema.enum_map[e] )
					+ '</option>';
				}).join(' ');
			});

		return;
	}

	, add_controls: function( chart ){

		var schema = this.schema
		;

		if (! this.got_controls ) {
			d3.select('#js_colorpicker label')
				.append('select')
				.attr('name', 'colors' )
				.attr('id', "colors_select" )
				.html( function(){
					return schema.properties.colors.enum.map( function(e){
						return '<option value="'
						+ e
						+ ( schema.properties.colors.default && e === schema.properties.colors.default ? '" selected>' : '">' )
						+ ( schema.properties.colors.enum_map ? schema.properties.colors.enum_map[e] : e )
						+ '</option>';
					}).join(' ');
				});
			this.got_controls = true;
		}
		d3.select('#js_colorpicker select').on("change", function() {
			chart.colors( this.value );
		});

		// add event handlers for 'parseable' elements
		d3.select('.js_parseable')
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
		d3.select('#js_show_labels')
			.on('click', function(){
				document.querySelector('#target svg')
					.classList.toggle('text_hidden');
			});
		// tooltip picker
		d3.select('#js_tooltip_picker select').on("change", function() {
			console.log('value: ' + this.value + '; mapped version: ' + schema.properties.columns.enum_map[ this.value ] );
			chart.tooltip( schema.properties.columns.enum_map[ this.value ] || this.value );
		});

		return;
	}

	, render_chart: function () {
		var t = this.dom.chart_target
		, sel = document.querySelector('#js_colorpicker select')
		, ttip = document.querySelector('#js_tooltip_picker select')
		, args = { columns: this.selected_cols, name: 'taxon_oid' }
		;

		// this is ugly: change it to update the chart instead of creating a new one
		t.innerHTML = '';
		t.setAttribute( 'style', 'height: ' + ( 30 * this.data.length ) + 'px' );

		// have we got a colour chosen?
		if ( sel ) {
			args.colors = sel.options[sel.selectedIndex].value;
		}
		if ( ttip ) {
			args.tooltip = this.schema.properties.columns.enum_map[ ttip.options[ttip.selectedIndex].value ];
		}

		this.chart = d3.select(t)
			.append("svg")
			.chart("TippedMatrix", args);

		this.add_controls( this.chart );

		this.chart.draw( this.data );

		return;
	}

};

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

//	var f = new FormMaker;

	d3.select( '#col_list' )
		.insert('ul', ":first-child")
		.classed('noDot col-chooser__list', true)
		.attr('id', 'cols');

	FormMaker.init({
		data_input_form: document.getElementById('data_input')
		, data_input_error_el: document.getElementById('data_input_error')

		, col_chooser_form: document.getElementById('col_chooser')
		, col_chooser_el: document.querySelector('#col_list .col-chooser__list')

		, chart_target: document.getElementById('target')

		, schema: colorbrewer_schema()
	});

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
