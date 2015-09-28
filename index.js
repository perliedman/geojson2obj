var extend = require('extend'),
    earcut = require('earcut'),
    buffer = require('turf-buffer'),
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
        'LineString': function(f, options) {
            return buffer(f, options.lineWidth(f) / 2, 'meters');
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
        var transform = transforms[f.geometry.type],
            geom = transform ? transform(f, options).geometry : f.geometry;
        if (transform) console.log(geom);

        var baseZ = options.featureBase(f),
            topZ = baseZ + options.featureHeight(f),
            materialName = options.featureMaterial(f),
            vertices = verticesFunc[geom.type](geom.coordinates).map(options.coordToPoint),
            surfaces = surfacesFunc[geom.type](geom.coordinates, vertices, nIndices);

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
            lineWidth: function() {
                return 2;
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
    }
};
