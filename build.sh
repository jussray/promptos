#!/bin/bash
# Stitch all parts into index.html
cat parts/part1.html parts/part2.html parts/part3.html parts/part4.html parts/part5.html parts/part6.html parts/part7.html > index.html
echo "Built index.html successfully"
