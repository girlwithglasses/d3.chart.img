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

	d3.chart("FormMaker", {

	schema: function( _ ) {

		if( ! arguments.length ) { return chart.options.schema; }

		chart.options.schema = _;

		chart.trigger("change:schema");
		if( chart.data ) { chart.draw(chart.data); }

		return chart;
	},

	draggable: function( _ ) {
		var chart = this;

		if( ! arguments.length ) { return chart.d3.drag || null; }

		if (_) {
			chart.d3.drag = d3.behavior.drag();
		}
		else {
			chart.d3.drag = null;
		}

		chart.trigger("change:draggable");
		if( chart.data ) { chart.draw(chart.data); }

		return chart;
	},



	/** Add a title and description

	args.el -- element
	args.d  -- data item
	*/
	_add_titles( args ) {
		var d = args.d;
		if ( d.title ) {
			args.el.append('h4')
				.classed( d.value + '__title', true )
				.html( d.title );
		}
		if ( d.description ) {
			args.el.append('p')
				.classed( d.value + '__description', true )
				.html( d.description );
		}
		return;
	},


	/**
	args.el -- element
	args.d  -- data item
	args.e  -- either an item from an enum array or the value
	*/

	_add_input_label( args ) {
		args.el.append('input')
			.attr('type', args.d.control )
			.attr('name', args.d.name )
			.attr('value', args.e )
			.attr('id', args.d.name + '_' + args.e )
			.classed( args.d.value + "__" + args.d.control + '--' + args.e, true )
		.append('label')
			.classed( args.d.value + "__label" + '--' + args.e, true )
			.attr('for', args.d.name + '_' + args.e)
			.html( args.d.enum_map ? args.d.enum_map[e] : args.e );
		return;
	},

	dnd_box: function( args ){
		var d = args.d;

		this._add_titles( args );

		var el = args.el;

		el.append('div')
			.attr('id', d.name + '__inbox')
			.data( d.enum.map( function(i) {
				return { value: i, title: d.enum_map[i] };
			} ), function(i){ return i.value; } )
			.enter()
				.append('span')
				.classed( d.name + '__dnd', true )
				.attr( 'data-value', function(i) {
					return i.value;
				})
				.text( function(i) { return i.title } );

// 			.html( function(){
// 				return d.enum.map( function(e){
// 					return '<span data-value="' + e + '"'
// 						+ ' class="' + d.name + '__dnd">'
// 						+ ( d.enum_map ? d.enum_map[e] : e )
// 						+ '</span>';
// 					}).join(' ');
// 			});

		el.append('div')
			.attr('id', d.name + '__outbox');

		return;

	},


	/**
	args.el -- element
	args.d  -- data item
	*/

	radio_checkbox: function( args ) {
		var chart = this
		, d = args.d
		;
		if ( d.enum ) {
			d.enum.forEach( function(e){
				chart._add_input_label({ el: args.el, d: d, e: e });
			});
		}
		else {
			chart._add_input_label({ el: args.el, d: d, e: d.value });
		}
		return;
	},

	/**
	args.el -- element
	args.d  -- data item
	*/

	select: function( args ) {
		var chart = this
		, d = args.d
		;

		this._add_titles( args );

		args.el.append('label')
			.attr('for', d.name )
			.classed( d.value + '__label', true )
			.text( d.title )
		.append('select')
			.attr('name', d.name )
			.attr('id', d.name )
			.html( function(){
				return d.enum.map( function(e){
					return '<option value"' + e
						+ ( d.default && e === d.default ? '" selected>' : '">' )
						+ ( d.enum_map ? d.enum_map[e] : e )
						+ '</option>';
					}).join(' ');
			});
		return;
	},

    transform: function(data) {
      var chart = this;

      chart.data = data;

      return data;
    },


    initialize: function( options ) {

		var chart = this
		, counter = 0
		, el = chart.base.node()
		;

		chart.options = options || {};
		chart.d3 = {};

		// make sure we have a <table> element
		if ( el.tagName.toLowerCase() !== 'form' ) {
			chart.base = d3.select( el ).append('form');
		}

		chart.options = {};

		this.layer('form', this.base, {

			dataBind: function( data ){
				console.log('entering the dataBind event');
				return this.selectAll('fieldset')
					.data( [ data.properties ], function(d) {
						return d._id || (d._id = ++counter);
					});
			},

			insert: function() {
				return this.append( 'fieldset' );
			},

			events: {
				'update' : function() {
					console.log('running update event');
					this.selectAll( 'fieldset' )
						.remove();
					var data;
					this.classed('autogen', function(d) {
						data = d;
						return true;
					});
					this.chart()[ data.control ]({ el: this, d: data });
				},

				'enter' : function() {
					console.log('running enter event');
					var data;
					this.classed('autogen', function(d) {
						data = d;
						return true;
					});
					this.chart()[ data.control ]({ el: this, d: data });
				},

				'exit' : function() {
					console.log('running exit event');
					this.remove();
				}
			}
		});
    }
  });
});
