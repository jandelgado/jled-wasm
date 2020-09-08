// JLed WASM demo 
//
// Minimal Unit test
//
// https://github.com/jandelgado/jled
// https://github.com/jandelgado/jled-wasm
//
// (c) Copyright 2020 Jan Delgado
//
const  assert = require('assert')
const jled = require("../web/jled.js");
jled["onRuntimeInitialized"] = test;

function analogWrite() {
    const out = new jled.JsAnalogWrite();
    out.last = -1;
    out.write = function(val) {out.last = val;}
    out.Value = function() {return out.last;}
    return out;
}

function hal(writer) {
    return new jled.JsHal(writer);
}

function test() {
    testLedIsNotUpdatedBeforeDelayBeforePhase();
    testLedIsTurnedInstantlyWhenDelayIsZero();
}

function testLedIsNotUpdatedBeforeDelayBeforePhase() {
    const writer = analogWrite();
    const led = (new jled.JLed(hal(writer))).DelayBefore(1000).On();
    assert(led.Update());
    assert.equal(-1, writer.Value());
}

function testLedIsTurnedInstantlyWhenDelayIsZero() {
    const writer = analogWrite();
    const led = (new jled.JLed(hal(writer))).DelayBefore(0).On();
    assert(false == led.Update());
    assert.equal(255, writer.Value());
}

