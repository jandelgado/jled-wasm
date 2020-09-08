// JLed WASM demo - run JLed Arduino library in the browser.
//
// Code to glue together Javascript and C++ world to be able to use a
// JLed HAL implementation and a User defined Brightness Evaluator that
// is implemented in Javascript.
//
// https://github.com/jandelgado/jled
// https://github.com/jandelgado/jled-wasm
//
// (c) Copyright 2020 Jan Delgado
//
#include <sys/time.h>  // time_t
#include <cstddef>     // size_t
#include <cstdint>     // uint?_t

#include <emscripten/bind.h>
using namespace emscripten;

using std::size_t;

#include <jled_base.h>

namespace jled {

// Instances of this class receive calls to analogWrite() from JLed. This
// class is to be subclassed in JavaScript code.
class JsAbstractAnalogWrite {
 public:
    virtual void write(uint8_t val) {}
};

// this class is the HAL for JLed running in the browser/to JS. Calls to analogWrite
// are delegated to the provied AbstractJsAnalogWrite derived instance
class JsHal {
 public:
    using PinType = uint8_t;

 private:
    JsAbstractAnalogWrite* writer_ = nullptr;

 public:
    JsHal() {}
    JsHal(PinType _) {}
    JsHal(JsAbstractAnalogWrite* writer) : writer_(writer) {}

    virtual void analogWrite(uint8_t val) {
        if (writer_) {
            writer_->write(val);
        }
    }

    uint32_t millis() const {
        timeval time;
        gettimeofday(&time, NULL);
        return (uint32_t)((time.tv_sec * 1000) + (time.tv_usec / 1000));
    }
};

class JLed : public TJLed<JsHal, JLed> {
    using TJLed<JsHal, JLed>::TJLed;
};

// This class is to be subclassed in Javascript to implement a custom
// Javascript brightness evaluator.
//
// See
// https://emscripten.org/docs/porting/connecting_cpp_and_javascript/WebIDL-Binder.html#sub-classing-c-base-classes-in-javascript-jsimplementation
//
class AbstractBrightnessEvaluator : public BrightnessEvaluator {
    using BrightnessEvaluator::BrightnessEvaluator;

 public:
    virtual ~AbstractBrightnessEvaluator() {}
};

}  // namespace jled

#include "jled_glue.cpp"
