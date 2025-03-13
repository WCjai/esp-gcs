// ------------------------
// plannig map
// ------------------------

// Initialize maps


var map = L.map('map').setView([-35.3628606, 149.1648333], 15);
L.tileLayer('tiles/{z}/{x}/{y}.png', {
    minZoom: 10,
    maxZoom: 19,
    tileSize: 256,
}).addTo(map);

// offline
var map_1 = L.map('map_1').setView([-35.3628606, 149.1648333], 15);
L.tileLayer('tiles/{z}/{x}/{y}.png', {
    minZoom: 10,
    maxZoom: 19,
    tileSize: 256,
    attribution: 'Map data © OpenStreetMap contributors'
}).addTo(map_1);



var droneIcon = L.icon({
  iconUrl: 'images/marker-icon.png', // Replace with the path to your custom drone icon image
  iconSize: [25, 25],              // Adjust the size as needed
  iconAnchor: [12, 12],            // The point of the icon which corresponds to the marker's location (centered here)
  popupAnchor: [0, -12]            // The point from which popups will open relative to the iconAnchor
});

// Initialize drone markers
var droneMarkerMap = L.marker([-35.3628606, 149.1648333], { icon: droneIcon }).addTo(map);
var droneMarkerMap1 = L.marker([-35.3628606, 149.1648333], { icon: droneIcon }).addTo(map_1);

      // Object for drone data
      let droneData = {
        speed: "--",
        altitude: "--",
        heading: 0,
        pitch: 0,
        roll: 0,
        rssi: "--",
        armed: false,
        flightMode: "UNKNOWN",
        batteryVoltage: 0,
        connected: false,
        latitude: 0,
        longitude: 0
      };
  
      // Periodically fetch /status
      function updateStatus() {
        fetch("/status")
          .then(response => response.json())
          .then(data => {
            droneData = data;
            document.getElementById('speed').innerText = data.speed;
            document.getElementById('altitude').innerText = data.altitude;
            document.getElementById('batteryVoltage').innerText = data.batteryVoltage;
            document.getElementById('rssi').innerText = data.rssi;
            document.getElementById('flightStatus').innerText =
              "Armed: " + (data.armed ? "Yes" : "No") + " | Mode: " + data.flightMode;
            if(data.statustext) {
              document.getElementById('statustext').innerText = data.statustext.join("\n");
            }
            const signalIcon = document.getElementById('signalIcon');
            if (data.connected) {
              signalIcon.innerText = '📶';
            } else {
              signalIcon.innerText = '❌';
            }

            // Update drone marker position if valid GPS data is provided.
            if (data.latitude && data.longitude) {
              // If your JSON values are already in degrees, use them directly.
              let lat = parseFloat(data.latitude);
              let lon = parseFloat(data.longitude);
              droneMarkerMap.setLatLng([lat, lon]);
              droneMarkerMap1.setLatLng([lat, lon]);
            }
            
            // Update drone marker orientation if heading is provided.
            if (data.heading !== undefined) {
              let heading = parseFloat(data.heading);
              // If necessary, adjust the heading offset to match your icon's orientation.
              droneMarkerMap.setRotationAngle(heading);
              droneMarkerMap1.setRotationAngle(heading);
            }
  
          })
          .catch(error => console.error('Error fetching status:', error));
        setTimeout(updateStatus, 100);
      }
      updateStatus();




      let planMarkers = [];           // For markers added by "addPlanMarker" or goto_marker_alt
      let staticPlanMarkers = [];     // For markers added by goto_coordinates_alt (non-draggable)

// Function to add a new draggable marker to the plan page map
function addPlanMarker() {
  // Compute new marker number from the current markers length.
  let newNumber = planMarkers.length + 1;  
  const center = map.getCenter();
  
  // Create a custom DivIcon using the new marker number.
  const customDivIcon = L.divIcon({
    html: '<div class="custom-marker-label">' + newNumber + '</div>',
    iconSize: [25, 25],         // Adjust size as needed
    iconAnchor: [12, 12],       // Center the icon on its coordinates
    popupAnchor: [0, -12],
    className: 'custom-marker-icon' // CSS class for styling
  });
  
  // Create a draggable marker using the custom DivIcon.
  const marker = L.marker([center.lat, center.lng], { 
    draggable: true,
    icon: customDivIcon 
  }).addTo(map);
  
  // Assign the marker its number and name.
  marker.markerNumber = newNumber;
  marker.markerName = "Marker " + newNumber;
  
  // Update the bottom info bar when the marker is clicked or dragged.
  marker.on('click', function() {
    updateMarkerInfo(marker);
  });
  marker.on('dragend', function() {
    updateMarkerInfo(marker);
  });
  
  // Add a custom context menu for deletion on right-click.
  marker.on('contextmenu', function(e) {
    e.originalEvent.preventDefault();
    showMarkerContextMenu(e, marker);
  });
  
  // Add the marker to the global planMarkers array.
  planMarkers.push(marker);
}




