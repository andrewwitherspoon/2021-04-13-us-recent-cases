import setup from "./setup";
setup();

import pym from "pym.js";
import makeMap from "./map-template";
import makeChart from "./chart-template";

const d3 = Object.assign({},
  require("d3-time-format")
);
let topojson = require("topojson-client");

let usTopo = require("../data/states.topo.simple.json");
let stateTopo = require("../data/stateTopo.json");
let usData = require("../data/usData.json");
let stateData = require("../data/stateData.json");

// data revisions
stateTopo.objects.states.geometries.forEach(d=> {
  if (d.properties.st == "AL") {
    d.properties.prevAvg = 304.8571429;
    d.properties.currAvg = 326.1666667;
    d.properties.change = 7.0;
  }
  if (d.properties.st == "OK") {
    d.properties.prevAvg = 349.3333333;
    d.properties.currAvg = 329.3333333;
    d.properties.change = -5.7;
  }
})

let parseTime = d3.timeParse("%y-%m-%d")

usData.forEach((d,i)=> {
  let string = d.date.split("/");
  const mm = string[0];
  const dd = string[1];
  const yy = string[2];
  d.date = parseTime(yy+"-"+mm+"-"+dd)
})

export default function main() {

  let isMobile = window.innerWidth <= 599 ? true : false;

  const theMap = new makeMap({
    element: document.querySelector(".map"),
    usTopo,
    stateTopo,
    PRDCdata: stateData.filter(d=> d.state == "DC" || d.state == "PR")
  });

  const theChart = new makeChart({
    element: document.querySelector(".chart"),
    data: usData
  });

  window.addEventListener("optimizedResize", () => {
    theMap.update();
    theChart.update();
  });

  new pym.Child({
    polling: 500,
  });
}

window.onload = main;

