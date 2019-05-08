#!/usr/bin/env node

const gis = require('./gis.umd.js')
const https = require('https')

const zxy = process.argv[2]

const [, z, x, y] = zxy.match(/(\d+)\/(\d+)\/(\d+)/)

// convert to numbers!
const [topleft, bottomright] = gis.xy2bbox(+x, +y, +z)
const [west, north] = topleft
const [east, south] = bottomright

const url = gis.getOsmURL(south, west, north, east)

https.get(url, res => {
    res.setEncoding('utf8')
    res.on('data', data => {
        process.stdout.write(data)
    })
    res.on('end', () => {})
})

/*
node ./zxy2osm.js 10/210/403 > santafe10.osm
osmtogeojson -f json santafe10.osm > santafe10.json

node ./zxy2osm.js 12/842/1613 > santafe12.osm
osmtogeojson -f json santafe12.osm > santafe12.json

node ./zxy2osm.js 14/3370/6451 > santafe14.osm
osmtogeojson -f json santafe14.osm > santafe14.json

*/