// Function to renumber markers sequentially after deletion.
function reassignMarkerNumbers() {
  for (let i = 0; i < planMarkers.length; i++) {
    let newNumber = i + 1;
    let marker = planMarkers[i];
    marker.markerNumber = newNumber;
    marker.markerName = "Marker " + newNumber;
    
    // Update the marker's icon with the new number.
    const updatedIcon = L.divIcon({
      html: '<div class="custom-marker-label">' + newNumber + '</div>',
      iconSize: [25, 25],
      iconAnchor: [12, 12],
      popupAnchor: [0, -12],
      className: 'custom-marker-icon'
    });
    marker.setIcon(updatedIcon);
  }
}
function showMarkerContextMenu(e, marker) {
  let menu = document.getElementById("custom-context-menu");
  if (!menu) {
    menu = document.createElement("div");
    menu.id = "custom-context-menu";
    menu.style.position = "absolute";
    menu.style.background = "#fff";
    menu.style.border = "1px solid #ccc";
    menu.style.padding = "5px";
    menu.style.zIndex = 2000;
    document.body.appendChild(menu);
  }
  menu.innerHTML = "<button id='delete-marker-btn'>Delete Marker</button>";
  
  const mapContainer = document.getElementById("map");
  const rect = mapContainer.getBoundingClientRect();
  menu.style.left = (rect.left + e.containerPoint.x) + "px";
  menu.style.top = (rect.top + e.containerPoint.y) + "px";
  menu.style.display = "block";
  
  document.getElementById("delete-marker-btn").onclick = function() {
    map.removeLayer(marker);
    
    if (marker.isStatic) {
      // Remove marker from staticPlanMarkers.
      const idx = staticPlanMarkers.indexOf(marker);
      if (idx !== -1) {
        staticPlanMarkers.splice(idx, 1);
      }
      // Also remove the marker from staticMarkersMap by checking each key.
      for (const key in staticMarkersMap) {
        if (staticMarkersMap[key] === marker) {
          delete staticMarkersMap[key];
        }
      }
      // (Optionally) reassign numbers for remaining static markers.
      // reassignStaticMarkerNumbers();
    } else {
      const idx = planMarkers.indexOf(marker);
      if (idx !== -1) {
        planMarkers.splice(idx, 1);
        reassignMarkerNumbers();
      }
    }
    hideContextMenu();
  };
}


// Hide the custom context menu.
function hideContextMenu() {
  const menu = document.getElementById("custom-context-menu");
  if (menu) {
    menu.style.display = "none";
  }
}

document.addEventListener("click", function(e) {
  hideContextMenu();
});



// Function to update the bottom bar with the clicked marker's position
function updateMarkerInfo(marker) {
  const pos = marker.getLatLng();
  const infoText = marker.markerName + ": (" + pos.lat.toFixed(5) + ", " + pos.lng.toFixed(5) + ")";
  document.getElementById('marker-info').innerText = infoText;
}

function centerMap(mapInstance, marker) {
      const markerLatLng = marker.getLatLng();
      mapInstance.setView([markerLatLng.lat, markerLatLng.lng]);
}

// Helper function to retrieve marker coordinates from planMarkers array
function getMarkerCoordinates(markerNumber) {
  var index = markerNumber - 1; // Adjust marker number to array index
  if (planMarkers[index]) {
    var pos = planMarkers[index].getLatLng();
    return { lat: pos.lat, lon: pos.lng };
  } else {
    console.error("Marker number " + markerNumber + " does not exist.");
    // Return a default coordinate (center) if the marker doesn't exist
    return { lat: centerLat, lon: centerLon };
  }
}

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js')
    .then(reg => {
      console.log("Service worker registered", reg);
    })
    .catch(err => {
      console.error("Service worker registration failed:", err);
    });
}

function startMissionClient() {
  fetch("/startmission")
    .then(response => response.text())
    .then(data => {
      console.log("Start Mission Response: " + data);
      alert("Mission started!");
    })
    .catch(error => {
      console.error("Error starting mission:", error);
      alert("Error starting mission");
    });
}

function clearmissionClient() {
  fetch("/clearmission")
    .then(response => response.text())
    .then(data => {
      console.log("clearmission: " + data);
    })
    .catch(error => {
      console.error("Error missionlist:", error);
    
    });
}

// Helper: Create and add a marker on the plan page at a specified coordinate.
// Helper: Create and add a marker on the plan page at a specified coordinate that is not draggable.
// Adds a non-draggable static marker to the plan page at the given coordinate,
// using a separate icon and number.
function reassignStaticMarkerNumbers() {
  for (let i = 0; i < staticPlanMarkers.length; i++) {
    let newNumber = i + 1;
    let marker = staticPlanMarkers[i];
    marker.markerNumber = newNumber;
    marker.markerName = "Static Marker " + newNumber;
    // Update the marker’s icon with the new number.
    const updatedIcon = L.divIcon({
      html: '<div class="custom-static-marker-label">' + newNumber + '</div>',
      iconSize: [25, 25],
      iconAnchor: [12, 12],
      popupAnchor: [0, -12],
      className: 'custom-static-marker-icon'
    });
    marker.setIcon(updatedIcon);
  }
}

