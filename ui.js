// JLed WASM demo - JS UI 
//
// (c) copyright 2020 jan delgado
// see github.com/jandelgado/jled-wasm
//     github.com/jandelgado/jled
const JLedUI = (function () {

    var audio = true;

    // transform brightness = 0..255 to opacity 0.05 .. 0.95
    function brightness_to_opacity(brightness) {
        return (opacity = 0.1 + (brightness / 255) * 0.8);
    }

    function pad20(x) {
        return String(x).padStart(2, "0");
    }

    // change color and brightness of an LED SVG element
    function color_led(led, color, brightness) {
        const elem = document.getElementById(led);

        if (elem.brightness == brightness) {
            return;
        }
        elem.brightness = brightness;

        const svg = elem.getSVGDocument();
        const opacity = brightness_to_opacity(brightness);

        for (id of [
            "color_path14",
            "color_path20",
            "color_path22",
            "color_path32",
            "color_ellipse26"
        ]) {
            const obj = svg.getElementById(id);
            if (color) {
                obj.setAttribute("fill", color);
            }
            obj.setAttribute("opacity", opacity);
        }

        document.getElementById(led).nextElementSibling.innerText = brightness;
    }

    var oscillators = {};
    var context = !audio || new (window.AudioContext || window.webkitAudioContext)();

    function createLedWriter(id, nextWriter) {
        return function(val) {
            color_led(id, null, val);
            if (nextWriter) nextWriter(val);
        };
    }

    function isAudioEnabled(id) {
        return leds[id].audioEnabled == true
    }

    function onToggleAudio(id, button) {
        leds[id].audioEnabled = !isAudioEnabled(id);
        if (leds[id].audioEnabled) {
            button.classList.add("icon_btn_select");
        } else {
            button.classList.remove("icon_btn_select");
        }
    }

    var oscillators = {};
    var context = new (window.AudioContext || window.webkitAudioContext)();

    function createAudioWriter(id, nextWriter) {
        let osc = oscillators[id];
        if (!osc) {
            osc = context.createOscillator();
            osc.type = "square"; // also sine, sawtooth, triangle
            osc.frequency.value = 0; // Hz
            let gainNode = context.createGain();
            gainNode.gain.value = 1;        // TODO not working
            gainNode.connect(context.destination);
            osc.connect(gainNode);
            osc.start();
            oscillators[id] = osc;
        }

        return function(val) {
            if (leds[id].audioEnabled) {
                if (!leds[id].audioConnected) {
                    osc.connect(context.destination);
                    leds[id].audioConnected = true;
                }
                osc.frequency.value = val + 220;
                //  osc.stop(context.currentTime + 0.1);
            } else {
                osc.disconnect();
                leds[id].audioConnected = false;
            }
            if (nextWriter) nextWriter(val);
        };
    }

    function create_hal(id) {
        const audio_writer = audio ? createAudioWriter(id, null) : null;
        let wr = new JsAnalogWrite();
        wr.write = createLedWriter(id, audio_writer);
        return new JsHal(wr);
    }


    function defaultLedConfig() {
        const config = {
            effect: "blink",
            param0: 500,
            param1: 250,
            param2: 0,
            delayBefore: 0,
            delayAfter: 0,
            forever: true,
            repeat: 5,
            maxBrightness: 255,
            lowActive: false
        };
        return config
    }

    // [x] forever checkbox was clicked -> toggle "Repeat" text field since
    // only one of both can be selected
    function onForeverCheckboxClicked(elem) {
        document.getElementById("repeat").disabled = elem.checked;
    }

    // the current effect is changed in the effects form -> update the 
    // effects parameters
    function onEffectChanged(elem) {
        const param_map = {
            blink: [ {t:"Time on", v: 500}, {t:"Time off", v: 250}, null],
            candle: [{t:"Speed", v: 10}, {t:"Jitter", v:20}, {t:"Period", v:5000}],
            fadeon: [{t:"Period", v: 1500}, null, null],
            fadeoff: [{t:"Period", v: 1500}, null, null],
            breathe: [{t:"Period", v: 2000}, null, null],
            on: [null, null, null],
            off: [null, null, null],
            set: [{t:"Level", v:100}, null, null]
        };

        const params = param_map[elem.selectedOptions[0].value];

        let i = 0;
        for (const param of params) {
            if (!param) {
                document.getElementById(`param${i}`).style.display = "none";
                document.getElementById(`label_param${i}`).style.display = "none";
            } else {
                document.getElementById(`param${i}`).style.display = "inline-block";
                document.getElementById(`label_param${i}`).style.display = "inline-block";
                document.getElementById(`label_param${i}`).innerText = param.t;
                document.getElementById(`param${i}`).value = param.v;
            }
            i++;
        }
    }

	// show the form to change the LED 
    function onShowChangeLedForm(id, container) {
        console.log("change led ", id);
        const led = document.getElementById(ledContainerId(id));

        console.log("led = ", led);
        container.appendChild(createLedConfigForm(id, led.config));
    }

    function ledContainerId(id) {
        return `led_container_${id}`;
    }

    function createLedElement(id, name, color) {
        const container = document.createElement("div");
        container.id = ledContainerId(id);

        container.innerHTML = `
            <span>${name}</span>
            <button onclick="this.parentElement.parentElement.remove()" class="fas fa-trash-alt icon_btn" href="#"></button>
            <button onclick="JLedUI.onShowChangeLedForm('${id}', this.parentElement.parentElement)" class="far fa-edit icon_btn" href="#"></button>
            <button onclick="JLedUI.onToggleAudio('${id}', this)" class="fas fa-volume-up icon_btn" href="#"></button>
            <p/>
            <object id="${id}" type="image/svg+xml" data="led.svg" class="led" onload="JLedUI.color_led('${id}', '${color}', 0);">
            </object>
            <span class="brightness" style="background-color: ${color}">val</span>`;

        return container;
    }

     // parse a JLed configuration form and return a configuration object
    function parseLedForm(form) {
        const e = form.elements;
        const config = {
            id: e["led_id"].value,
            effect: e["effects"].value,
            param0: e["param0"].value,
            param1: e["param1"].value,
            param2: e["param2"].value,
            delayBefore: e["delay_before"].value,
            delayAfter: e["delay_after"].value,
            forever: e["forever"].checked,
            repeat: e["repeat"].value,
            maxBrightness: e["max_brightness"].value,
            lowActive: e["low_active"].checked
        };
        return config;
    }

    // create a new JLed object with the given configuration
    function createJLed(id, config) {
        const hal = create_hal(id);
        const led = new JLed(hal)
            .DelayBefore(config.delayBefore)
            .DelayAfter(config.delayAfter)
            .MaxBrightness(config.maxBrightness);

        switch (config.effect) {
            case "blink":
                led.Blink(config.param0, config.param1);
                break;
            case "breathe":
                led.Breathe(config.param0);
                break;
            case "fadeon":
                led.FadeOn(config.param0);
                break;
            case "fadeoff":
                led.FadeOff(config.param0);
                break;
            case "candle":
                led.Candle(config.param0, config.param1, config.param2);
                break;
            case "on":
                led.On();
                break;
            case "off":
                led.Off();
                break;
            case "set":
                led.Set(config.param0);
                break;
            default:
                console.error("invalid effect", config.effect);
                break;
        }

        if (config.lowActive) {
            led.LowActive();
        }
        if (config.forever) {
            led.Forever();
        } else {
            led.Repeat(config.repeat);
        }
        return led;
    }

    function updateTimerElement(duration) {
        const d = new Date(duration);
        const m = pad20(d.getMinutes());
        const s = pad20(d.getSeconds());
        const hs = pad20(Math.floor(d.getMilliseconds() / 10));
        const str = `${m}:${s}.${hs}`;
        const elTimer = document.getElementById("timer");
        elTimer.innerText = str;
    }

    var leds = {};
    var time_start;
    var animating = false;

    function startAnimation() {
        if (animating) return;
        animating = true;
        const elTimer = document.getElementById("timer");
        elTimer.classList.add("timer_running");
        animationStep();
    }

    function endAnimation() {
        animating = false;
        const elTimer = document.getElementById("timer");
        elTimer.classList.remove("timer_running");
    }

    function animationStep() {
        updateTimerElement(Date.now() - time_start);

        let updated = false;
        for (let led of Object.values(leds)) {
            updated |= led.Update();
        }
        if (updated) {
            requestAnimationFrame(animationStep);
        } else {
            console.log("animation loop ended");
            endAnimation();
        }
    }

    function onReset() {
        for (let led of Object.values(leds)) led.Reset();
        time_start = Date.now();
        startAnimation();
    }

    function onStop() {
        for (let led of Object.values(leds)) led.Stop();
        // suppress audio. TODO automatically
        for (let osc of Object.values(oscillators)) osc.frequency.value = 0;
    }

    function getLedContainer(id) {
        return document.getElementById(ledContainerId(id));
    }

    // [Start] pressed in the LED config form. Create the LED object.
    function onStartNewLed(form) {
        const config = parseLedForm(form);
        const jled = createJLed(config.id, config);
        const ledContainer = getLedContainer(config.id);
        ledContainer.config = config;
        leds[config.id] = jled;
        onReset();
    }

    function createLedConfigForm(id, config) {
        removeLedConfigForm();
        const form = `
        <form id="led_form" class="led_form">
            <div style="float: right;">
                LED Configuration
                <button onclick="JLedUI.removeLedConfigForm()" title="close" class="fa fa-window-close btn"></button>
            </div>
                <p/>
            <fieldset>
                <input id="led_id" type="hidden" value="${id}" />
                <legend>Effect</legend>
                <select id="effects" onchange="JLedUI.onEffectChanged(this, '${id}')">
                    <option value="blink" ${config.effect == "blink"?"selected":""}>Blink</option>
                    <option value="fadeon" ${config.effect == "fadeon"?"selected":""}>FadeOn</option>
                    <option value="fadeoff" ${config.effect == "fadeoff"?"selected":""}>FadeOff</option>
                    <option value="breathe" ${config.effect == "breathe"?"selected":""}>Breathe</option>
                    <option value="candle" ${config.effect == "candle"?"selected":""}>Candle</option>
                    <option value="on" ${config.effect == "on"?"selected":""}>On</option>
                    <option value="off" ${config.effect == "off"?"selected":""}>Off</option>
                    <option value="set" ${config.effect == "set"?"selected":""}>Constant</option>
                </select>
                <label for="effects">Effect</label>
                <div>
                    <div class="form_group">
                        <input id="param0" size="6" value="${config.param0}" type="text" />
                        <label id="label_param0" for="param2"></label>
                    </div>
                    <div class="form_group">
                        <input id="param1" size="6" value="${config.param1}" type="text" />
                        <label id="label_param1" for="param2"></label>
                    </div>
                    <div class="form_group">
                        <input id="param2" size="6" value="${config.param2}" type="text" />
                        <label id="label_param2" for="param2"></label>
                    </div>
                </div>
            </fieldset>

            <fieldset>
                <legend>Control</legend>
                <div>
                    <input id="delay_before" size="6" value="${config.delayBefore}" type="text" />
                    <label for="delay_before">Delay before</label>
                </div>
                <div>
                    <input id="delay_after" size="6" value="${config.delayAfter}" type="text" />
                    <label for="delay_after">Delay after</label>
                </div>
                <div>
                    <input id="forever" type="checkbox" onchange="JLedUI.onForeverCheckboxClicked(this)" ${config.forever ? "checked" : ""}/>
                    <label for="forever">Forever</label>
                </div>
                <div>
                    <input id="repeat" size="6" value="${config.repeat}" type="text" disabled />
                    <label for="repeat">Repeat</label>
                </div>
            </fieldset>

            <fieldset>
                <legend>Level</legend>
                <div>
                    <input id="max_brightness" size="6" value="${config.maxBrightness}" type="text" />
                    <label for="max_brightness">Max brightness</label>
                </div>

                <div>
                    <input id="low_active" type="checkbox" "${config.lowActive ? "checked" : ""}/>
                    <label for="low_active">Low active</label>
                </div>
            </fieldset>
            <input type="button" value="Start" onclick="JLedUI.onStartNewLed(this.parentElement); JLedUI.removeLedConfigForm();" />
        </form>
    `;

        const container = document.createElement("div");
        container.id = "led_form_container";
        container.classList.add("led_form_container");
        container.style.left = "0px";
        container.style.top = "0px";
        container.innerHTML = form;
        return container;
    }

    function removeLedConfigForm() {
        const led_form = document.getElementById("led_form_container");
        if (led_form) led_form.remove();
    }

    var ledcount = 1;
    function addNewLed() {
        const colors = ["orange", "red", "limegreen", "blue", "yellow", "purple"];
        const id = `led${ledcount}`;
        const name = `LED#${ledcount}`;
        const color = colors[ledcount % colors.length];

        const container = document.createElement("div");
        container.led_id = id;
        container.classList.add("led_container");

        const led = createLedElement(id, name, color);
        led.config = defaultLedConfig();

        container.appendChild(led);
        const root = document.getElementById("root");
        root.appendChild(container);

        // show new input form on top of led container
        container.appendChild(createLedConfigForm(id, led.config));
        onEffectChanged(document.getElementById(`effects`), id);

        ledcount++;
    }

    function init() {
        console.log("WASM runtime initialized", Module);

        const observer = new MutationObserver(function(ev) {
            console.log(ev);
            const removed = ev[0].removedNodes;
            if (removed) {
                for (let el of removed) {
                    if (el.led_id) {
                        delete leds[el.led_id];
                        delete oscillators[el.led_id];
                    }
                }
            }
        });

        observer.observe(document.getElementById("root"), { childList: true });

        // Add an initial LED
        addNewLed();
    }

    return {
        addNewLed: addNewLed,
        onStop: onStop,
        onReset: onReset,
        onStartNewLed: onStartNewLed,
        color_led : color_led,
        onShowChangeLedForm: onShowChangeLedForm,
        onToggleAudio: onToggleAudio,
        onForeverCheckboxClicked: onForeverCheckboxClicked,
        onEffectChanged: onEffectChanged,
        removeLedConfigForm: removeLedConfigForm,
        init: init
    }

})();

