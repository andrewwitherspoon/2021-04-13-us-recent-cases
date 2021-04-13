import { scaleLinear, scalePow, scaleThreshold } from "d3-scale";
import { select, selectAll } from "d3-selection";
import { geoPath, geoAlbersUsa } from "d3-geo";
import { extent } from "d3-array";

let stateDict = require("../data/fullNameStateDict.json");
let abbvStateDict = require("../data/statesDict.json");
let positionDict = require("../data/statePosition.json");
let topojson = require("topojson-client");
import Tooltip from './tooltipFactory.js';

export default class makeMap {
  constructor(opts) {
    Object.assign(this, opts);
    this.aspectHeight = .65;

    this.PRDCdata.sort(function(a, b){
      if(b.state < a.state) { return -1; }
      if(b.state > a.state) { return 1; }
      return 0;
    })
    this.appendElements();
    this.update();

    this.theTooltip = new Tooltip({
      'parent' : '.chart-container',
      'formats': {
        'none' : d => d,
        'state' : d => abbvStateDict[d][0],
        'date': d=> {
          return formatDate(d)
        },
        'number' : d => {
          if (d == 0) {
            return 0
          } else if ( d>=1 ) {
            return formatNumber(d)
          } else {
            return "-"
          }
        },
        'rate' : d => {
          return formatNumber(d.toFixed(1))
        },
        'percent' : d=> {
          if (d == 0 || d == NaN) {
            return "No change"
          } else if (d == Infinity) {
            return "First cases"
          } else if (d > 0) {
            return "+" + d.toFixed(1) + "%"
          } else {
            return d.toFixed(1) + "%"
          }
        }
      }
    })
  }

  update() {
    this._setDimensions();
    this._setScales();
    this.render();
  }

  _setDimensions() {
    this.size = window.innerWidth <= 420 ? "mobile" : window.innerWidth > 421 && window.innerWidth <= 599 ? "tablet" : "desktop"; // Chris made this, handles map alignment in ways I don't want to mess with
    this.isMobile = window.innerWidth < 600 ? "mobile" : "desktop"; // Needed different breakpoints for state label positioning

    // define width, height and margin
    this.margin = {
      top: this.size === "tablet" ? 50 : 0,
      right: 0,
      bottom: 0,
      left: 0,
    };

    this.width = this.element.offsetWidth - this.margin.left - this.margin.right;
    this.height = this.element.offsetWidth * this.aspectHeight - this.margin.top - this.margin.bottom;
  }

  _setScales() {
    this.projection = geoAlbersUsa()
      .scale(1)
      .translate([0, 0]);

    this.path = geoPath()
      .projection(this.projection);

    // Stuff chris wrote to center map
    let states = topojson.feature(this.usTopo, this.usTopo.objects.states);
    let b = this.path.bounds(states);

    let bBottom = {
      desktop: 0.23019625629687068,
      tablet: .32,
      mobile: .23
    }

    b[1][1] = bBottom[this.size];

    let sMultiply = {
      desktop: 1.05,
      tablet: 1.2,
      mobile: 1.05
    }

    let s = sMultiply[this.size] / Math.max((b[1][0] - b[0][0]) / this.width, (b[1][1] - b[0][1]) / this.height);
    let t = [(this.width - s * (b[1][0] + b[0][0])) / 2, (this.height - s * (b[1][1] + b[0][1])) / 2];

    let tOffset = {
      desktop: 40,
      tablet: 30,
      mobile: 40
    }

    t[0] = t[0] - (s / tOffset[this.size]); //Cheat the map to the left

    this.projection.scale(s).translate(t);

    this.mapColors = scaleThreshold()
      .domain([-50,-10,10,50,100])
      .range(["#018571","#80cdc1","#e6e7e8","#dfc27d","#a6611a","#56290a"])
  }