function addStaticMarkerAt(lat, lon) {
  // Compute a new marker number based on current count.
  let newNumber = staticPlanMarkers.length + 1;
  
  // Create a custom DivIcon using a separate CSS class.
  const customStaticIcon = L.divIcon({
    html: '<div class="custom-static-marker-label">' + newNumber + '</div>',
    iconSize: [25, 25],
    iconAnchor: [12, 12],
    popupAnchor: [0, -12],
    className: 'custom-static-marker-icon'
  });
  
  // Create a marker that is not draggable.
  const marker = L.marker([lat, lon], { 
    draggable: false,
    icon: customStaticIcon 
  }).addTo(map);
  
  marker.markerNumber = newNumber;
  marker.markerName = "Static Marker " + newNumber;
  marker.isStatic = true;
  
  // Attach events for info update and context menu.
  marker.on('click', function() {
    updateMarkerInfo(marker);
  });
  marker.on('contextmenu', function(e) {
    e.originalEvent.preventDefault();
    showMarkerContextMenu(e, marker);
  });
  
  staticPlanMarkers.push(marker);
  return marker;
}

// Helper to clear all static markers and rebuild them from the mission JSON.
function rebuildStaticMarkers(missionObj) {
  // Remove existing static markers from the plan map.
  staticPlanMarkers.forEach(marker => {
    map.removeLayer(marker);
  });
  // Clear the array.
  staticPlanMarkers = [];
  
  // Iterate over the mission items in order.
  missionObj.mission.forEach(function(item) {
    if (item.static === true && 
        item.latitude !== undefined && item.longitude !== undefined &&
        !isNaN(item.latitude) && !isNaN(item.longitude)) {
      // Add a new static marker at the specified coordinates.
      addStaticMarkerAt(Number(item.latitude), Number(item.longitude));
    }
  });
}



// Global variables for sketch mode
let sketchMode = false;
let isDrawing = false;
let currentSketchPolyline = null;
let sketchLayers = []; // Store drawn sketches

// Toggle sketch mode on/off
function toggleSketchMode() {

  sketchMode = !sketchMode;
  const sketchButton = document.getElementById("sketch-button");
  const mapContainer = document.getElementById("map");

  if (sketchMode) {
    // Enter sketch mode:
    sketchButton.innerText = "❌"; // Change button text to "X"
    // Change map cursor (if you have a custom pencil icon, set it here)
    if (eraseMode) {
      toggleEraseMode();
    }
  
    mapContainer.style.cursor = "crosshair"; 

    // Disable map dragging to ease drawing
    map.dragging.disable();
    // Attach event listeners for drawing
    map.on("mousedown", startDrawing);
    map.on("mousemove", draw);
    map.on("mouseup", endDrawing);
  } else {
    // Exit sketch mode:
    sketchButton.innerText = "✏️"; // Change back to Sketch
    mapContainer.style.cursor = "default"; 
    map.dragging.enable();
    // Remove drawing event listeners
    map.off("mousedown", startDrawing);
    map.off("mousemove", draw);
    map.off("mouseup", endDrawing);
    // In case drawing was in progress
    if (isDrawing) {
      isDrawing = false;
      currentSketchPolyline = null;
    }
  }
}

// Called when user presses the mouse down on the map
function startDrawing(e) {
  if (!sketchMode) return;
  isDrawing = true;
  // Create a new polyline starting at this latlng
  currentSketchPolyline = L.polyline([e.latlng], { color: "red", weight: 3 }).addTo(map);
  sketchLayers.push(currentSketchPolyline);
}

// Called when the mouse moves on the map
function draw(e) {
  if (!sketchMode || !isDrawing || !currentSketchPolyline) return;
  // Append the new latlng point to the current polyline
  currentSketchPolyline.addLatLng(e.latlng);
}

// Called when user releases the mouse button
function endDrawing(e) {
  if (!sketchMode || !isDrawing) return;
  isDrawing = false;
  // Optionally, you could finalize the polyline here or do further processing.
  currentSketchPolyline = null;
}



// Global variables for erase mode.
let eraseMode = false;
let eraserSize = 10; // in pixels (radius)
let eraserOverlay = null;  // an overlay element that follows the mouse

// Toggle erase mode on/off.
function toggleEraseMode() {
  eraseMode = !eraseMode;
  const eraseButton = document.getElementById("erase-button");
  const eraserControls = document.getElementById("eraser-size-controls");
  const mapContainer = document.getElementById("map");

  if (eraseMode) {
    // Activate erase mode.
    eraseButton.innerText = "❌";
    eraserControls.style.display = "inline-block";

    // If sketch mode is active, disable it.
    if (sketchMode) {
      toggleSketchMode();
    }

    // Create the eraser overlay if it doesn't exist.
    if (!eraserOverlay) {
      eraserOverlay = document.createElement("div");
      eraserOverlay.id = "eraser-overlay";
      eraserOverlay.style.width = (eraserSize * 2) + "px";
      eraserOverlay.style.height = (eraserSize * 2) + "px";
      mapContainer.appendChild(eraserOverlay);
    }
    // Attach mouse events to the map.
    map.on("mousemove", eraserMouseMove);
    map.on("click", eraserClick);
  } else {
    // Deactivate erase mode.
    eraseButton.innerText = "🧽";
    eraserControls.style.display = "none";
    if (eraserOverlay) {
      eraserOverlay.remove();
      eraserOverlay = null;
    }
    map.off("mousemove", eraserMouseMove);
    map.off("click", eraserClick);
  }
}

