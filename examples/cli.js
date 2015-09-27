#!/usr/bin/node

var convert = require('../'),
    fs = require('fs'),
    geojson = JSON.parse(fs.readFileSync(process.argv[2])),
    mtl = process.argv[3],
    mtllibs = process.argv.slice(4),
    options = {
        coordToPoint: convert.findLocalProj(geojson),
        mtllib: mtllibs
    };

if (mtl) {
    options.featureMaterial = function() {
        return mtl;
    };
}

convert.toObj(geojson, process.stdout, options);
