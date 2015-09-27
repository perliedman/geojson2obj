GeoJSON to OBJ
==============

A converter from [GeoJSON](http://geojson.org) to 
[Wavefront OBJ](https://en.wikipedia.org/wiki/Wavefront_.obj_file) format.

![hildedal-render](https://cloud.githubusercontent.com/assets/1246614/10125338/8c915d0e-6570-11e5-84da-4ac7ea0963a6.png)

## API

### toObj(geojson, stream, options)

Converts the `geojson` to an OBJ, that is written to the `stream`.

Note that the `geojson` must be a `Feature` or `FeatureCollection`.

Available options:

* `featureBase`: function `f(feature)` that returns the height of
  a feature's base; by default, a function that always returns 0.
* `featureHeight`: function `f(feature)` that returns the height of
  a feature; by default, a function that always returns 10.
* `featureName`: a function `f(feature)` that returns the OBJ group
  name used for a feature; by default a function that numbers the
  features
* `coordToPoint` a function `f(coordinate)` that returns the
  OBJ vertex point (X and Z) for a GeoJSON coordinate, needed to
  convert from GeoJSON's WGS84 coordinates to a cartesian coordinate;
  see the `findLocalProj` method below

### findLocalProj(geojson)

A helper function that, given a GeoJSON object, returns a function
that can be used for as `coordToPoint`.

A suitable transversal mercator projection will be calculated, which
will convert WGS84 coordinates to meter units.

Note that this projection will only work reasonably close to the
GeoJSON's center coordinate.
