GeoJSON to OBJ
==============

[![Greenkeeper badge](https://badges.greenkeeper.io/perliedman/geojson2obj.svg)](https://greenkeeper.io/)

A converter from [GeoJSON](http://geojson.org) to 
[Wavefront OBJ](https://en.wikipedia.org/wiki/Wavefront_.obj_file) format.

![hildedal-render](https://cloud.githubusercontent.com/assets/1246614/10125338/8c915d0e-6570-11e5-84da-4ac7ea0963a6.png)

## API

### toObj(geojson, stream, callback, options)

Converts the `geojson` to an OBJ, that is written to the `stream`.
When done, the callback is called; `callback` is a normal Node.js callback
accepting an error as the first argument.

Note that the `geojson` must be a `Feature` or `FeatureCollection`.

Available options:

* `featureBase`: function `f(feature, callback)` that returns the height of
  a feature's base; by default, a function that always returns 0.
* `featureHeight`: function `f(feature, callback)` that returns the height of
  a feature; by default, a function that returns 10 for polygons and
  0.3 for linestrings.
* `lineWidth`: for line geometries, returns the width of the generated
  geometry; defaults to 2.
* `featureName`: a function `f(feature, callback)` that returns the OBJ group
  name used for a feature; by default a function that numbers the
  features
* `featureMaterial`: a function `f(feature, callback)` that returns the name
  of the material for a feature; if undefined, the material is
  not changed for this feature; see `mtllib` option below
* `coordToPoint` a function `f(coordinate)` that returns the
  OBJ vertex point (X and Z) for a GeoJSON coordinate, needed to
  convert from GeoJSON's WGS84 coordinates to a cartesian coordinate;
  see the `findLocalProj` method below
* `mtllib` a string or array of paths that will be added as material
  libraries to the resulting OBJ
