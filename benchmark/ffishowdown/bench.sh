#!/usr/bin/env bash

iterations=1000000

node bench napi $iterations
node bench addon $iterations
node bench sbffi $iterations
node bench ffi-napi $iterations