  appendElements() {
    this.svg = select(this.element).append("svg");

    this.interactionRect = this.svg.append("rect")
      .attr("class", "interaction-rect")
      .style("fill", "white")
      .style("fill-opacity", 0);

    this.plot = this.svg.append("g").attr("class", "chart-g");

    this.states = this.plot.append("g")
      .attr("class", "state-g")
      .selectAll(".state")
      .data(topojson.feature(this.stateTopo, this.stateTopo.objects.states).features)
      .enter().append("path")
      .filter(d=> d.properties.st != "AS" && d.properties.st != "GU" && d.properties.st != "VI" && d.properties.st != "MP" && d.properties.st != "PR")
      .attr("class", d=> d.properties.st + " state");

    this.stateBorders = this.plot.append("path")
      .attr("class", "state-borders")

    // Tiles for PR and DC
    this.mapTiles = this.plot.selectAll(".state.tiles")
      .data(this.PRDCdata)
      .enter()
      .append("rect")
      .attr("class", d=> d.state + " state tiles");

    this.mapTileLabelGroup = this.plot.selectAll("g.state-label-group.tiles")
      .data(this.PRDCdata)
      .enter()
      .append("g")
      .attr("class", d => d.state+ " state-label-group tiles")

    this.mapTileLabelName = this.mapTileLabelGroup.append("text")
      .text(d => d.state)
      .attr('class', "state-annotation");

    this.stateLabelContainer = this.plot.append("g")
      .attr("class", "state-label-countainer")

    this.stateLabelGroup = this.stateLabelContainer.selectAll("g.state-label-group")
      .data(topojson.feature(this.stateTopo, this.stateTopo.objects.states).features)
      .enter()
      .filter(d=> d.properties.st != "AS" && d.properties.st != "GU" && d.properties.st != "VI" && d.properties.st != "MP" && d.properties.st != "PR")
      .append("g")
      .attr("class", d => d.properties.st + " state-label-group")

    this.stateLabelName = this.stateLabelGroup.append("text")
      .text(d => d.properties.st)
      .attr('class', "state-annotation");

    this.defs = this.plot.append("defs");

    this.pattern = this.defs.append("pattern")
      .attr("id", "stripes")
      .attr("patternUnits", "userSpaceOnUse")
      .attr("height", 4)
      .attr("width", 4)
      .attr("patternTransform", "rotate(-45 2 2)");

    this.patternRect = this.pattern.append("rect")
      .attr("x", 0)
      .attr("y", 0)
      .attr("height", 4)
      .attr("width", 4)
      .attr("fill", "#f5f5f5")
      .attr("stroke", "none")

    this.patternLines = this.pattern.append("path")
      .attr("d", "M -1,2 l 6,0")
      .attr("stroke", "#c9c9c9")
      .attr("stroke-width", 1);
  }

