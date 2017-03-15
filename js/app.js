////////////////////////////////////////////////////||
// ROB KANDEL  										||
// kandelrob@gmail.com								||
// 													||
// created 12.30.15	| updated 01.02.16				||
// app.js											||
// version 0.0.1									||
////////////////////////////////////////////////////||
var _quake = (function(){
	var _map, _data_list = [], _marker_list=[], _quake_layer, _updated, _units = 'mi', _locations = [], _time = 'day', _magnitude = 'all', _places = 'all'; 
	_states = ['Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut', 'Delaware', 'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa', 'Kansas', 'Kentucky', 'Louisiana', 'Maine', 'Maryland', 'Massachusetts', 'Michigan', 'Minnesota', 'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire', 'New Jersey', 'New Mexico', 'New York', 'North Carolina', 'North Dakota', 'Ohio', 'Oklahoma', 'Oregon', 'Pennsylvania', 'Rhode Island', 'South Carolina', 'South Dakota', 'Tennessee', 'Texas', 'Utah', 'Vermont', 'Virginia', 'Washington', 'West Virginia', 'Wisconsin', 'Wyoming', 'Washington DC'];
	method = {
		init: function(){
			_time = ((method.url_parameter('time') != '') ? method.url_parameter('time'): 'day');
			if (_time != 'day'){
				jQuery('#time_radio_'+_time).prop('checked', 'checked');
			}
			_magnitude = ((method.url_parameter('magnitude') != '') ? method.url_parameter('magnitude'): 'all');
			_places = ((method.url_parameter('location') != '') ? method.url_parameter('location').split(','): 'all');
			method.map.start_map();
			method.get_data.by_time();
		},
		url_parameter: function(search){
			var _page_url = decodeURI(window.location.search.substring(1));
			var _url_variables = _page_url.split('&');
			for (var i = 0; i < _url_variables.length; i++) {
				if (search == _url_variables[i].split('=')[0]) {
					return _url_variables[i].split('=')[1]
				}
			}
			return ''
		},
		update_query_string: function(key, value){
			var re = new RegExp("([?&])" + key + "=.*?(&|$)", "i"), _url = window.location.href, _new_url;
  			var separator = _url.indexOf('?') !== -1 ? "&" : "?";
  			_new_url = (_url.match(re)) ? _url.replace(re, '$1' + key + "=" + value + '$2') : _url + separator + key + "=" + value;
  			if (history.replaceState) {
    			window.history.replaceState({path:_new_url},'',_new_url);
			}
		},
		pick_location: function(){
			jQuery('#geocode_search').on('click', function(){
				if(jQuery('#geocode_input').val().length >= 1){
					method.geocode.google(jQuery('#geocode_input').val())
				}
			});
		},
		return_coords: function(pos){
			if ('latitude' in pos.coords && 'longitude' in pos.coords) {
				method.get_data.find_stations(pos.coords.latitude, pos.coords.longitude);
			} else {
				alert('Something went wrong, try typing your address');
				jQuery('.preloaderWrapper').hide();
				jQuery('.searchWrapper').show();
			}
		},
		setup_form: function(){
			jQuery('#submit_form').unbind();
			jQuery('#submit_form').on('click', function(){
				method.submit_form();
			});
			jQuery('#all_mag').on('click', function(){
				for (var i = 0; i < 10; i+=2){
					jQuery('#mag_'+i).prop('checked', (jQuery('#all_mag').is(':checked')) ? true : false);
				}
			});
			var _temp_mag = [], t = _magnitude.split(',');
			for (var i in t){
				_temp_mag.push(parseFloat(t[i]))
			}
			for (var i = 0; i < 10; i+=2){
				jQuery('#mag_'+i).on('click', function(){
					if(jQuery('#all_mag').is(':checked')){
						jQuery('#all_mag').prop('checked', false);
					}
				});
				if (_magnitude != 'all'){
					jQuery('#mag_'+i).prop('checked', jQuery.inArray(i, _temp_mag) != -1);
				}
			}
			if (_magnitude != 'all'){
				jQuery('#all_mag').prop('checked', false);
			}
			if (_places != 'all'){
				jQuery('#all_locations').prop('checked', false);
			}
		},
		form_locations: function(){
			jQuery('#all_locations').unbind();
			jQuery('#all_locations').on('click', function(){
				jQuery('.foundLocation').each(function(){
					jQuery(this).find('input').prop('checked', (jQuery('#all_locations').is(':checked')) ? true : false);
				})
			});
			jQuery('.foundLocation').each(function(){
				jQuery(this).find('input').on('click', function(){
					if(jQuery('#all_locations').is(':checked')){
						jQuery('#all_locations').prop('checked', false);
					}
				});
				if (_places != 'all'){
					jQuery(this).find('input').prop('checked', jQuery.inArray(jQuery(this).find('input').attr('id').split('_locations')[0], _places) != -1);
				}
			});
		},
		submit_form: function(){
			if (jQuery('#all_locations').is(':checked')){
				_places = 'all'
				method.update_query_string('location', _places);
			} else {
				_places = [];
				jQuery('.foundLocation').each(function(){
					if (jQuery(this).find('input').is(':checked')){
						_places.push(jQuery(this).find('input').attr('id').split('_locations')[0])
					}
				});
				console.log(_places)
				method.update_query_string('location', _places);
			}
			if (jQuery('#all_mag').is(':checked')){
				_magnitude = 'all'
				method.update_query_string('magnitude', _magnitude);
			} else {
				_magnitude = [];
				for (var i = 0; i < 10; i+=2){
					if (jQuery('#mag_'+i).is(':checked')){
						_magnitude.push(i, (i+1))
						if (i == 8){
							_magnitude.push(10)
						}
					}
				}
				method.update_query_string('magnitude', _magnitude);
			}
			if (jQuery('input[name="time_radios"]:checked').attr('id').split('time_radio_')[1] != _time){
				_time = jQuery('input[name="time_radios"]:checked').attr('id').split('time_radio_')[1];
				method.get_data.by_time(_time);
				method.update_query_string('time', _time);
			} else {
				method.map.clear_all();
				method.map.add_points(_data_list);
			}
			jQuery('.filter-control').removeClass('filterWrapperActive');
		},
		map: {
			start_map: function(){
				_map = L.map('the_map', {
                    center: [((method.url_parameter('lat') != '') ? method.url_parameter('lat') : 39.50), ((method.url_parameter('lng') != '') ? method.url_parameter('lng') : -98.35)],
                    zoom: (method.url_parameter('zoom') ? method.url_parameter('zoom'): 5),
                   	minZoom: 3,
                   	maxZoom: 14,
                    detectRetina: true
                });
                var _layer = L.tileLayer('http://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png', {
                    attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, &copy; <a href="http://cartodb.com/attributions">CartoDB</a>'
                }).addTo(_map);
				var _legend = L.control({position: 'bottomleft'});
				_legend.onAdd = function (_map) {
    				var div = L.DomUtil.create('div', 'info legend');
        			div.innerHTML += '<div class="title">Earthquake Magnitude</div><div class="dataWrapper"><div class="label labelLeft">0</div><div class="squares"><div class="dataSquare square2"></div><div class="dataSquare square4"></div><div class="dataSquare square6"></div><div class="dataSquare square8"></div><div class="dataSquare square10"></div><div class="clearAll"></div></div><div class="label labelRight">10</div></div></div>';
    				return div;
				};
				_legend.addTo(_map);
				var _filter = L.control({position: 'topleft'});
				_filter.onAdd = function (_map) {
    				var div = L.DomUtil.create('div', 'info filter-control');
        			div.innerHTML += '<div class="filterWrapper"><div class="filterButton transitionAll buttonItem"><i class="fa fa-filter transitionAll"></i></div><div class="navWrapper transitionAll"><div class="navWrapperInner"><div class="title">Filter Data</div><div class="dataWrapper"><div class="form-group"><div class="sectionOptions"><div class="btn-group"> <button type="button" class="btn btn-default">Location</button> <button type="button" class="btn btn-default dropdown-toggle" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false"> <span class="caret"></span> </button> <ul class="dropdown-menu" id="location_dropdown"> <li role="separator" class="divider"></li><li><a data-target="#"><input type="checkbox" id="all_locations" checked> Show All</a></li></ul></div></div></div><div class="form-group"><div class="sectionOptions"><div class="btn-group"> <button type="button" class="btn btn-default">Magnitude</button> <button type="button" class="btn btn-default dropdown-toggle" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false"> <span class="caret"></span> </button> <ul class="dropdown-menu"> <li><a data-target="#"><input type="checkbox" id="mag_0" checked> 0.00 - 1.99</a></li><li><a data-target="#"><input type="checkbox" id="mag_2" checked> 2.00 - 3.99</a></li><li><a data-target="#"><input type="checkbox" id="mag_4" checked> 4.00 - 5.99</a></li><li><a data-target="#"><input type="checkbox" id="mag_6" checked> 6.00 - 7.99</a></li><li><a data-target="#"><input type="checkbox" id="mag_8" checked> 8.00 - 10.0</a></li><li role="separator" class="divider"></li><li><a data-target="#"><input type="checkbox" id="all_mag" checked> Show All</a></li></ul></div></div></div><div class="form-group"><div class="sectionOptions"><div class="btn-group"> <button type="button" class="btn btn-default">Time Frame</button> <button type="button" class="btn btn-default dropdown-toggle" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false"> <span class="caret"></span> </button> <ul class="dropdown-menu"> <li><a data-target="#"><input type="radio" name="time_radios" id="time_radio_day" value="day" checked> Day</a></li><li><a data-target="#"><input type="radio" name="time_radios" id="time_radio_week" value="week"> Week</a></li><li><a data-target="#"><input type="radio" name="time_radios" id="time_radio_month" value="month"> Month</a></li></ul></div></div></div><div class="form-group"><button type="button" class="btn btn-primary" id="submit_form">Search</button></div></div></div></div></div>';
        			L.DomEvent.on(div, 'mousewheel', L.DomEvent.stopPropagation).on(div, 'DOMMouseScroll', L.DomEvent.stopPropagation).on(div, 'touchstart', L.DomEvent.stopPropagation)
    				return div;
				};
				_filter.addTo(_map);
				jQuery('.filterButton').on('click', function(){
					(jQuery('.filter-control').hasClass('filterWrapperActive')) ? jQuery('.filter-control').removeClass('filterWrapperActive') : jQuery('.filter-control').addClass('filterWrapperActive');
				});
				_map.on('moveend', function(e){
					method.update_query_string('lat', _map.getCenter().lat)
					method.update_query_string('lng', _map.getCenter().lng)
				})
				_map.on('zoomend', function(e){
					method.update_query_string('zoom', _map.getZoom())
				});
				method.setup_form();
			},
			add_points: function(list) {
				_quake_layer = new L.LayerGroup();
                _quake_layer.clearLayers();
                _marker_list = [];
				var _fullBounds = new L.LatLngBounds();
				for (i in list) {
					var _marker = L.circleMarker(new L.LatLng(list[i].lat, list[i].lng), {
					    color: '#444',
					    opacity: 0.2,
					    weight: 1,
					    fillColor: method.parse_data.pick_color(list[i].magnitude),
					    fillOpacity: (parseFloat(list[i].magnitude) / 10),
					    className: list[i].magnitude.toString()
					});
                    if ((method.parse_data.in_magnitude(list[i].magnitude) || _magnitude == 'all') && (method.parse_data.in_location(list[i].state) || _places == 'all')) {
                    	if(jQuery.inArray(list[i].state, _states) >= 0){
                    		_fullBounds.extend(new L.LatLng(list[i].lat, list[i].lng));
                    	}
						_quake_layer.addLayer(_marker);
                    	_marker.bindPopup('<table class="table"><thead><tr><th style="border-bottom: 2px solid #ccc;"><h4 style="margin: 0;">Magnitude:</h4></th><th style="border-bottom: 2px solid #ccc;"><h4 style="margin: 0;">'+list[i].magnitude+'</h4></th></tr></thead><tbody><tr><td style="padding-top: 5px;"><b>Location:</b></td><td style="padding-top: 5px;">'+list[i].place+'</td></tr><tr><td><b>Depth:</b></td><td>'+method.parse_data.convert_units(list[i].depth)+' '+_units+'</td></tr><tr><td><b>Time:</b></td><td>'+method.parse_data.convert_date(list[i].time)+'</td></tr><tr><td>&nbsp;</td><td><a href="'+list[i].url+'" target="_blank">More Info <i class="fa fa-long-arrow-right"></i></a></td></tr></tbody></table>')
                    	_marker_list.push(_marker);
                    }
                    if (jQuery.inArray(list[i].state, _locations) == -1){
                    	_locations.push(list[i].state);
                    }
				}
				method.parse_data.add_locations_to_dropdown(_locations);
				_quake_layer.addTo(_map);
				if (_marker_list.length > 0 && method.url_parameter('lat') == '' && method.url_parameter('lng') == '' && method.url_parameter('zoom') == '') {
					_map.panTo(_map.fitBounds(_fullBounds).getCenter())
				}
				method.form_locations();
				jQuery('.preloaderWrapper').hide();
			},
			remove_layer: function(_layer) {
				_map.removeLayer(_layer);
				_marker_list = [];
			},
			clear_all: function(){
				if(typeof(_quake_layer) != 'undefined'){
					method.map.remove_layer(_quake_layer);
				}
				jQuery('.foundLocation').remove();
			}
		},
		get_data: {
			by_time: function(){
				_data_list = [];
				_locations = [];
				jQuery('.preloaderWrapper').show();
				jQuery.ajax({
					url: 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_'+_time+'.geojson',
					dataType: 'json',
					success: function(d){
						method.parse_data.parse_data(d);
					},
					error: function(){
						alert('Something went wrong, please try again')
					}
				})
			}
		},
		parse_data: {
			parse_data: function(data){
				method.map.clear_all();
				_updated = data.metadata.generated;
				for (i in data.features) {
					_data_list.push({
						index: i,
						lat: data.features[i].geometry.coordinates[1],
						lng: data.features[i].geometry.coordinates[0],
						depth: data.features[i].geometry.coordinates[2],
						id: data.features[i].id,
						magnitude: data.features[i].properties.mag,
						place: data.features[i].properties.place, 
						time: data.features[i].properties.time,
						text: data.features[i].properties.title,
						type: data.features[i].properties.type,
						tsunami: data.features[i].properties.tsunami,
						url: data.features[i].properties.url,
						city: method.parse_data.quake_location(data.features[i].properties.place).city,
						state: method.parse_data.quake_location(data.features[i].properties.place).state
					});
				}
				method.map.add_points(_data_list);
				//jQuery('.footer').html('Source: <a href="http://earthquake.usgs.gov/" target="_blank">USGS</a> | Updated: '+method.parse_data.convert_date(_updated)+' | <span><a href="https://github.com/robkandel/quake" target="_blank"><i class="fa fa-github-square"></i> Created by: Rob Kandel</a></span>')
			},
			quake_location: function(place){
				return {
					city: place.split(',')[0].split(' ')[place.split(',')[0].split(' ').length - 1],
					state: place.split(', ')[1]
				}
			},
			in_location: function(place){
				if (_places == 'all'){
					return true
				} else {
					if (typeof(_places) == 'string'){
						_places = _places.split(',');
					}
					return (jQuery.inArray(place, _places) != -1)
				}
			},
			in_magnitude: function(num){
				if (_magnitude == 'all'){
					return true
				} else {
					if (typeof(_magnitude) == 'string'){
						var _temp_mag = [], t = _magnitude.split(',');
						for (var i in t){
							_temp_mag.push(parseFloat(t[i]))
						}
						_magnitude = _temp_mag;
					}
					return (jQuery.inArray(Math.floor(parseFloat(num)), _magnitude) != -1)
				}
			},
			add_locations_to_dropdown: function(list){
				var _list = list.sort();
				for (i in _list){
					if (_list[i] != undefined){
						jQuery('#location_dropdown').find('.divider').before('<li class="foundLocation"><a data-target="#"><input type="checkbox" id="'+_list[i]+'_locations" checked> '+_list[i]+'</a></li>');
					}
				}
			},
			pick_color: function(mag){
				if (parseFloat(mag) < 2){
					return '#FCA600'
				} else if (parseFloat(mag) < 4){
					return '#EE8900'
				} else if (parseFloat(mag) < 6){
					return '#DE6D00'
				} else if (parseFloat(mag) < 8){
					return '#D95100'
				} else if (parseFloat(mag) <= 10){
					return '#D23600'
				}
			},
			convert_units: function(depth){
				if (_units == 'km'){
					return depth
				}
				if (_units != 'mi'){
					_units = 'mi'
				}
				return (Math.round((depth * (5/3.1)) * 100) / 100).toFixed(2);
			},
			convert_date: function(time){
				var _d = new Date(time);
				var hours = _d.getHours(), minutes = "0" + _d.getMinutes(), seconds = "0" + _d.getSeconds(), am = ((hours >= 12) ? 'PM' : 'AM');
				hours = (hours >= 12) ? (hours - 12) : hours;
				return _d.toDateString() + ' ' + hours + ':' + minutes.substr(-2) + ':' + seconds.substr(-2) + ' ' + am;
			},
			calc_time: function(num) {
				var _min = Math.floor(num / 60);
				if (_min == 0) {
					return 'Less than 1 min ago';
				}
				return _min + ' min ' + (Math.round(Math.floor(100 * (((num / 60) % 1) * 60)) / 100)).toString() + ' sec ago'
			},
			capitalize_first_letter: function(str) {
				return str.toLowerCase().replace( /\b\w/g, function (m) {
                	return m.toUpperCase();
            	});
			}
		}
	}
	return method;
})();