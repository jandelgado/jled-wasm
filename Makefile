# makefile for JLed-WASM
# EMSDK environment variable must point to emscripten installation dir
#
.PHONY: clean tags server all run-example 

SRC:=src
OUT:=web

JLED_SRC:=./jled/src
JLED_IDL:=$(SRC)/jled.idl
CPPSRC:=$(SRC)/main.cpp 
WEBIDL_BINDER:=python3 $(EMSDK)/upstream/emscripten/tools/webidl_binder.py

# all: $(SRC)/jled_glue.js $(SRC)/jled_glue.cpp $(OUT)/jled.wasm $(OUT)/jled.js
all: $(OUT)/jled.wasm

$(OUT): 
	mkdir -p $(OUT)

$(SRC)/jled_glue.js: $(OUT) $(JLED_IDL)
	# generate glue code from webidl to src/
	$(WEBIDL_BINDER) $(JLED_IDL)  $(SRC)/jled_glue

$(SRC)/jled_glue.cpp: $(SRC)/jled_glue.js

$(OUT)/jled.js: $(SRC)/jled_glue.cpp $(CPPSRC)
	em++ --std=c++11 -Oz --bind -I$(SRC) -I$(JLED_SRC) \
	     -s WASM=1 -s ASSERTIONS=0 -Werror \
		 --post-js $(SRC)/jled_glue.js -o $(OUT)/jled.js \
		 $(CPPSRC) $(JLED_SRC)/jled_base.cpp

$(OUT)/jled.wasm: $(OUT)/jled.js


test: $(OUT)/jled.wasm
	cd src && node test.js

run-example: $(OUT)/jled.wasm
	cd src && node node-example.js

server:
	@echo point your webbrowser to http://localhost:8000
	cd web && python3 -m http.server

tags:
	ctags -R .

clean:
	rm -f $(SRC)/jled_glue.js $(SRC)/jled_glue.cpp $(OUT)/jled.wasm $(OUT)/jled.js

