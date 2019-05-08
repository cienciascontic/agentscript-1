#!/usr/bin/env node

const process = require('process')
const gis = require('./gis.umd.js')

let data = ''
let chunk
process.stdin.on('readable', () => {
    while ((chunk = process.stdin.read()) !== null) {
        data += chunk
    }
})

process.stdin.on('end', () => {
    process.stdout.write(processData(data))
})

function processData(data) {
    const json = JSON.parse(data)
    gis.streetsFilter(json)
    return gis.minify(json)
}
