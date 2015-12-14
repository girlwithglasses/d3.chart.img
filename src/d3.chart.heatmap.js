/*jshint laxcomma: true, plusplus: false */
(function(global, factory) {
  "use strict";

  if( typeof global.define === "function" && global.define.amd ) {
    define(["d3"], function(d3) {
      factory(global, d3);
    });
  } else {
    factory(global, global.d3);
  }

})(this, function(window, d3) {

'use strict';
  // define a basic rect chart
  d3.chart("MatrixHeatMap", {

//     modes: {
//       mobile : function() {
// //        return Modernizr.mq("only all and (max-width: 480px)");
//       },
//       tablet: function() {
// //        return Modernizr.mq("only all and (min-width: 481px) and (max-width: 768px)");
//       },
//       web: function() {
// //        return Modernizr.mq("only all and (min-width: 769px)");
//       }
//     },

	// helper function for getting types
	_get_type: function(elem) {
		return Object.prototype.toString.call(elem).slice(8, -1);
	},

	// TODO: allow schema usage
	_create_columns: function(col_arr) {
		var chart = this;

	 	return col_arr.map( function(c){
			if ( 'Object' !== chart._get_type(c) ) {
				c = { title: c, value: c }; // blindly assume it's a string...
			}
			if ( ! c.value ) {
				throw new Error( 'No value defined for column ' + c );
			}
			// replace any dodgy characters
			c.value = c.value.replace( /[^a-zA-Z_]+/g, '' );
			if ( ! c.title ) {
				c.title = c.value.charAt(0).toUpperCase()
					+ c.value.substr(1).replace(/_/gi, ' ');
			}
			return c;
		});
	},



    transform: function(data) {
      var chart = this;

      chart.data = data;

      return data;
    },

	/**
		single argument form: _ASC_ or _DESC_: sort by property
	*/
	sortable: function( _ , attr ) {

		function numsort (a, b) {
			return a[prop] - b[prop];
		}
		function numsort_rev (a,b){
			return b[prop] - a[prop];
		}
		function lc(a,b){
			return d3.ascending( a[prop].toLowerCase(), b[prop].toLowerCase() );
		}
		function lc_rev(a,b){
			return d3.descending( a[prop].toLowerCase(), b[prop].toLowerCase() );
		}

		var chart = this
		, prop = attr || '_id'
		;

		if (chart.data) {
			if ( _ === "_ASC_" ) {
				console.log( '_: ' + _ + '; prop: ' + prop );
				chart.data.sort( numsort );
			} else if( _ === "_DESC_" ) {
				console.log( '_: ' + _ + '; prop: ' + prop );
				chart.data.sort( numsort_rev );
			}
			// _ is a function
			else if ( 'function' === typeof _ ) {
				chart.data.sort(_);
			}
			else {
				console.log( '_: ' + _ + '; prop: ' + prop );
				console.log("don't know what to do with sort params: " + _ + ", " + prop );
			}
			chart.set_scales();
			chart.draw(chart.data);
		}
		return chart;

	},

	dimensions: function(_) {
		var chart = this;

		if( ! arguments.length ) { return chart.options.dimensions; }

		chart.options.dimensions = _;

		chart.trigger("change:dimensions");
		if( chart.data ) { chart.draw(chart.data); }

		return chart;
	},

	legend: function(_) {
		var chart = this;

		if( ! arguments.length ) { return chart.options.legend; }

		chart.options.legend = _;

		chart.trigger("change:legend");
		if( chart.data ) { chart.draw(chart.data); }

		return chart;
	},

	duration: function(_) {
		var chart = this;

		if( ! arguments.length ) { return chart.options.duration; }

		chart.options.duration = _;

		chart.trigger("change:duration");
		if( chart.root ) { chart.draw(chart.root); }

		return chart;
	},
/**
	name: function(_) {
		var chart = this;

		if( ! arguments.length ) { return chart.options.name; }

		chart.options.name = _;

		chart.trigger("change:name");
		if( chart.data ) { chart.draw(chart.data); }

		return chart;
	},
*/
	colors: function(_) {
		var chart = this
		, old_colors = chart.options.colors
		;

		if( ! arguments.length ) { return chart.options.colors; }

		chart.options.colors = _;

		chart.trigger("change:colors", old_colors );

		if( chart.data ) { chart.draw(chart.data); }

		return chart;
	},

	columns: function(_) {
		var chart = this
		, old_cols = chart.options.columns
		;

		if( ! arguments.length ) { return chart.options.columns; }

		// whip the new columns into shape
		chart.options.columns = _; // chart._create_columns(_);

		if ( old_cols && old_cols.length > 0 ){
			chart.changed_columns = {};
			old_cols.forEach( function(n){
				chart.changed_columns[ n ] = { old: true };
			});
			chart.options.columns.forEach( function(n){
				chart.changed_columns[ n ]
					? chart.changed_columns[n]['new'] = true
					: chart.changed_columns[n] = { new: true };
			});
			chart.trigger("change:columns");
		}

		if( chart.data ) { chart.draw(chart.data); }

		chart.changed_columns = null;

		return chart;
	},

	set_scales: function() {
		var chart = this
		, counter = 0;
		chart.xScale.domain( chart.options.columns );

		// Update the y-scale.
		// yScale is the data items, one row per item
		chart.yScale.domain( chart.data.map( function(d) {
			return d._id || (d._id = ++counter);
		}));

		// create the colour scales
		chart.zScale_data = {};
		chart.options.columns.forEach( function(c,i){
			chart.zScale_data[ c ] = d3.scale.quantile()
				.domain( d3.extent( chart.data, function(d){ return +d[c]; } ) )
				.range( d3.range(9) );
		});
	},


    initialize: function( options ) {

		console.log('Running initialize!');

		var chart = this
		;

		chart.options = options || {};

		chart.options.width = chart.base.node().parentNode.clientWidth;
		chart.options.height = chart.base.node().parentNode.clientHeight;

		// accessor by which to categorise data; should be a key in each object
//		chart.name( chart.options.name || '_id' );
		chart.duration( chart.options.duration || 750 );
		chart.colors( chart.options.colors || 'Greys' );
		chart.dimensions( chart.options.dimensions || { w: '_MAX_', h: '_MAX_' } );
		chart.columns( chart.options.columns || [] );
	/*
		heatmap variables:

		x axis: data items -- one row per datum. Discontinuous.
		y axis: array of data attributes to map
		z: colour scale for the blocks; domains will differ depending on data
	*/
      // create the scales
		chart.xScale = d3.scale.ordinal()
			.rangeBands([0, chart.options.width ]);
		chart.yScale = d3.scale.ordinal()
			.rangeBands([ chart.options.height, 0 ]);

		chart
			.off('change:size')
			.on('change:size', function() {
				chart.options.width = chart.base.node().parentNode.clientWidth;
				chart.options.height = chart.base.node().parentNode.clientHeight;
			});

		chart
			.off('change:colors')
			.on('change:colors', function( old_colors ){
				if ( old_colors ){
					var base = chart.base.select( '.' + old_colors );
					base
						.classed( old_colors, false )
						.classed( chart.colors(), true );
				}
			});

		chart
			.off('change:dimensions')
			.on('change:dimensions', function(){
				var dim = chart.options.dimensions
				, width = ('_MAX_' == dim.w ? chart.options.width : dim.w * chart.options.columns.length)
				, height = ('_MAX_' == dim.h ? chart.options.height : dim.h * chart.data.length)
				;

				chart.xScale.rangeBands([ 0, width ]);
				chart.yScale.rangeBands([ height, 0 ]);

			});

      // add a boxes layer
		this.layer("matrix", this.base.append("g").classed( this.colors() + ' matrix__container', true), {

			dataBind: function(data) {

				console.log('running dataBind event');
				this.chart().set_scales();

				return this.selectAll('.matrix')
					.data(data, function(d) {
						return d._id;
					});
			},

			insert: function() {
				return this.append("g")
				.classed( 'matrix', true );
			},

			events: {
				'update' : function() {
					if ( chart.changed_columns ) {
						Object.keys( chart.changed_columns ).forEach( function(c){
							if ( chart.changed_columns[c].old && ! chart.changed_columns[c].new ) {
								this.select('.' + c.replace( /[^a-zA-Z_]+/g, '_' ) )
									.remove();
							}
							else if ( chart.changed_columns[c].new && ! chart.changed_columns[c].old ) {
								var g = this.append('g')
									.attr('class', c.replace( /[^a-zA-Z_]+/g, '_' ) );
								g.append('rect');
								g.append('text')
									.text(function(d) { return c + ': ' + d[c]; })
									.attr("text-anchor", "middle");
							}
						}, this);
					}
				},

				'enter' : function() {
					this.chart().columns().forEach( function(c){
						var g = this.append('g')
							.attr('class', c.replace( /[^a-zA-Z_]+/g, '_' ) );
						g.append('rect');
						g.append('text')
							.text(function(d) { return c + ': ' + d[c]; })
							.attr("text-anchor", "middle");
					}, this );
				},

				'merge:transition':function(){

					var chart = this.chart();
					chart.columns().forEach( function(c){
						this.select('.' + c.replace( /[^a-zA-Z_]+/g, '_' ) )
							.attr('transform', function(d,i){
								return 'translate(' + chart.xScale( c ) + ','
								+ chart.yScale( d._id )
								+ ')'; });

						this.select('.' + c.replace( /[^a-zA-Z_]+/g, '_' ) + ' rect')
							.attr('width', chart.xScale.rangeBand() )
							.attr('height', chart.yScale.rangeBand() )
							.attr('class', function(d){
								if ( null === d[c] || undefined === d[c] ) {
									return 'null';
								}
								return 'q' + chart.zScale_data[c]( d[c] ) + "-9";
							});
						this.select('.' + c.replace( /[^a-zA-Z_]+/g, '_' ) + ' text')
							.attr('dx', chart.xScale.rangeBand()/2 )
							.attr('dy', chart.yScale.rangeBand()/2 );
					}, this );
				},

				'exit' : function(){
					console.log('running exit event');
					this.remove();
				}
			}
		});

/**
		this.layer('zScales', this.base.append("g").classed('matrix-scale__container', true), {


				return this.selectAll('.matrix')
					.data(data, function(d) {
						return d._id || (d._id = ++counter);
					});
			},

			insert: function() {
				return this.append("g")
				.classed('matrix', true);
			},

*/

    }
  });

});
