var extend = require('extend'),
    proj4 = require('proj4'),
    coordReduce = require('turf-meta').coordReduce,
    verticesFunc = {
        'Polygon': function(coordinates) {
            return coordinates[0].map(function(c) { return c; });
        }
    },
    surfacesFunc = {
        'Polygon': function(vertices, baseIndex) {
            var vs = vertices.slice(0, vertices.length - 1);
            return vs.map(function(v, i) {
                return [
                    (i * 2) + baseIndex,
                    (i * 2) + 2 + baseIndex,
                    (i * 2) + 3 + baseIndex,
                    (i * 2) + 1 + baseIndex
                ];
            }).concat([vs.map(function(v, i) {
                return (i * 2 + 1) + baseIndex;
            })]);
        }
    };

function featuresToObj(features, stream, options) {
    var nIndices = 1;

    features.forEach(function(f) {
        var baseZ = options.featureBase(f),
            topZ = baseZ + options.featureHeight(f),
            vertices = verticesFunc[f.geometry.type](f.geometry.coordinates).map(options.coordToPoint),
            surfaces = surfacesFunc[f.geometry.type](vertices, nIndices);

        stream.write('g ' + options.featureName(f) + '\n');

        vertices.forEach(function(v) {
            stream.write('v ' + v[0] + ' ' + baseZ + ' ' + v[1] + '\n');
            stream.write('v ' + v[0] + ' ' + topZ + ' ' + v[1] + '\n');
        });

        surfaces.forEach(function(s) {
            stream.write('f ' + s.join(' ') + '\n');
        });
        stream.write('\n');

        nIndices += vertices.length * 2;
    });
}

module.exports = {
    toObj: function(geojson, stream, options) {
        options = extend({
            featureBase: function() {
                return 0;
            },
            featureHeight: function() {
                return 10;
            },
            featureName: (function() {
                var featureNumber = 0;
                return function() {
                    return 'feature_' + (++featureNumber);
                };
            })(),
            coordToPoint: function(c) {
                return c;
            }
        }, options);

        geojson = geojson.features || [geojson];
        return featuresToObj(geojson, stream, options);
    },
    findLocalProj: function(geojson) {
        var cs = coordReduce(geojson, function(memo, c) {
                memo.sum[0] += c[0];
                memo.sum[1] += c[1];
                memo.nCoords++;
                return memo;
            }, {
                sum: [0, 0],
                nCoords: 0
            }),
            clat = cs.sum[1] / cs.nCoords,
            clon = cs.sum[0] / cs.nCoords,
            proj = proj4(proj4.WGS84, '+proj=tmerc +lat_0=' + clat + ' +lon_0=' + clon + ' +k=1.000000 +x_0=0 +y_0=0 +ellps=WGS84 +datum=WGS84 +units=m +no_defs');

        return function(c) {
            return proj.forward(c);
        };
    }
};
