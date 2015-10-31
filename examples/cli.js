#!/usr/bin/node

var convert = require('../'),
    localProj = require('local-proj'),
    fs = require('fs'),
    geojson = JSON.parse(fs.readFileSync(process.argv[2])),
    mtl = process.argv[3],
    mtllibs = process.argv.slice(4),
    options = {
        projection: localProj.find(geojson),
        mtllib: mtllibs
    };

if (mtl) {
    options.featureMaterial = function(f, cb) {
        process.nextTick(function() { cb(undefined, mtl); });
    };
}

convert.toObj(geojson, process.stdout, function(err) {
    if (err) {
        process.stderr.write(err + '\n');
    }
}, options);
