$(document).ready(function(){
  var $dbHuisarts;
  var $dbApotheek;
  var $dbFonds;

  var Application = {
    "start": function(){

			// Sticky footer
			$('body').css('paddingBottom', $('footer.page-footer').height()+'px');
      
      // Material design - initialize collapse button
      $(".button-collapse").sideNav({closeOnClick: true, edge: 'right'});
      
      // Material design - initizalize select
      $('select').material_select();
      
      // Initialize modals
      $('.modal').modal({ready: ModalHandler.create});
      
      // Load databases
      DatabaseLoader.start();
    }
  };
  
  var DatabaseLoader = {
    "start": function(){
      this.loadDB1();
    },
    
    "loadDB1": function(){
      var self = this;
      this.getXMLByPromise("https://datatank.stad.gent/4/gezondheid/huisartsen.xml").then(
          function(data) {
              //Ingeladen XML parsen naar bruikbare variabele
              $dbHuisarts = $(jQuery.parseXML(data));
              self.loadDB2();
          },
          function(status) {
              console.log(status);
          }
        );
    },
    
    "loadDB2": function(){
      var self = this;
      this.getXMLByPromise("https://datatank.stad.gent/4/gezondheid/apotheken.xml").then(
          function(data) {
              //Ingeladen XML parsen naar bruikbare variabele
              $dbApotheek = $(jQuery.parseXML(data));
              self.loadDB3();
          },
          function(status) {
              console.log(status);
          }
        );
    },
    
    "loadDB3": function(){
      var self = this;
      this.getXMLByPromise("https://datatank.stad.gent/4/gezondheid/ziekenfondsen.xml").then(
          function(data) {
              //Ingeladen XML parsen naar bruikbare variabele
              $dbFonds = $(jQuery.parseXML(data));
              
              //Router start
      	      Router.start();
      	      
      	      $('.preloader-wrapper').removeClass('active');
          },
          function(status) {
              console.log(status);
          }
        );
    },
    
    //XML inladen (De Pauw beetje aangepast)
    "getXMLByPromise": function(url){
      return new Promise(function(resolve, reject) {
        var xhr = new XMLHttpRequest();
        xhr.open('get', url, true);
        xhr.onload = function() {
            if (xhr.status == 200) {
                var data = xhr.response;
                resolve(data);
            } else {
                reject(status);
            }
        };
        xhr.onerror = function() {
            reject(Error("Network Error"));
        };
        xhr.send();
      });
    }
  }
  
  var ModalHandler = {
  	"create": function(modal){
  	  var keuze;
  		switch (modal.attr('id')){
    		case 'md_dokter':
    			keuze = 'dokter';
    			break;
    		case 'md_apotheker':
    			keuze = 'apotheker';
    			break;
    		case 'md_fonds':
    			keuze = 'fonds';
    			break;
    	}
    	
    	$(modal).find('a.modal-action').click(function(e){
    	  e.preventDefault();
    	  if ($(modal).find('li.active').length){
    	    Router._hasher.setHash('search/'+keuze+'/'+encodeURIComponent($(modal).find('#location').val())+'/'+encodeURIComponent($(modal).find('li.active').find('span').text().toLowerCase()));
    	  } else {
    	    Router._hasher.setHash('search/'+keuze+'/'+encodeURIComponent($(modal).find('#location').val()));
    	  }
    	});
  	}
  }
    
  var Router = {
    "start": function(){
      
      var self = this;
			this._router = crossroads;
			this._hasher = hasher;
			
      //setup crossroads
      crossroads.addRoute('disclaimer', function(){
        self.showPage('disclaimer');
      });
      
      crossroads.addRoute('search/{mode}/:location:', function(mode, location){
      	self.showPage('search', mode, location);
      });
      
      crossroads.addRoute('search/{mode}/:location:/:gender:', function(mode, location, gender){
        self.showPage('search', mode, location, gender);
      });
      
      crossroads.addRoute('', function(){
        self.showPage('home');
      });
      
      //setup hasher
      function parseHash(newHash, oldHash){
        crossroads.parse(newHash);
      }
      
      hasher.initialized.add(parseHash); //parse initial hash
      hasher.changed.add(parseHash); //parse hash changes
      hasher.init(); //start listening for history change
    },
    
    "showPage": function(page, mode, locatie, gender){
      $('nav ul li').removeClass('active');
      $('.page').hide();
      $('#'+page).show();
      
      if (page === 'search'){
        // Tonen in navigatie op welke pagina je zit
        $('nav ul li.'+mode).addClass('active');
        
        // Op elke search-pagina goeie kleur van header en footer
        var color = '';
        switch (mode) {
          case 'dokter':
            color = 'red darken-1';
            break;
          case 'apotheker':
            color = 'orange darken-1';
            break;
          case 'fonds':
            color = 'light-green darken-1';
            break;
        }
        
        $('header nav').removeClass();
        $('header nav').addClass(color);
        $('footer').removeClass();
        $('footer').addClass(color + ' page-footer');
        
        // Als er locatie opgegeven is, die meegeven
        if (locatie){
          Map.init(locatie, mode, gender);
        } else {
          Map.init(null, mode, gender);
        }
        locatie = null;
      }
      else if (page === 'home'){
        // Homepagina juiste kleur header en footer
        $('nav ul li.'+page).addClass('active');
        $('header nav').removeClass();
        $('header nav').addClass('light-blue darken-4');
        $('footer').removeClass();
        $('footer').addClass('light-blue darken-4 page-footer');
      } else {
        // Alle andere pagina's, tonen in navigatie op welke pagina je zit
        $('nav ul li.'+page).addClass('active');
      }
    }
  }
  
  var Map = {
    // bron: https://developers.google.com/maps/documentation/javascript/adding-a-google-map
    "init": function(locatie, mode, gender){
      var self = this;
      var map = new google.maps.Map(document.getElementById('map'),{
          center: {lat: -34.397, lng: 150.644},
          zoom: 15
        }
      );
      var directionsService = new google.maps.DirectionsService;
      var directionsDisplay = new google.maps.DirectionsRenderer;
      directionsDisplay.setMap(map);
      var infoWindow = new google.maps.InfoWindow;
      if (locatie !== null){
        // Locatie opgegeven
        var geocoder = new google.maps.Geocoder;
        this.codeAddress(geocoder, map, infoWindow, locatie, mode, directionsService, directionsDisplay, gender);
      } else {
        // Huidige locatie gebruiken
        // Try HTML5 geolocation - bron: https://developers.google.com/maps/documentation/javascript/geolocation
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(function(position) {
            pos = {
              lat: position.coords.latitude,
              lng: position.coords.longitude
            };
            map.setCenter(pos);
            var marker = new google.maps.Marker({
              map: map,
              position: pos,
              animation: google.maps.Animation.DROP
              // icon: 'styles/images/hospital.png'
            });
            infoWindow.setContent('Your location');
            infoWindow.open(map, marker);
            self.loadData(mode, map, infoWindow, position.coords.latitude, position.coords.longitude, directionsService, directionsDisplay, gender);
          }, function() {
            self.handleLocationError(true, infoWindow, map.getCenter());
          });
        } else {
          // Browser doesn't support Geolocation
          this.handleLocationError(false, infoWindow, map.getCenter());
        }
      }
    },
    
    "loadData": function(mode, map, infoWindow, lat, lng, directionsService, directionsDisplay, gender){
      var markerCollection = {};

      // Database gegevens laden
      $data = null;
      var icon = null;
      var color = null;
      switch (mode){
        case 'dokter':
          $data = $dbHuisarts.find('Placemark');
          icon = 'favorite';
          color = 'red';
          break;
        case 'apotheker':
          $data = $dbApotheek.find('Placemark');
          icon = 'queue';
          color = 'orange';
          break;
        case 'fonds':
          $data = $dbFonds.find('Placemark');
          icon = 'people';
          color = 'green';
          break;
      }
      $('ul.collection').empty();
      $data.each(function(index){
        if (mode == 'dokter' && gender == 'man'){
          if ($(this).find("SimpleData:contains('V')").length){
            return true;
          }
        } else if (mode == 'dokter' && gender == 'vrouw'){
          if ($(this).find("SimpleData:contains('M')").length){
            return true;
          }
        }
        var marker = new google.maps.Marker({
          map: map,
          position: {
            lat: parseFloat($(this).find('coordinates').text().split(',')[1]),
            lng: parseFloat($(this).find('coordinates').text().split(',')[0])
          },
          title: $(this).find('SimpleData[name="NAAM"]').text(),
          icon: 'styles/images/placeholder.png'
        });
        markerCollection[$(this).find('SimpleData[name="DRUPAL_ID"]').text()] = marker;
        
        var contentString = "<h6>"+$(this).find('SimpleData[name="NAAM"]').text()+"</h6>"
                            + "<p>" + $(this).find('SimpleData[name="STRAAT"]').text() + ' ' + $(this).find('SimpleData[name="HUISNR"]').text() + "</p>";
        
        marker.addListener('click', function() {
          if (infoWindow) {
            infoWindow.close();
          }
          infoWindow = new google.maps.InfoWindow({
            content: contentString
          });
          infoWindow.open(map, marker);
        });
        
        var dest = new google.maps.LatLng(parseFloat($(this).find('coordinates').text().split(',')[1]), parseFloat($(this).find('coordinates').text().split(',')[0]));
        
        var distance = google.maps.geometry.spherical.computeDistanceBetween(
          new google.maps.LatLng(lat, lng), 
          dest);
        
        $collectionItem = $('<li class="collection-item avatar" data-id="'+ $(this).find('SimpleData[name="DRUPAL_ID"]').text() +'"></li>')
                          .append(
                              $('<i class="material-icons circle md-64 '+ color +'">'+icon+'</i>')
                            )
                          .append(
                            $('<span class="title">'+ $(this).find('SimpleData[name="NAAM"]').text() +'</span>')
                          ).append(
                            $('<p>'+ $(this).find('SimpleData[name="STRAAT"]').text() + ' ' + $(this).find('SimpleData[name="HUISNR"]').text() 
                            +'<br>'+
                            $(this).find('SimpleData[name="TELEFOON"]').text()
                            +'<br><strong>Afstand: <span class="distance">'+ parseInt(distance) +'</span> meter</strong>' +'</p>'
                            )
                          );
        $collectionItem.click(function(){
          $('li.collection-item').removeClass('selected');
          $(this).addClass('selected');
          var id = $(this).data('id');
          if (infoWindow) {
            infoWindow.close();
          }
          infoWindow = new google.maps.InfoWindow({
            content: contentString
          });
          infoWindow.open(map, markerCollection[id]);
          directionsService.route({
            origin: new google.maps.LatLng(lat, lng),
            destination: dest,
            travelMode: 'WALKING'
          }, function(response, status) {
            if (status === 'OK') {
              directionsDisplay.setOptions( { suppressMarkers: true } );
              directionsDisplay.setDirections(response);
            } else {
              window.alert('Directions request failed due to ' + status);
            }
          });
        });
        $('ul.collection').append($collectionItem);
      });
      this.sortByDistance($('ul.collection'), "li", "span.distance");
    },
    
    "sortByDistance": function(parent, childSelector, keySelector){
      var items = parent.children(childSelector).sort(function(a, b) {
        var vA = parseInt($(keySelector, a).text());
        var vB = parseInt($(keySelector, b).text());
        return (vA < vB) ? -1 : (vA > vB) ? 1 : 0;
      });
      parent.append(items);
    },
    
    // bron: https://developers.google.com/maps/documentation/javascript/geocoding
    "codeAddress": function(geocoder, map, infowindow, locatie, mode, directionsService, directionsDisplay, gender){
      var self = this;
      geocoder.geocode( { 'address': locatie}, function(results, status) {
        if (status == 'OK') {
          map.setCenter(results[0].geometry.location);
          var marker = new google.maps.Marker({
            position: results[0].geometry.location,
            map: map
          });
          var posLat = results[0].geometry.location.lat();
          var posLng = results[0].geometry.location.lng();
          currentLocation = results[0].geometry.location;
          // Adresnaam ophalen en in infowindow steken
          geocoder.geocode({'location': results[0].geometry.location}, function(results, status) {
            if (status === 'OK') {
              if (results[1]) {
                infowindow.setContent(results[0].formatted_address);
                infowindow.open(map, marker);
                self.loadData(mode, map, infowindow, posLat, posLng, directionsService, directionsDisplay, gender);
              }
            }
          });
        } else {
          alert('Adres niet gevonden..');
          console.log(status);
          Router._hasher.setHash('/');
        }
      });
    },
    
    // bron: https://developers.google.com/maps/documentation/javascript/geolocation
    "handleLocationError": function(browserHasGeolocation, infoWindow, pos) {
        infoWindow.setPosition(pos);
        infoWindow.setContent(browserHasGeolocation ?
                              'Error: The Geolocation service failed.' :
                              'Error: Your browser doesn\'t support geolocation.');
      }
  }
  
  Application.start();
});

