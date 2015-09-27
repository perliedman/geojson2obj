var extend = require('extend'),
    proj4 = require('proj4'),
    earcut = require('earcut'),
    coordReduce = require('turf-meta').coordReduce,
    verticesFunc = {
        'Polygon': function(coordinates) {
            var coordArrays = coordinates.map(function(ring) {
                return ring.map(function(c) {
                    return c;
                });
            });
            // Flatten
            return [].concat.apply([], coordArrays);
        }
    },
    surfacesFunc = {
        'Polygon': function(coordinates, vertices, baseIndex) {
            var vs = vertices.slice(0, vertices.length - 1),
                faces = vs.map(function(v, i) {
                    return [
                        (i * 2) + baseIndex,
                        (i * 2) + 2 + baseIndex,
                        (i * 2) + 3 + baseIndex,
                        (i * 2) + 1 + baseIndex
                    ];
                });

            if (coordinates.length === 1) {
                // Simple top surface
                faces = faces.concat([vs.map(function(v, i) {
                    return (i * 2 + 1) + baseIndex;
                })]);
            } else {
                // Triangulate top surface
                var flatPolyCoords = [].concat.apply([], vs),
                    holeIndices = coordinates.slice(2).reduce(function(holeIndices, ring, i, arr) {
                        holeIndices.push(arr[i - 1].length);
                        return holeIndices;
                    }, [coordinates[0].length]),
                    triIndices = earcut(flatPolyCoords, holeIndices);
                [].concat.apply(faces, triIndices);
            }

            return faces;
        }
    };

function featuresToObj(features, stream, options) {
    var nIndices = 1;

    features.forEach(function(f) {
        var baseZ = options.featureBase(f),
            topZ = baseZ + options.featureHeight(f),
            materialName = options.featureMaterial(f),
            vertices = verticesFunc[f.geometry.type](f.geometry.coordinates).map(options.coordToPoint),
            surfaces = surfacesFunc[f.geometry.type](f.geometry.coordinates, vertices, nIndices);

        stream.write('g ' + options.featureName(f) + '\n');

        if (materialName) {
            stream.write('usemtl ' + materialName + '\n');
        }

        vertices.forEach(function(v) {
            stream.write('v ' + v[1] + ' ' + baseZ + ' ' + v[0] + '\n');
            stream.write('v ' + v[1] + ' ' + topZ + ' ' + v[0] + '\n');
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
                    return 'feature_' + (++featureNumber) + ' geojson_export';
                };
            })(),
            featureMaterial: function() {
                return undefined;
            },
            coordToPoint: function(c) {
                return c;
            },
            mtllib: []
        }, options);

        geojson = geojson.features || [geojson];
        var mtllib = options.mtllib.length ? options.mtllib : [options.mtllib];

        mtllib.forEach(function(mtllib) {
            stream.write('mtllib ' + mtllib + '\n');
        });

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