  render() {
    this.svg.attr("width", this.width + this.margin.left + this.margin.right);
    this.svg.attr("height", this.height + this.margin.top + this.margin.bottom);

    this.plot.attr(
      "transform",
      `translate(${this.margin.left},${this.margin.top})`
    );
    /////////////////////////////////////////////////////////////
    // States on map, and what happens on hover/tap
    /////////////////////////////////////////////////////////////
    this.states
      .attr("d", this.path)
      .attr("fill", d => {
        return d.properties.currAvg <= 15 ? "url(#stripes)" : this.mapColors(d.properties.change);
      })

      .on('mouseover', (d,i,e) =>{
        let stateClass = d.properties.st;
        select(`.state.${stateClass}`).classed('is-active',true).raise();
        select(".chart-container").classed('tooltip-active',true);

        let bbox = document.querySelector(`.state.${stateClass}`).getBoundingClientRect();

        let coords = [
          bbox.x + bbox.width - bbox.width/2,
          bbox.y + bbox.height - bbox.height/2
        ];

        let w = this.width + this.margin.left + this.margin.right;
        let h = this.height + this.margin.top + this.margin.bottom;
        this.theTooltip.position(d.properties,coords,[w,h])

        let thresholdSelection = select(".tt-update.number.value.currAvg");
        let thresholdValue = parseFloat(thresholdSelection._groups[0][0].innerHTML.split(",").join(""));
        let rateSelection = select(".tt-update.number.value.color-change");
        let rateValue = parseInt(rateSelection._groups[0][0].innerHTML.split(",").join(""));
        let stateSelection = select(".state.is-active");
        let stateColor = stateSelection._groups[0][0].attributes[2].value;
        rateSelection
          .style("background-color", stateColor == "url(#stripes)" ? "#e6e7e8" : stateColor)
          .style("color", (d,i,e)=> {
            if (thresholdValue <= 15) {
              return "#333335"
            } else if (Math.abs(rateValue) >= 50) {
              return "rgba(255,255,255,0.9)"
            } else {
              return "#333335"
            }
          });

        let ttNumberText = document.querySelectorAll(".tt-update.number"); // To handle blank entries in tooltips
        ttNumberText.forEach((d,i)=> {
          if (d.innerHTML == "") {
            return d.innerHTML = "0"
          }
        })
      })
      .on('mouseleave', (d,i,e) =>{
        selectAll(".state").classed("is-active", false);
        select(".chart-container").classed('tooltip-active',false);
        selectAll(".tt-row").style("display", "block");
        select(".tt-header p").style("display", "block");
        select(".no-data-note").remove();
        this.theTooltip.deposition()
      })

    this.stateBorders
      .attr("d", this.path(topojson.mesh(this.usTopo, this.usTopo.objects.states, function (a, b) {
        return a !== b;
      })));

    this.stateLabelGroup
      .attr("transform", d => {
        return "translate(" + this.path.centroid(d)[0] + "," + this.path.centroid(d)[1] + ")";
      })

    this.stateLabelName
      .attr("x", d=> positionDict[d.properties.st][0])
      .attr("y", d=> positionDict[d.properties.st][1])
      .style("fill", d=> {
        if (Math.abs(d.properties.change) > 50 && d.properties.currAvg >= 15) {
          return "rgba(255,255,255,0.9)"
        } else {
          return "#333335"
        }
      })
      .style("stroke", d=> {
        if (Math.abs(d.properties.change) > 50 && d.properties.currAvg >= 15) {
          return "none"
        } else {
          return "rgba(255,255,255,0.6)"
        }
      })

    /////////////////////////////////////////////////////////////
    // Tiles for DC/PR, and what happens on hover/tap
    /////////////////////////////////////////////////////////////
    let tileSize = this.size === "desktop" ? 27 : 24;
    this.mapTiles
      .attr("height", tileSize)
      .attr("width", tileSize)
      .attr("x", this.width - tileSize - 5)
      .attr("y", (d,i) => this.height - 10 - ((i+1) * (tileSize+1)))
      .attr("fill", d => !d.change ? "#EFEFEF" : this.mapColors(d.change))
      .on('mouseover', (d,i,e) =>{
        let stateClass = d.state;
        select(`.state.tiles.${stateClass}`).classed('is-active',true).raise();
        this.mapTileLabelGroup.raise();
        select(".chart-container").classed('tooltip-active',true);

        let bbox = document.querySelector(`.state.tiles.${stateClass}`).getBoundingClientRect();

        let coords = [
          bbox.x + bbox.width - bbox.width/1.5,
          bbox.y + bbox.height - bbox.height/2
        ];
        let w = this.width + this.margin.left + this.margin.right;
        let h = this.height + this.margin.top + this.margin.bottom;
        this.theTooltip.position(d,coords,[w,h])

        let thresholdSelection = select(".tt-update.number.value.currAvg");
        let thresholdValue = parseFloat(thresholdSelection._groups[0][0].innerHTML.split(",").join(""));
        let rateSelection = select(".tt-update.number.value.color-change");
        let rateValue = parseInt(rateSelection._groups[0][0].innerHTML.split(",").join(""));
        let stateSelection = select(".state.is-active");
        let stateColor = stateSelection._groups[0][0].attributes[5].nodeValue;
        rateSelection
          .style("background-color", stateColor == "url(#stripes)" ? "#e6e7e8" : stateColor)
          .style("color", d=> {
            if (thresholdValue <= 15) {
              return "#333335"
            } else if (Math.abs(rateValue) >= 50) {
              return "rgba(255,255,255,0.9)"
            } else {
              return "#333335"
            }
          });

        let ttNumberText = document.querySelectorAll(".tt-update.number"); // To handle blank entries in tooltips
        ttNumberText.forEach((d,i)=> {
          if (d.innerHTML == "") {
            return d.innerHTML = "-"
          }
        })
      })
      .on('mouseleave', (d,i,e) =>{
        selectAll(".state.tiles").classed("is-active", false);
        select(".chart-container").classed('tooltip-active',false);
        this.theTooltip.deposition()
      })

    this.mapTileLabelGroup
      .attr("transform", (d,i) => {
        return "translate(" + (this.width - tileSize - 5 + tileSize/2) + "," +  (this.height - 6 - ((i+1) * (tileSize+1)) + tileSize/2) + ")";
      });

    this.mapTileLabelName
      .style("fill", d=> {
        if (Math.abs(d.change) > 50 && d.currAvg >= 15) {
          return "rgba(255,255,255,0.9)"
        } else {
          return "#333335"
        }
      })
      .style("stroke", d=> {
        if (Math.abs(d.change) > 50 && d.currAvg >= 15) {
          return "none"
        } else {
          return "rgba(255,255,255,0.6)"
        }
      })

    this.interactionRect
      .attr("x", 0)
      .attr("y", 0)
      .attr("width", this.width + this.margin.left + this.margin.right)
      .attr("height", this.height + this.margin.top + this.margin.bottom)
      .on("click", (d,i,e) => {
        selectAll(".state.tiles").classed("is-active", false);
        selectAll(".state").classed("is-active", false);
        this.theTooltip.deposition()
      });

    this.xOut = select(".tooltip-close")
      .on("click", (d,i,e) => {
        selectAll(".state.tiles").classed("is-active", false);
        selectAll(".state").classed("is-active", false);
        this.theTooltip.deposition()
      });

    let interactionText = this.isMobile === "mobile" ? "Tap" : "Hover";
    select(".interaction-instructions span").text(interactionText)

    if (this.isMobile === "mobile") {
      select(".headline").html("Change in new COVID-19</br>cases in the past week");
    } else {
      select(".headline").html("Change in new COVID-19 cases in the past week");
    }

    if (this.isMobile === "mobile") {
      select(".headline-units").html(`Percent change of the 7-day average</br>of new cases on ${formatDate(this.PRDCdata[0].prevDate)} and ${formatDate(this.PRDCdata[0].currDate)}, 2021`);
    } else {
      select(".headline-units").html(`Percent change of the 7-day average of new cases on ${formatDate(this.PRDCdata[0].prevDate)} and ${formatDate(this.PRDCdata[0].currDate)}, 2021`);
    }

    select(".first-date").text(formatDate(this.PRDCdata[0].prevDate));
    select(".last-date").text(formatDate(this.PRDCdata[0].currDate));

  }
}

function slugify(text) {
  return text.toString().toLowerCase()
    .replace(/\s+/g, '-')           // Replace spaces with -
    .replace(/[^\w\-]+/g, '')       // Remove all non-word chars
    .replace(/\-\-+/g, '-')         // Replace multiple - with single -
    .replace(/^-+/, '')             // Trim - from start of text
    .replace(/-+$/, '');            // Trim - from end of text
}

function formatNumber(x) {
  return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
};

function formatDate(dateString){
  const split = dateString.split("/");
  const mm = split[0];
  const dd = split[1];
  const yy = split[2];

  const months = {"1":"Jan.", "2":"Feb.", "3":"March", "4":"April", "5":"May", "6":"June", "7":"July", "8":"Aug.", "9":"Sept.", "10":"Oct.", "11":"Nov.", "12":"Dec."};
  const monthAbbr = months[mm];

  return monthAbbr + " " + dd;
  return dateString
};