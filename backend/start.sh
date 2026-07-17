#!/bin/bash
export $(grep -v "^#" .env.local | xargs)
./mvnw mn:run
