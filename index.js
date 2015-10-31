var extend = require('extend'),
    async = require('async'),
    featureToGeoJson = require('./feature-to-geojson'),
    proj4 = require('proj4');

function featuresToObj(features, stream, cb, options) {
    async.reduce(features, options.vertexStartIndex || 1, function(vertexIndex, f, cb) {
        featureToGeoJson(f, stream, vertexIndex, options, function(err, nVerts) {
            if (err) {
                cb(err);
                return;
            }

            cb(undefined, vertexIndex + nVerts);
        });
    }, cb);
}

module.exports = {
    toObj: function(geojson, stream, cb, options) {
        options = extend({
            featureBase: function(f, cb) {
                process.nextTick(function() { cb(undefined, 0); });
            },
            featureHeight: function(f, cb) {
                process.nextTick(function() { cb(undefined, 10); });
            },
            lineWidth: function(f, cb) {
                process.nextTick(function() { cb(undefined, 2); });
            },
            featureName: (function() {
                var featureNumber = 0;
                return function(f, cb) {
                    cb(undefined, 'feature_' + (++featureNumber) + ' geojson_export');
                };
            })(),
            featureMaterial: function(f, cb) {
                process.nextTick(function() { cb(); });
            },
            projection: proj4.WGS84,
            mtllib: []
        }, options);

        geojson = geojson.features || [geojson];
        var mtllib = Array.isArray(options.mtllib) ? options.mtllib : [options.mtllib];

        mtllib.forEach(function(mtllib) {
            stream.write('mtllib ' + mtllib + '\n');
        });

        featuresToObj(geojson, stream, cb, options);
    }
};
