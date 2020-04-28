all: hello-napi/build hello-ffi-napi/node_modules hello-sbffi/build hello-addon/build

hello-napi/build:
	cd hello-napi && npm install

hello-ffi-napi/node_modules:
	cd hello-ffi-napi && npm install

hello-sbffi/build:
	cd hello-sbffi && npm install

hello-addon/build:
	cd hello-addon && npm install

test: all
	./bench.sh

clean:
	rm -rf hello-napi/build hello-ffi-napi/node_modules hello-sbffi/build hello-addon/build
