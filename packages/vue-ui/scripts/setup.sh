#!/bin/bash

set -eou pipefail

cd playgrounds/nuxt
yarn install
yarn run postinstall
