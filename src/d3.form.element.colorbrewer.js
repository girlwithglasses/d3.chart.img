/* global d3, colorbrewer */
/*jshint laxcomma: true */
//(function(){


var ColorBrewerControl = function ( cb ) {
	"use strict";

	this._colorbrewer = cb;

	this._col_abbr = {
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
	};

};

ColorBrewerControl.prototype = {

	constructor: ColorBrewerControl


	/**
		schema: function to generate the schema for a colorbrewer element
		schema is also a property of ColorBrewerControl holding the value of the schema
	*/

	, schema: function() {
		var cbc = this;
		if ( cbc._schema ) {
			return this._schema;
		}

		cbc._schema = {
			type: "object",
			properties: {
				colors: {
					name: 'color_arr',
					type: 'string',
					title: 'Colour scheme',
					control: 'select',
//					enum: get_enum(),
					enum_map: {},
					default: 'Blues'
				}
			}
		};

		cbc._schema.properties.colors.enum = Object.keys( cbc._colorbrewer ).filter(function(c){
			return cbc._colorbrewer[c].hasOwnProperty('9');
		});


		cbc._schema.properties.colors.enum.forEach(function(c){
			var name = c.split( /(?=[A-Z])/ );
			cbc._schema.properties.colors.enum_map[ c ] = name.map( function(n){
				return ( cbc._col_abbr[n] ? cbc._col_abbr[n] : n );
			}).join('/');
		});

		return cbc._schema;
	}

	/** Add a colorbrewer control

	el: element to append the control to
	id: id for the control
	*/

	, add_colorbrewer_control: function ( args ) {
		var cbc = this
		, schema = cbc.schema()
		, cntrl
		;

		if ( ! args.el ) {
			throw new Error('Missing required parameter "el"');
		}
		if ( ! args.id ) {
			throw new Error('Missing required parameter "id"');
		}


		cntrl = d3.select( args.el )
			.append('select')
			.attr('name', 'colors' )
			.attr('id', args.id );

		cntrl.selectAll('option')
		.data( schema.properties.colors.enum )
			.enter()
			.append( 'option' )
			.attr('value', function( d ) { return d; } )
			.text( function( d ){
				return ( schema.properties.colors.enum_map
					? schema.properties.colors.enum_map[d]
					: d );
				});
		return cntrl;
	}
};

//}());
