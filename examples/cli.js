#!/usr/bin/node

var convert = require('../'),
    fs = require('fs'),
    geojson = JSON.parse(fs.readFileSync(process.argv[2]));

convert.toObj(geojson, process.stdout, {
    coordToPoint: convert.findLocalProj(geojson)
});
