#!/bin/sh

echo "BUILDING"
grunt full
echo "UPLOADING"
scp -r .build/* soney@from.so:euc.from.so/