// Update the position of the eraser overlay as the mouse moves.
function eraserMouseMove(e) {
  if (eraserOverlay) {
    // e.containerPoint gives pixel coordinates relative to the map container.
    eraserOverlay.style.left = (e.containerPoint.x - eraserSize) + "px";
    eraserOverlay.style.top = (e.containerPoint.y - eraserSize) + "px";
  }
}

// On click, check if any drawn sketch should be erased.
function eraserClick(e) {
  // Get the click point (in container pixels).
  const clickPoint = e.containerPoint;
  
  // We'll check all sketches (stored in sketchLayers) for any point within eraserSize.
  let indicesToRemove = [];
  sketchLayers.forEach((polyline, index) => {
    const latlngs = polyline.getLatLngs();
    for (let latlng of latlngs) {
      const point = map.latLngToContainerPoint(latlng);
      if (clickPoint.distanceTo(point) <= eraserSize) {
        indicesToRemove.push(index);
        break;
      }
    }
  });
  
  // Remove any identified polylines.
  // Sort indices descending so removal does not affect other indices.
  indicesToRemove.sort((a, b) => b - a);
  indicesToRemove.forEach(i => {
    map.removeLayer(sketchLayers[i]);
    sketchLayers.splice(i, 1);
  });
}

// Change the eraser size using plus/minus buttons.
function changeEraserSize(delta) {
  eraserSize = Math.max(5, eraserSize + delta);  // enforce a minimum size of 5px.
  // Update the overlay size if it exists.
  if (eraserOverlay) {
    eraserOverlay.style.width = (eraserSize * 2) + "px";
    eraserOverlay.style.height = (eraserSize * 2) + "px";
  }
  document.getElementById("eraser-size-display").innerText = eraserSize;
}

