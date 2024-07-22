#!/bin/bash

wget https://bellard.org/quickjs/quickjs-2024-01-13.tar.xz
tar -xf quickjs-2024-01-13.tar.xz
rm quickjs-2024-01-13.tar.xz

git clone https://github.com/emscripten-core/emsdk.git
cd emsdk
./emsdk install latest
./emsdk activate latest
cd ..
npm i -g wasm-opt
(cd wasmlib && source ../emsdk/emsdk_env.sh && ./build.sh)                    
cd web
yarn install
yarn playwright install
sudo yarn playwright install-deps
yarn createdevaccount
cd ..

wget https://github.com/WebAssembly/wabt/releases/download/1.0.35/wabt-1.0.35.tar.xz
tar -xvf wabt-1.0.35.tar.xz
cd wabt-1.0.35
mkdir build
cd build
cmake ..
sudo cmake --build . --target install

wget https://github.com/WebAssembly/binaryen/releases/download/version_118/binaryen-version_118-x86_64-linux.tar.gz
tar -xvzf binaryen-version_118-x86_64-linux.tar.gz 
sudo cp -r binaryen-version_118/* /usr/
rm -Rf binaryen-version_118*
