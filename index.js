var extend = require('extend'),
    earcut = require('earcut'),
    buffer = require('turf-buffer'),
    async = require('async'),
    polygonFaces = function(vertices, baseIndex) {
        return vertices.map(function(v, i) {
            return [
                (i * 2) + baseIndex,
                (i * 2) + 2 + baseIndex,
                (i * 2) + 3 + baseIndex,
                (i * 2) + 1 + baseIndex
            ];
        });
    },
    polygonTopSurface = function(vertices, baseIndex) {
        return [vertices.map(function(v, i) {
            return (i * 2 + 1) + baseIndex;
        })];
    },
    transforms = {
        'LineString': function(f, options, cb) {
            options.lineWidth(f, function(err, width) {
                if (err) {
                    cb(err);
                    return;
                }
                cb(undefined, buffer(f, width / 2, 'meters'));
            });
        }
    },
    verticesFunc = {
        'Polygon': function(coordinates) {
            // Flatten
            return [].concat.apply([], coordinates);
        }
    },
    surfacesFunc = {
        'Polygon': function(coordinates, vertices, baseIndex) {
            var vs = vertices.slice(0, vertices.length - 1),
                faces = polygonFaces(vs, baseIndex);

            if (coordinates.length === 1) {
                // Simple top surface
                faces = faces.concat(polygonTopSurface(vs, baseIndex));
            } else {
                // Triangulate top surface
                var flatPolyCoords = [].concat.apply([], vs),
                    holeIndices = coordinates.slice(2).reduce(function(holeIndices, ring, i) {
                        var prevHoleIndex = holeIndices[holeIndices.length - 1];
                        holeIndices.push(prevHoleIndex + coordinates[i + 1].length * 2);
                        return holeIndices;
                    }, [coordinates[0].length * 2]);
                var triIndices = earcut(flatPolyCoords, holeIndices);
                [].concat.apply(faces, triIndices);
            }

            return faces;
        }
    };

function featureToGeoJson(f, stream, nIndices, options, cb) {
    var transformFunc = transforms[f.geometry.type] || function(f, options, cb) {
        cb(undefined, f);
    };

    transformFunc(f, options, function(err, transform) {
        if (err) {
            cb(err);
            return;
        }

        var geom = transform.geometry;

        async.parallel([
            function(cb) { options.featureBase(f, cb); },
            function(cb) { options.featureHeight(f, cb); },
            function(cb) { options.featureMaterial(f, cb); },
            function(cb) { options.featureName(f, cb); }
        ], function(err, data) {
            if (err) {
                cb(err);
                return;
            }

            var baseZ = data[0],
                topZ = baseZ + data[1],
                materialName = data[2],
                vertices = verticesFunc[geom.type](geom.coordinates).map(options.coordToPoint),
                surfaces = surfacesFunc[geom.type](geom.coordinates, vertices, nIndices),
                name = data[3];

            if (name) {
                stream.write('g ' + name + '\n');
            }

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

            cb(undefined, vertices.length * 2);
        });
    });
}

function featuresToObj(features, stream, cb, options) {
    var nIndices = 1;

    async.waterfall(features.map(function(f) {
        return function(cb) {
            featureToGeoJson(f, stream, nIndices, options, function(err, nVerts) {
                if (err) {
                    cb(err);
                    return;
                }

                nIndices += nVerts;
                cb(undefined);
            });
        };
    }), cb);
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
            coordToPoint: function(c) {
                return c;
            },
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
