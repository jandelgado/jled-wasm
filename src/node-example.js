// JLed WASM console demo - run JLed Arduino library in Javascript.
//
// Creates some JLed objects and "runs" them. The acutal output is done
// on the console.
//
// https://github.com/jandelgado/jled
// https://github.com/jandelgado/jled-wasm
//
// (c) Copyright 2020 Jan Delgado
//
const jled = require("../web/jled.js");
jled["onRuntimeInitialized"] = demo;

// call Update method of led as long as it is active (i.e. 
// Update() returns true).
function runLed(led, title, interval = 50) {
    return new Promise(function(fulfill, reject) {
        console.log(`led ${title} running ...`);
        const start = led.Hal().millis();
        const id = setInterval(function() {
            const updated = led.Update();
            if (!updated) {
                clearInterval(id);
                fulfill(0);
            }
        }, interval);
    });
}

// returns a custom JLed HAL redirecting analogWrite to the console
function createConsoleHal(name, zero_time) {
    const out = new jled.JsAnalogWrite();
    out.write = function(val) {
        const ts = Math.floor(Date.now()) - zero_time;
        console.log(`${ts}ms: value of ${name} is ${val}`);
    };
    return new jled.JsHal(out);
}

// returns a brightness evaluator implemented in Javascript which is called by
// the JLed core.
function createUserBrightnessEvaluator() {
    let ube = new jled.BrightnessEvaluator();
    ube.Eval = function(t) {
        return 255 * (Math.floor(t / 250) % 2);
    };
    ube.Period = function() {
        return 2000;
    };
    return ube;
}

function demo() {
    const zero_time = Date.now();
    const led0 = new jled.JLed(createConsoleHal("led0", zero_time))
        .DelayBefore(1000)
        .Breathe(1000)
        .Repeat(1);
    const led1 = new jled.JLed(createConsoleHal("led1", zero_time))
        .DelayBefore(100)
        .UserFunc(createUserBrightnessEvaluator())
        .Repeat(1);
    const led2 = new jled.JLed(createConsoleHal("led2", zero_time))
         .DelayBefore(500)
         .Blink(50, 50)
         .Repeat(2);

    leds = [led0, led1, led2]

    runLed(leds[0], "LED0 (breathe)");
    runLed(leds[1], "LED1 (user func)");
    runLed(leds[2], "LED2 (blink)",1);
}

