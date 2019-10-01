/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
var app = {

    // Application Constructor
    initialize: function() {
			//Global variable for starting page
	    currentPageId = "page-pending";
	    currentSelectorId = "pending";
        pageIdList = ["pending", "wip", "update", "acct"];
		calllogSnapshotTime = Date.now();

        document.addEventListener('deviceready', this.onDeviceReady.bind(this), false);
		
    },

    // deviceready Event Handler
    //
    // Bind any cordova events here. Common events are:
    // 'pause', 'resume', etc.
    onDeviceReady: function() {

		//check and grant permissions
		//app.grantPermissions();
		permissions = cordova.plugins.permissions;
		

		perms = new Promise(function(resolve,reject){
					var readcalllog = false;
					var readphonestate = false;
					var readcontacts = false;
		
		
					permissions.hasPermission(permissions.READ_CALL_LOG,function(status){
					if (status.hasPermission) {
						console.log("READ_CALL_LOG is present");
						readcalllog = true;
						if (readcalllog && readphonestate && readcontacts) {resolve();}
					}
					else{
						function error() {
							console.warn('READ_CALL_LOG could not be granted');
						}
						function success() {
							console.warn('READ_CALL_LOG was granted !!');
							readcalllog = true;
							readphonestate = true;
							if (readcalllog && readphonestate && readcontacts) {resolve();}
						}
						permissions.requestPermission(permissions.READ_CALL_LOG,success,error);
						permissions.requestPermission(permissions.READ_PHONE_STATE,success,error);

					}
					});
					

					permissions.hasPermission(permissions.READ_CONTACTS,function(status){
					if (status.hasPermission) {
						console.log("READ_CONTACTS is present");
						readcontacts = true;
						if (readcalllog && readphonestate && readcontacts) {resolve();}
					}
					else{
						function error() {
							console.warn('READ_CONTACTS could not be granted');
						}
						function success() {
							console.warn('READ_CONTACTS was granted !!');
							readcontacts = true;
							if (readcalllog && readphonestate && readcontacts) {resolve();}
						}
						permissions.requestPermission(permissions.READ_CONTACTS,success,error);

					}
					});

		});

		
		perms.then(function() {
			console.log("Permissions are in place");
		}).catch(function() {
			console.log("Permissions are not in place");
		});
		//Add an event listener to each button
		pageIdList.forEach(function(page){
			document.getElementById(page).addEventListener("click", app.changePage, false);
		});
		
		//Initialize DB
		  db = window.sqlitePlugin.openDatabase({name: 'test.db', location: 'default'},function(){
		  console.log("DB is opened");
		  db.transaction(function(tr) {
            tr.executeSql('CREATE TABLE IF NOT EXISTS CALL_LOG (CallEpoch INTEGER, CallDate TEXT, CallTime TEXT, CallNumber TEXT, CallType INTEGER, CallDuration INTEGER, Processed TEXT, Display TEXT)');
        },function(error) {
    console.log('Transaction ERROR: ' + error.message);
  },app.refreshCallRecords());

		},function(error) {
    console.log('Transaction ERROR: ' + error.message);
  });
		

    },
	
	refreshCallRecords: function(){
			calllogSnapshotTime = Date.now();
			time30hours = 30*3600*1000;
			epoch30hours = calllogSnapshotTime-time30hours;
			console.log("Trying to filter calllog");
			let filters = [
			{
				"name": "date",
				//"value": new Date('2019-09-14').getTime()*1000,
				"value": epoch30hours,
				//,      1568479458894    1568520000
				"operator": ">="
			},
			{
				"name": "date",
				//"value": new Date('2019-09-14').getTime()*1000,
				"value": calllogSnapshotTime,
				//,      1568479458894    1568520000
				"operator": "<="
			}
			
			];

			window.plugins.callLog.getCallLog(filters, function(data) {
				 console.log(data);
				db.transaction(function(tr) {
				 index = 0;
				 while (index < data.length) { 
					var myDate = new Date(data[index].date);
					var processedFlag = "N";
					if (data[index].type != 3) {
						processedFlag = "Y";
					};
					console.log(myDate.toLocaleString(),data[index].number,data[index].type, data[index].duration,processedFlag,"Y");
					tr.executeSql('INSERT INTO CALL_LOG (CallEpoch, CallDate, CallTime, CallNumber, CallType, CallDuration,Processed,Display) VALUES(?,?,?,?,?,?,?,?)',[data[index].date,myDate.toLocaleDateString(),myDate.toLocaleTimeString(),data[index].number,data[index].type,data[index].duration,processedFlag,"Y"]);
					
					index++;
				};

				},function(error) {
    console.log('Transaction ERROR: ' + error.message);
  },
						db.transaction(function(tx) {
						tx.executeSql('SELECT CallEpoch,CallDate,CallTime,CallNumber,CallType,CallDuration,Processed,Display FROM CALL_LOG',[],function(tx, rs) {
						  console.log("Reading data back from database");
						  var page_pending_doc = document.getElementById('page-pending');
						  var page_wip_doc = document.getElementById('page-wip');
						  var pending_ul = page_pending_doc.querySelector("ul");
						  var wip_ul = page_wip_doc.querySelector("ul");
						  for(var x = 0; x < rs.rows.length; x++) {
  						        console.log('Got CALL_LOG from database: ' + rs.rows.item(x).CallEpoch + ","+ rs.rows.item(x).CallDate+","+ rs.rows.item(x).CallTime +","+rs.rows.item(x).CallNumber +","+rs.rows.item(x).CallType+","+rs.rows.item(x).CallDuration,+rs.rows.item(x).Processed,+rs.rows.item(x).Display );
								  var li = document.createElement("li");
								  // Add Bootstrap class to the list element
								  li.classList.add("list-group-item");
								  li.appendChild(document.createTextNode(rs.rows.item(x).CallDate+" "+ rs.rows.item(x).CallTime +"   "+rs.rows.item(x).CallNumber));
								  if (rs.rows.item(x).Processed == "Y") {
									  wip_ul.appendChild(li);
								  } else {
									  pending_ul.appendChild(li);
								  };

							};
						});
						}));
						

			});
	},
/*	
	grantPermissions: function(){
		
		var permissions = cordova.plugins.permissions;
		
		
		permissions.hasPermission(permissions.READ_CALL_LOG,function(status){
		if (status.hasPermission) {
			console.log("READ_CALL_LOG is present");
		}
		else{
			function error() {
				console.warn('READ_CALL_LOG could not be granted');
			}
			function success() {
				console.warn('READ_CALL_LOG was granted !!');
			}
			permissions.requestPermission(permissions.READ_CALL_LOG,success,error);
			permissions.requestPermission(permissions.READ_PHONE_STATE,success,error);

		}
		});
		

		permissions.hasPermission(permissions.READ_CONTACTS,function(status){
		if (status.hasPermission) {
			console.log("READ_CONTACTS is present");
		}
		else{
			function error() {
				console.warn('READ_CONTACTS could not be granted');
			}
			function success() {
				console.warn('READ_CONTACTS was granted !!');
			}
			permissions.requestPermission(permissions.READ_CONTACTS,success,error);

		}
		});
		},
*/	
	changePage: function(){
		console.log("changePage is triggered");
		var currentSelector = document.getElementById(currentSelectorId);
		var currentPage = document.getElementById(currentPageId);
		var pageId = "page-"+this.id;
		var page = document.getElementById(pageId);
		var pageSelector = document.getElementById(this.id);
		console.log("page is "+page);
		
		if(page.classList.contains("active")){
			return;
		}

		currentSelector.classList.remove("button-active");
		currentSelector.classList.add("button-inactive");
		currentPage.classList.remove("active");
		currentPage.classList.add("inactive");

		pageSelector.classList.remove("button-inactive");
		pageSelector.classList.add("button-active");

		page.classList.remove("inactive");
		page.classList.add("active");

		//Need to reset the scroll
		//$(window).scrollTo(0,0); 

		currentSelectorId = this.id;
		currentPageId = pageId;
		//console.log("currentPageId is "+currentPageId);
		//window.location.reload(true);
	},
	
	        // Transaction error callback
        //
        //errorCB: function(error,code) {
        //    console.log("Error processing SQL: "+err+code);
        //},

        // Transaction success callback
        //
        successCB: function() {
			console.log("Transaction was successful");
        }
		
	//initialize_map: function(map){
		//Clear previous markers
/*
		map.clear(function() {
			console.log("Map Clear completed");
		});
		map.animateCamera({
				//12.9542734,77.5605547
			  target: {lat: 12.9542734, lng: 77.5605547},
			  zoom: 10,
			  tilt: 60,
			  bearing: 0,
			  duration: 5000
		});


        // Add a maker
        var ARRCmarker = map.addMarker({
          position: {lat: 13.020687, lng: 77.657887},
          title: "ARRC" ,
		  icon: {
      url: "http://maps.google.com/mapfiles/kml/pal4/icon55.png"
    },
          animation: plugin.google.maps.Animation.BOUNCE
        });

        var PFAmarker = map.addMarker({
          position: {lat: 12.903647, lng: 77.498106},
          title: "PFA",
		  icon: {
      url: "http://maps.google.com/mapfiles/ms/icons/blue-dot.png"
    },
          animation: plugin.google.maps.Animation.BOUNCE
        });

        var WRRCmarker = map.addMarker({
          position: {lat: 12.801122, lng: 77.577455},
          title: "WRRC",
		  icon: {
      url: "http://maps.google.com/mapfiles/ms/icons/pink-dot.png"
    },
          animation: plugin.google.maps.Animation.BOUNCE
        });

       // Show the info window
        ARRCmarker.showInfoWindow();
		PFAmarker.showInfoWindow();
		WRRCmarker.showInfoWindow();
*/
	//}

};

app.initialize();





