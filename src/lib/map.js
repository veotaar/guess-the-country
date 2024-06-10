import { createCanvas } from 'canvas';
import * as d3 from 'd3-geo';
import * as topojson from 'topojson-client';
import { readFileSync } from 'fs';

const topojsonData = JSON.parse(
  readFileSync('./src/data/countries-50m.json', 'utf8')
);
const world = topojson.feature(topojsonData, topojsonData.objects.countries);

const width = 1520;
const height = 1000;
const canvas = createCanvas(width, height);
const context = canvas.getContext('2d');

const projection = d3.geoMercator().fitSize([width, height], world);
const path = d3.geoPath(projection, context);

const drawMap = (countries) => {
  // background
  context.fillStyle = '#0f172a';
  context.fillRect(0, 0, width, height);
  context.fill();

  // countries
  context.fillStyle = '#475569';
  context.strokeStyle = '#020617';
  context.lineWidth = 0.5;

  world.features.forEach((feature) => {
    context.beginPath();
    path(feature);
    context.fill();
    context.stroke();
  });

  // highlighted countries
  context.fillStyle = '#be123c';
  world.features.forEach((feature) => {
    if (countries.includes(feature.id)) {
      context.beginPath();
      path(feature);
      context.fill();
      context.stroke();
    }
  });
};

export const highlightCountries = (countries) => {
  drawMap(countries);
  const buffer = canvas.toBuffer('image/png');
  return buffer;
};
