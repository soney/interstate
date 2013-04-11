#!/bin/sh

echo "BUILDING"
grunt
echo "UPLOADING"
scp -r build/* soney@from.so:euc.from.so