// Function to download the current sketch as a JSON file.
function downloadSketch() {
  if (sketchLayers.length === 0) {
    alert("No sketch available to download.");
    return;
  }
  
  // Build an object with an array of sketches.
  // Each sketch is an array of points: {lat, lng}.
  let sketchData = sketchLayers.map(polyline => {
    let latlngs = polyline.getLatLngs();
    return latlngs.map(pt => ({ lat: pt.lat, lng: pt.lng }));
  });
  
  let jsonStr = JSON.stringify({ sketches: sketchData }, null, 2);
  
  // Create a Blob and trigger a download.
  let blob = new Blob([jsonStr], { type: "application/json" });
  let url = URL.createObjectURL(blob);
  let a = document.createElement("a");
  a.href = url;
  a.download = "sketch.json";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Function to load a sketch from a downloaded JSON file.
function loadSketch(event) {
  let file = event.target.files[0];
  if (!file) return;
  
  let reader = new FileReader();
  reader.onload = function(e) {
    let contents = e.target.result;
    try {
      let data = JSON.parse(contents);
      if (!data.sketches) {
        alert("Invalid sketch file.");
        return;
      }
      
      // Clear any existing sketch layers from the map.
      sketchLayers.forEach(polyline => map.removeLayer(polyline));
      sketchLayers = [];
      
      // For each saved sketch, create a new polyline on the map.
      data.sketches.forEach(sketch => {
        // Convert each saved point into a Leaflet LatLng.
        let latlngs = sketch.map(pt => L.latLng(pt.lat, pt.lng));
        let polyline = L.polyline(latlngs, { color: "red", weight: 3 }).addTo(map);
        sketchLayers.push(polyline);
      });
      
      alert("Sketch loaded successfully.");
    } catch (err) {
      alert("Error parsing sketch file: " + err);
    }
  };
  reader.readAsText(file);
}

// Global array for fly map sketch layers (the drawn sketch from the plan tab, cloned on fly map)
let flySketchLayers = [];

/**
 * Toggles the display of the sketch (drawn on the plan map) on the fly map.
 */
function toggleFlySketchDisplay() {
  const checkbox = document.getElementById("display-sketch-checkbox");
  if (checkbox.checked) {
    // Display sketch: clone each polyline from sketchLayers onto the fly map.
    flySketchLayers = []; // clear previous fly sketch layers
    sketchLayers.forEach(polyline => {
      // Get the LatLngs from the original polyline.
      let latlngs = polyline.getLatLngs();
      // Create a new polyline with the same style on the fly map.
      let newPoly = L.polyline(latlngs, { color: "red", weight: 3 }).addTo(map_1);
      flySketchLayers.push(newPoly);
    });
  } else {
    // Hide sketch: remove all fly sketch layers from the fly map.
    flySketchLayers.forEach(poly => map_1.removeLayer(poly));
    flySketchLayers = [];
  }
}



// ------------------------
// Blockly configuration
// ------------------------

var toolbox = {
  kind: 'categoryToolbox',
  contents: [
    {
      kind: 'category',
      name: 'English',
      contents: [
        
        { kind: 'block', type: 'takeoff' },
        { kind: 'block', type: 'goto_coordinates_alt' },
        { kind: 'block', type: 'goto_marker_alt' },
      ],
    },
    {
      kind: 'category',
      name: 'தமிழ்',
      contents: [
        
        { kind: 'block', type: 'takeoff_tamil' },
        { kind: 'block', type: 'goto_coordinates_alt_tamil' },
        { kind: 'block', type: 'goto_marker_alt_tamil' },

      ],
    },
  ],
};

Blockly.defineBlocksWithJsonArray([
  {
    type: 'takeoff',
    message0: 'Takeoff to %1 meters',
    args0: [{ type: 'field_number', name: 'ALTITUDE', value: 5 }],
    previousStatement: null,
    nextStatement: null,
    colour: 160,
  },
  {
    type: 'takeoff_tamil',
    message0: ' %1 (மீ) உயரத்திற்கு பற',
    args0: [{ type: 'field_number', name: 'ALTITUDE', value: 5 }],
    previousStatement: null,
    nextStatement: null,
    colour: 160,
  },
  // {
  //   type: 'land',
  //   message0: 'Land the drone',
  //   previousStatement: null,
  //   colour: 120,
  // },
  // {
  //   type: 'wait_seconds',
  //   message0: ' wait %1 seconds',
  //   args0: [
  //     {
  //       type: 'field_number',
  //       name: 'SECONDS',
  //       min: 0,
  //       max: 600,
  //       value: 1,
  //     },
  //   ],
  //   previousStatement: null,
  //   nextStatement: null,
  //   colour: '%{BKY_LOOPS_HUE}',
  // },
  // {
  //   type: 'goto_coordinates',
  //   message0: 'Go to lat %1, lon %2',
  //   args0: [
  //     { type: 'field_number', name: 'LAT', value: 0 },
  //     { type: 'field_number', name: 'LON', value: 0 }
  //   ],
  //   previousStatement: null,
  //   nextStatement: null,
  //   colour: 210,
  // },
  // New block: goto_coordinates_alt with latitude, longitude, and altitude
  {
    type: 'goto_coordinates_alt',
    message0: 'Go to lat %1, lon %2, alt %3',
    args0: [
      { type: 'field_number', name: 'LAT', value: 0 },
      { type: 'field_number', name: 'LON', value: 0 },
      { type: 'field_number', name: 'ALT', value: 5 }
    ],
    previousStatement: null,
    nextStatement: null,
    colour: 210,
  },
  {
    type: 'goto_coordinates_alt_tamil',
    message0: 'இந்த அட்சரேகை %1, தீர்க்கரேகை %2 மற்றும் இந்த %3 (மீ) உயரத்திற்கு செல்லவும்',
    args0: [
      { type: 'field_number', name: 'LAT', value: 0 },
      { type: 'field_number', name: 'LON', value: 0 },
      { type: 'field_number', name: 'ALT', value: 5 }
    ],
    previousStatement: null,
    nextStatement: null,
    colour: 210,
  },
  // New custom block: goto_marker (inputs marker number)
  // {
  //   type: "goto_marker",
  //   message0: "Goto marker %1",
  //   args0: [
  //     {
  //       type: "field_number",
  //       name: "MARKER",
  //       value: 1,
  //       min: 1
  //     }
  //   ],
  //   previousStatement: null,
  //   nextStatement: null,
  //   colour: 210
  // },
  // New custom block: goto_marker_alt (inputs marker number and altitude)
  {
    type: "goto_marker_alt",
    message0: "Goto marker %1 and alt %2",
    args0: [
      {
        type: "field_number",
        name: "MARKER",
        value: 1,
        min: 1
      },
      {
        type: "field_number",
        name: "ALT",
        value: 5
      }
    ],
    previousStatement: null,
    nextStatement: null,
    colour: 210
  },
  {
    type: "goto_marker_alt_tamil",
    message0: "இந்த %2 (மீ) உயரத்துடன் இந்த %1 மார்க்கருக்குச் செல்லவும்",
    args0: [
      {
        type: "field_number",
        name: "MARKER",
        value: 1,
        min: 1
      },
      {
        type: "field_number",
        name: "ALT",
        value: 5
      }
    ],
    previousStatement: null,
    nextStatement: null,
    colour: 210
  }
]);

// Code generators for Blockly blocks

// Wait block returns a wait command with duration.
// javascript.javascriptGenerator.forBlock['wait_seconds'] = function (block) {
//   const seconds = Number(block.getFieldValue('SECONDS'));
//   return `{"cmd": 3000, "param1": ${seconds}},\n`;
// };


// Takeoff block returns a takeoff command using current drone position and the given altitude.
javascript.javascriptGenerator.forBlock['takeoff'] = function (block) {
  var altitude = block.getFieldValue('ALTITUDE');
  // Using current droneData for position (make sure droneData is updated via status)
  return `{"cmd": 22, "latitude": ${droneData.latitude}, "longitude": ${droneData.longitude}, "altitude": ${altitude}},\n`;
};
javascript.javascriptGenerator.forBlock['takeoff_tamil'] = function (block) {
  var altitude = block.getFieldValue('ALTITUDE');
  // Using current droneData for position (make sure droneData is updated via status)
  return `{"cmd": 22, "latitude": ${droneData.latitude}, "longitude": ${droneData.longitude}, "altitude": ${altitude}},\n`;
};


// Land block returns a land command.
// javascript.javascriptGenerator.forBlock['land'] = function (block) {
//   return `{"cmd": 21},\n`;
// };

// // Generator for the goto_coordinates block (latitude and longitude) with a default altitude.
// javascript.javascriptGenerator.forBlock['goto_coordinates'] = function (block) {
//   var lat = block.getFieldValue('LAT');
//   var lon = block.getFieldValue('LON');
//   // Set a default altitude, for example 10.0.
//   return `{"cmd": 16, "latitude": ${lat}, "longitude": ${lon}},\n`;
// };

// Generator for the goto_coordinates_alt block (latitude, longitude, and altitude).
// Global dictionary for static markers created by goto_coordinates_alt blocks.
let staticMarkersMap = {};

// Generator for goto_coordinates_alt block: non-draggable static marker with separate icon.
javascript.javascriptGenerator.forBlock['goto_coordinates_alt'] = function (block) {
  var lat = block.getFieldValue('LAT');
  var lon = block.getFieldValue('LON');
  var alt = block.getFieldValue('ALT');
  // Return JSON including a static flag.
  return `{"cmd": 16, "latitude": ${lat}, "longitude": ${lon}, "altitude": ${alt}, "static": true},\n`;
};
javascript.javascriptGenerator.forBlock['goto_coordinates_alt_tamil'] = function (block) {
  var lat = block.getFieldValue('LAT');
  var lon = block.getFieldValue('LON');
  var alt = block.getFieldValue('ALT');
  // Return JSON including a static flag.
  return `{"cmd": 16, "latitude": ${lat}, "longitude": ${lon}, "altitude": ${alt}, "static": true},\n`;
};
// // Generator for "goto_marker" block: uses a marker number to retrieve its position.
// javascript.javascriptGenerator.forBlock['goto_marker'] = function(block) {
//   var markerNum = Number(block.getFieldValue('MARKER'));
//   var index = markerNum - 1;
//   if (planMarkers[index]) {
//     var pos = planMarkers[index].getLatLng();
//     var lat = pos.lat.toFixed(5);
//     var lon = pos.lng.toFixed(5);
//     return `{"cmd": 16, "latitude": ${lat}, "longitude": ${lon}},\n`;
//   } else {
//     return `{"error": "Marker ${markerNum} not found"},\n`;
//   }
// };

// Generator for "goto_marker_alt" block: uses a marker number and an altitude value.
javascript.javascriptGenerator.forBlock['goto_marker_alt'] = function(block) { 
  var markerNum = Number(block.getFieldValue('MARKER'));
  var alt = Number(block.getFieldValue('ALT'));
  var index = markerNum - 1;
  if (planMarkers[index]) {
    var pos = planMarkers[index].getLatLng();
    var lat = pos.lat.toFixed(5);
    var lon = pos.lng.toFixed(5);
    return `{"cmd": 16, "latitude": ${lat}, "longitude": ${lon}, "altitude": ${alt}},\n`;
  } else {
    return `{"error": "Marker ${markerNum} not found"},\n`;
  }
};

javascript.javascriptGenerator.forBlock['goto_marker_alt_tamil'] = function(block) { 
  var markerNum = Number(block.getFieldValue('MARKER'));
  var alt = Number(block.getFieldValue('ALT'));
  var index = markerNum - 1;
  if (planMarkers[index]) {
    var pos = planMarkers[index].getLatLng();
    var lat = pos.lat.toFixed(5);
    var lon = pos.lng.toFixed(5);
    return `{"cmd": 16, "latitude": ${lat}, "longitude": ${lon}, "altitude": ${alt}},\n`;
  } else {
    return `{"error": "Marker ${markerNum} not found"},\n`;
  }
};

var demoWorkspace = Blockly.inject('blocklyDiv', {
  toolbox: toolbox,
});



  function showSection(sectionId) {
    const sections = document.querySelectorAll('.content');
    sections.forEach(section => section.style.display = 'none');
    const section = document.getElementById(sectionId);
    
    // Display the selected section with an appropriate layout.
    if (sectionId === 'fly-page') {
      section.style.display = 'flex';
      // Ensure the fly page map is properly rendered.
      if (window.map_1) {
        setTimeout(() => { map_1.invalidateSize(); }, 100);
      }
    } else if (sectionId === 'plan-page') {
      section.style.display = 'grid'; // Use grid for plan-page
      // Ensure the plan page map is properly rendered.
      if (window.map) {
        setTimeout(() => { map.invalidateSize(); }, 100);
      }
    } else {
      section.style.display = 'block';
    }
    if (sectionId === 'plan-page' && typeof Blockly !== 'undefined') {
      setTimeout(() => Blockly.svgResize(demoWorkspace), 100);
  }
  }
  showSection('fly-page');
  
      // Send flight mode command
      function setFlightMode(mode) {
        fetch("/setmode?mode=" + mode)
          .then(response => response.text())
          .then(data => console.log("Mode change response: " + data))
          .catch(error => console.error("Error setting mode:", error));
      }
  

  
      // Smooth canvas updates
      function animate() {
        drawHorizon(droneData.pitch, droneData.roll);
        drawCompass(droneData.heading);
        requestAnimationFrame(animate);
      }
      animate();
  
      // Draw horizon
      function drawHorizon(pitch = 0, roll = 0) {
        const canvas = document.getElementById('horizonCanvas');
        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;
        const centerX = width / 2;
        const centerY = height / 2;
        
        // Clear the entire canvas.
        ctx.clearRect(0, 0, width, height);
        
        // Save context and set the origin to the canvas center.
        ctx.save();
        ctx.translate(centerX, centerY);
        
        // Rotate by negative roll (in radians) so that the horizon rotates correctly.
        const rollRad = roll * Math.PI / 180;
        ctx.rotate(-rollRad);
        
        // Define a visible pitch angle range (e.g., 90° total vertically)
        // This means that 90° of pitch will be stretched to fill the canvas height.
        const visibleAngle = 35; // Change this value to adjust spacing.
        const pitchScale = height / visibleAngle; // Pixels per degree.
        
        // Calculate vertical offset for the horizon based on the current pitch.
        // When pitch is 0, the horizon is at y = 0 (the canvas center).
        const pitchOffset = pitch * pitchScale;
        
        // Create sky gradient (from top of canvas to the horizon line).
        let skyGradient = ctx.createLinearGradient(0, -centerY, 0, pitchOffset);
        skyGradient.addColorStop(0, "#001F3F");
        skyGradient.addColorStop(1, "#87CEEB");
        ctx.fillStyle = skyGradient;
        ctx.fillRect(-centerX, -centerY, width, centerY + pitchOffset);
        
        // Create ground gradient (from horizon to bottom of canvas).
        let groundGradient = ctx.createLinearGradient(0, pitchOffset, 0, centerY);
        groundGradient.addColorStop(0, "#228B22");
        groundGradient.addColorStop(1, "#004400");
        ctx.fillStyle = groundGradient;
        ctx.fillRect(-centerX, pitchOffset, width, centerY - pitchOffset);
        
        // Draw the horizon line.
        ctx.strokeStyle = "white";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(-centerX, pitchOffset);
        ctx.lineTo(centerX, pitchOffset);
        ctx.stroke();
        
        // Draw pitch division lines and labels.
        ctx.fillStyle = "white";
        ctx.font = "12px Arial";
        ctx.textAlign = "center";
        
        // Draw pitch marks from -90° to +90° in 10° increments.
        for (let i = -90; i <= 90; i += 10) {
          // Calculate y position for each pitch mark.
          const y = pitchOffset - i * pitchScale;
          // Only draw marks that fall within the canvas vertical bounds.
          if (y < -centerY || y > centerY) continue;
          if (i === 0) continue; // Skip 0° since it's the horizon line.
          ctx.beginPath();
          ctx.moveTo(-20, y);
          ctx.lineTo(20, y);
          ctx.stroke();
          // Draw the pitch labels slightly inset.
          ctx.fillText(i + "°", -30, y + 4);
          ctx.fillText(i + "°", 30, y + 4);
        }
        
        ctx.restore();
        
        // Draw a fixed crosshair at the center (non-rotated).
        ctx.strokeStyle = "yellow";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(centerX - 20, centerY);
        ctx.lineTo(centerX + 20, centerY);
        ctx.moveTo(centerX, centerY - 20);
        ctx.lineTo(centerX, centerY + 20);
        ctx.stroke();
      }
      
      
  
      // Draw compass
      function drawCompass(heading = 0) {
        const canvas = document.getElementById('compassCanvas');
        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;
        const centerX = width / 2;
        const centerY = height / 2;
        const radius = Math.min(centerX, centerY) - 10;
        ctx.clearRect(0, 0, width, height);
        ctx.strokeStyle = "white";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
        ctx.stroke();
        for (let deg = 0; deg < 360; deg += 30) {
          const angle = (deg - 90) * Math.PI / 180;
          const inner = radius - 10;
          const outer = radius;
          const x1 = centerX + inner * Math.cos(angle);
          const y1 = centerY + inner * Math.sin(angle);
          const x2 = centerX + outer * Math.cos(angle);
          const y2 = centerY + outer * Math.sin(angle);
          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.stroke();
          let text = "";
          if (deg === 0) text = "N";
          else if (deg === 90) text = "E";
          else if (deg === 180) text = "S";
          else if (deg === 270) text = "W";
          else text = deg;
          const textRadius = radius - 20;
          const tx = centerX + textRadius * Math.cos(angle);
          const ty = centerY + textRadius * Math.sin(angle) + 4;
          ctx.font = "12px Arial";
          ctx.fillStyle = "white";
          ctx.textAlign = "center";
          ctx.fillText(text, tx, ty);
        }
        ctx.save();
        ctx.translate(centerX, centerY);
        // Rotate by (heading - 90) so that 0° is up.
        ctx.rotate((heading) * Math.PI / 180);
        ctx.fillStyle = "red";
        ctx.beginPath();
        ctx.moveTo(0, 10);
        ctx.lineTo(-5, 0);
        ctx.lineTo(0, -radius + 10);
        ctx.lineTo(5, 0);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
        ctx.beginPath();
        ctx.arc(centerX, centerY, 5, 0, 2 * Math.PI);
        ctx.fillStyle = "white";
        ctx.fill();
        ctx.font = "16px Arial";
        ctx.fillStyle = "white";
        ctx.textAlign = "center";
        ctx.fillText("HDG: " + heading.toFixed(0) + "°", centerX, centerY + radius + 20);
      }

      // function generateMission() {
      //   // Generate the mission code from Blockly.
      //   javascript.javascriptGenerator.INFINITE_LOOP_TRAP = null;
      //   var code = javascript.javascriptGenerator.workspaceToCode(demoWorkspace);
        
      //   // Remove any trailing comma and newline.
      //   code = code.replace(/,\s*$/, "");
        
      //   // Wrap the mission items into an object with a "mission" array.
      //   var jsonMissionStr = '{"mission": [' + code + ']}';
      //   console.log("Generated Mission JSON:\n" + jsonMissionStr);
        
      //   // Optionally, you can parse and add a sequence number here.
      //   var missionObj = JSON.parse(jsonMissionStr);
      //   missionObj.mission.forEach(function(item, index) {
      //     item.seq = index + 1;
      //   });
      //   var finalMissionJSON = JSON.stringify(missionObj);
      //   console.log("Final Mission JSON with sequence numbers:\n" + finalMissionJSON);
        
      //   // Send the mission JSON to the ESP32 via a POST request.
      //   fetch("/mission", {
      //     method: "POST",
      //     headers: {
      //       "Content-Type": "application/json"
      //     },
      //     body: finalMissionJSON
      //   })
      //   .then(response => response.text())
      //   .then(data => {
      //     console.log("Mission upload response: " + data);
      //     alert("Mission uploaded successfully!");
      //   })
      //   .catch(error => {
      //     console.error("Error sending mission code:", error);
      //     alert("Error sending mission code");
      //   });
      // }

      // Array to hold markers added to the fly page map.

      
      function clearmissionClient() {
        fetch("/clearmission")
          .then(response => response.text())
          .then(data => {
            console.log("clearmission: " + data);
            // Clear markers on the fly page map.
            clearFlyMarkers();
          })
          .catch(error => {
            console.error("Error clearing mission:", error);
          });
      }

// Global arrays/variables for fly page markers and polyline.
let flyMarkers = [];
let flyPolyline = null;

function clearFlyMarkers() {
  // Remove the polyline if it exists.
  if (flyPolyline) {
    map_1.removeLayer(flyPolyline);
    flyPolyline = null;
  }
  // Remove all markers from map_1.
  flyMarkers.forEach(marker => {
    map_1.removeLayer(marker);
  });
  flyMarkers = [];
}

function generateMission() {
  // Generate the mission code from Blockly.
  javascript.javascriptGenerator.INFINITE_LOOP_TRAP = null;
  var code = javascript.javascriptGenerator.workspaceToCode(demoWorkspace);
  
  // Remove any trailing comma/newline.
  code = code.replace(/,\s*$/, "");
  
  // Wrap the mission items into an object.
  var jsonMissionStr = '{"mission": [' + code + ']}';
  console.log("Generated Mission JSON:\n" + jsonMissionStr);
  
  // Parse the mission JSON and add sequence numbers.
  var missionObj = JSON.parse(jsonMissionStr);
  missionObj.mission.forEach(function(item, index) {
    item.seq = index + 1;
  });
  var finalMissionJSON = JSON.stringify(missionObj);
  console.log("Final Mission JSON with sequence numbers:\n" + finalMissionJSON);
  
  // Send the mission JSON to the ESP32 via POST.
  fetch("/mission", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: finalMissionJSON
  })
  .then(response => response.text())
  .then(data => {
    console.log("Mission upload response: " + data);
    alert("Mission uploaded successfully!");
    
    // Rebuild the static markers on the plan page so they are cleared and renumbered.
    rebuildStaticMarkers(missionObj);
    
    // Now update the fly page map with the complete mission.
    clearFlyMarkers();
    let markerCoordinates = [];
    
    // Loop over the mission items (regardless of static or draggable)
    missionObj.mission.forEach(function(item, index) {
      if (item.latitude !== undefined && item.longitude !== undefined &&
          !isNaN(item.latitude) && !isNaN(item.longitude)) {
        let lat = Number(item.latitude);
        let lon = Number(item.longitude);
        markerCoordinates.push([lat, lon]);
        
        // Create a custom icon for fly markers.
        const customDivIcon = L.divIcon({
          html: '<div class="custom-marker-label">' + (index + 1) + '</div>',
          iconSize: [25, 25],
          iconAnchor: [12, 12],
          popupAnchor: [0, -12],
          className: 'custom-marker-icon'
        });
        let flyMarker = L.marker([lat, lon], { icon: customDivIcon }).addTo(map_1);
        flyMarkers.push(flyMarker);
      }
    });
    
    // Draw a polyline if two or more markers exist.
    if (markerCoordinates.length > 1) {
      flyPolyline = L.polyline(markerCoordinates, { color: 'blue' }).addTo(map_1);
    }
    
    // Adjust the fly map view to include all markers.
    if (markerCoordinates.length > 0) {
      var bounds = L.latLngBounds(markerCoordinates);
      map_1.fitBounds(bounds);
    }
  })
  .catch(error => {
    console.error("Error sending mission code:", error);
    alert("Error sending mission code");
  });
}
