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
  d3.chart("Table", {

	// helper function for getting types
	_get_type: function(elem) {
		return Object.prototype.toString.call(elem).slice(8, -1);
	},

	_create_columns: function(col_arr) {
		var chart = this;

	 	return col_arr.map( function(c){
			if ( 'Object' !== chart._get_type(c) ) {
				c = { value: c }; // blindly assume it's a string...
			}
			if ( ! c.value ) {
				throw new Error( 'No value defined for column ' + c );
			}
			else {
				c.value = c.value.replace( /[^a-zA-Z_]+/g, '' );
			}
			if ( ! c.title ) {
				c.title = c.value.charAt(0).toUpperCase()
					+ c.value.substr(1).replace(/_/gi, ' ');
			}
			return c;
		});
	},

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

	transform: function(data) {
		var chart = this;

		chart.options.all_columns = Object.keys( data[0] );
		if ( ! chart.options.columns ) {
			chart.options.columns = chart._create_columns( chart.options.all_columns );
		}

		chart.data = data;

		return data;
	},

	/**
		single argument form: _ASC_ or _DESC_: sort by chart.name()
		two argument form: _ASC_ or _DESC_, property to sort by
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
		, prop = attr || chart.options.name
		;

		chart.trigger('change:sortable');

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
			chart.draw(chart.data);
		}
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
		if( chart.data ) { chart.draw(chart.data); }

		return chart;
	},

	text_transform: function(_) {
		var chart = this;

		if( ! arguments.length ) { return chart.options.text_transform; }

		chart.options.text_transform = _;

		chart.trigger('change:text_transform');

		if( chart.data ) { chart.draw(chart.data); }

		return chart;
	},

	name: function(_) {
		var chart = this;

		if( ! arguments.length ) { return chart.options.name; }

		chart.options.name = _;

		chart.trigger("change:name");
		if( chart.data ) { chart.draw(chart.data); }

		return chart;
	},

	columns: function(_) {
		var chart = this
		, old_cols = chart.options.columns
		;

		if( ! arguments.length ) { return chart.options.columns; }

		// whip the new columns into shape
		chart.options.columns = chart._create_columns(_);

		if ( old_cols && old_cols.length > 0 ){
			chart.changed_columns = {};
			old_cols.forEach( function(n){
				chart.changed_columns[ n.value ] = { old: true };
			});
			chart.options.columns.forEach( function(n){
				chart.changed_columns[ n.value ]
					? chart.changed_columns[n.value]['new'] = true
					: chart.changed_columns[n.value] = { new: true };
			});
			chart.trigger("change:columns");
		}

		if( chart.data ) { chart.draw(chart.data); }
		chart.changed_columns = null;

		return chart;
	},

	add_thead_row: function( selection ) {
		var chart = this;
		selection
			.text( function(d) { return d.title; } )
			.attr('class', function(d) { return d.value; } )
			.on('click', function(d) {
				chart.sortable('_DESC_',d.value);
			});
	},

	add_tbody_row: function( selection ) {

		var chart = this
		, tf = chart.text_transform();

		chart.columns().forEach( function( c ){
			this.append('td')
				.attr('class', c.value )
				.text( function(d) {
					if ( tf[c.value] ) {
						return tf[ c.value ]( d );
					}
					return d[ c.value ];
				});
		}, selection );

	},

    initialize: function( options ) {

		var chart = this
		, counter = 0
		, el = chart.base.node()
		;

		// make sure we have a <table> element
		if ( el.tagName.toLowerCase() !== 'table' ) {
			chart.base = d3.select( el ).append('table');
		}

		if ( ! options ) {
			options = {};
		}

		chart.options = {
			name: options.name || 'name'
			, duration: options.duration || 750
			, text_transform: options.text_transform || {}
		};

		if ( options.columns ) {
			chart.options.columns = chart._create_columns( options.columns );
		}

		this.layer('thead', this.base.append('thead').append('tr'), {

			dataBind: function( data ){
				return this.selectAll('th')
					.data( this.chart().columns(), function(d) {
						return d.value;
					});
			},

			insert: function() {
				return this.append( 'th' );
			},

			events: {
				'update' : function() {
					this.selectAll( 'thead th' )
						.remove();
					this.chart().add_thead_row( this );
				},

				'enter' : function() {
					this.chart().add_thead_row( this );
				},

				'exit' : function() {
					this.remove();
				}
			}
		});


      // add the table body layer
		this.layer("tbody", this.base.append('tbody'), {

			dataBind: function(data) {
				return this.selectAll('tbody tr')
					.data(data, function(d) {
						return d._id || (d._id = ++counter);
					});
			},

			insert: function() {
				return this.append('tr');
			},

			events: {
				'update' : function() {
//					if ( chart.changed_columns ) {
						this.selectAll( 'td' )
							.remove();
						chart.add_tbody_row( this );
//					}
				},

				'enter' : function() {
					chart.add_tbody_row( this );
				},

				'merge' : function() {

				},
				'exit' : function() {
					this.remove();
				}
			}
		});
    }
  });
});
