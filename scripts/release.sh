#!/bin/bash

set -e

yarn run init
yarn run docs:build
yarn run docs:generate-manual
