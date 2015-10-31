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

module.exports = function featureToGeoJson(f, stream, nIndices, options, cb) {
    if (f.geometry.type === 'MultiPolygon') {
        async.reduce(f.geometry.coordinates, nIndices, function(nIndices, polygonCoords, cb) {
            var feature = extend({}, f, {
                geometry: {
                    type: 'Polygon',
                    coordinates: polygonCoords
                }
            });

            featureToGeoJson(feature, stream, nIndices, options, function(err, producedVertices) {
                if (err) {
                    cb(err);
                    return;
                }

                cb(undefined, nIndices + producedVertices);
            });
        }, function(err, totalVertices) {
            if (err) {
                cb(err);
                return;
            }

            cb(undefined, totalVertices - nIndices);
        });
        return;
    }

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
                vFunc = verticesFunc[geom.type],
                sFunc = surfacesFunc[geom.type],
                vertices,
                surfaces,
                name = data[3];

            if (!vFunc) {
                throw 'No verticesFunc for geometry type ' + geom.type;
            }
            if (!sFunc) {
                throw 'No surfacesFunc for geometry type ' + geom.type;
            }

            vertices = vFunc(geom.coordinates).map(options.coordToPoint);
            surfaces = sFunc(geom.coordinates, vertices, nIndices);

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
};
