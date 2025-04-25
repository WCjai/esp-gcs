This project implements a web server on an ESP32 microcontroller that receives MAVLink telemetry data from a drone, processes it, and displays it on a web page using a map.

## Project Structure

The project is structured as follows:

*   **`data/`**: Contains the web page assets, such as HTML, CSS, JavaScript, images and tile map files.
    *   **`data/CSS/`**: CSS stylesheets.
        *   `styles.css`: Style definition of the web page.
    *   **`data/JavaScript/`**: JavaScript files for the webpage.
        *   `script.js`: Contains the logic of the web page, it handles data reception, map drawing, markers, and the menu.
    *   `data/images`: Contains all the images used by the web page.
        *   `marker-icon.png`: The icon that will be used as the drone marker on the map.
    *   `data/tiles`: Contains map tile files.
    *   `blockly_compressed.js`, `blocks_compressed.js`, `javascript_compressed.js`: Blockly dependencies.
    *   `favicon.ico`: Favicon for the web page.
    *   `index.html`: Main web page file.
    *   `leaflet.css`, `leaflet.js`, `leaflet.rotatedMarker.js`: Leaflet.js dependencies.
    *   `sw.js`: Service worker.
    * `msg/js/en.js`: English translations.
*   **`include/`**: Header files. (Currently empty)
*   **`lib/`**: Library files.
    *   `lib/mavlink/`: MAVLink protocol library.
*   **`src/`**: Source code files.
    *   `DroneData.cpp`, `DroneData.h`: Manages the drone data reception, processing, and storing.
    *   `MAVLinkHandler.cpp`, `MAVLinkHandler.h`: Handles the MAVLink communication protocol.
    *   `Utilities.cpp`, `Utilities.h`: Contains utility functions.
    *   `WebServerHandler.cpp`, `WebServerHandler.h`: Manages the web server functionality, routes, and data handling.
    *   `main.cpp`: Main entry point of the application, it initializes the system and handles the main loop.
*   **`test/`**: Contains test files. (Currently empty)
*   **`partition.csv`**: Defines the partition layout for the ESP32's flash memory.
*   **`platformio.ini`**: Configuration file for the PlatformIO build system.
*   **`webpage-demo.code-workspace`**: VS Code workspace file.

## Dependencies

*   **PlatformIO:**  For building and uploading the code.
*   **ESP32 Core:** For ESP32 board support.
*   **AsyncTCP:** For asynchronous TCP communication.
*   **ESP Async WebServer:** For the web server functionality.
*   **Leaflet.js:** For the map display on the web page.
*   **Mavlink library** For the management of the MAVLink protocol.

## Configuration
To make this project work properly, you need to upload all the content of the `data` folder to the ESP's spiffs system. After that, you need to upload the code to the ESP32, and finally, set the serial monitor's baud rate to 115200. The default password for the ESP32's Wi-Fi network is `12345678`.
