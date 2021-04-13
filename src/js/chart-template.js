import { axisBottom, axisLeft } from "d3-axis";
import { scaleLinear, scaleTime, scaleThreshold } from "d3-scale";
import { select, selectAll } from "d3-selection";
import { area } from "d3-shape";
import { max, extent } from "d3-array";
import { timeParse } from "d3-time-format";

export default class makeChart {
  constructor(opts) {
    Object.assign(this, opts);

    this.data = this.data.filter(d=> d.date >= new Date(2020,2,1))

    this.startDate = this.data[this.data.length-8].date;

    this.beginningData = this.data.filter(d=> d.date < this.startDate);
    this.endData = this.data.filter(d=> d.date >= this.startDate)

    this.change = (this.data[this.data.length-1].avg - this.data[this.data.length-8].avg) / this.data[this.data.length-8].avg * 100;

    this.appendElements();
    this.update();
  }

  update() {
    this._setDimensions();
    this._setScales();
    this.render();
  }

  _setDimensions() {
    this.isMobile = window.innerWidth < 600 ? "mobile" : "desktop";

    // define width, height and margin
    this.margin = {
      top: 20,
      right: this.isMobile == "desktop" ? 43 : 43,
      bottom: 30,
      left: this.isMobile == "desktop" ? 46 : 46,
    };

    this.width = this.element.offsetWidth - this.margin.left - this.margin.right;
    this.height = this.element.offsetHeight - this.margin.top - this.margin.bottom;
  }

  _setScales() {
    this.xScale = scaleTime()
      .rangeRound([0, this.width])
      .domain(extent(this.data, d=> d.date))

    this.yScale = scaleLinear()
      .rangeRound([this.height, 0])
      .domain([0, max(this.data, d=> d.avg)]);

    this.areaGenerator = area()
      .x(d => this.xScale(d.date))
      .y0(this.yScale(0))
      .y1(d => this.yScale(d.avg));

    this.mapColors = scaleThreshold()
      .domain([-50,-10,10,50,100])
      .range(["#018571","#80cdc1","#dddedf","#dfc27d","#a6611a","#56290a"]);

    this.textColors = scaleThreshold()
      .domain([-50,-10,10,50,100])
      .range(["#018571","#018571","#737376","#a6611a","#a6611a","#56290a"]);
  }

  appendElements() {
    this.svg = select(this.element).append("svg");

    this.plot = this.svg.append("g").attr("class", "chart-g");

    this.xAxis = this.plot.append("g").classed("axis x-axis", true);
    this.yAxis = this.plot.append("g").classed("axis y-axis", true);

    this.introText = this.plot.append("text")
      .text("U.S. total, past week")
      .attr("class", "tertiary-label chart-label")

    this.beginningArea = this.plot.append("path")
      .datum(this.beginningData)
      .attr("class", "beginning-area");

    this.endArea = this.plot.append("path")
      .datum(this.endData)
      .attr("class", "end-area");

    this.dividingLine = this.plot.append("line")
      .attr("class", "dividing-line")

    this.changeText = this.plot.append("text")
      .text(this.change < 0 ? `${this.change.toFixed(1)}%` : `+${this.change.toFixed(1)}%`)
      .attr("class","change-text");

    this.changeLine = this.plot.append("line")
      .attr("class","change-line");
  }

  render() {
    this.svg.attr("width", this.width + this.margin.left + this.margin.right);
    this.svg.attr("height", this.height + this.margin.top + this.margin.bottom);

    this.plot.attr(
      "transform",
      `translate(${this.margin.left},${this.margin.top})`
    );

    this.xAxis
      .attr("transform", "translate(0," + (this.height + 25) + ")")
      .call(axisBottom(this.xScale).tickSize(-this.height - 25));

    this.xAxis
      .attr("transform", "translate(0," + (this.height) + ")")
      .call(axisBottom(this.xScale)
        .tickSize(10)
        .tickValues([new Date(2020,2,1), new Date(2020,4,1), new Date(2020,6,1), new Date(2020,8,1), new Date(2020,10,1), new Date(2021,0,1), new Date(2021,2,1)])
        .tickFormat((d,i)=> formatDate(d))
      );

    this.yAxis
      .attr("transform", "translate(" + -20 + ",0)")
      .call(axisLeft(this.yScale)
        .tickSize(-this.width - 20)
        .tickValues([0,100000,200000])
        .tickFormat(d=> d == 0 ? 0 : `${d/1000}k`)
      );

    this.introText
      .attr("x", this.mobile == "desktop" ? this.width + this.margin.left : this.xScale(this.data[this.data.length-1].date))
      .attr("y", -13)

    this.beginningArea
      .attr("d", this.areaGenerator)

    this.endArea
      .attr("d", this.areaGenerator)
      .attr("fill", this.mapColors(this.change))
      .attr("stroke", this.mapColors(this.change));

    this.dividingLine
      .attr("x1", this.xScale(this.data[this.data.length-8].date))
      .attr("x2", this.xScale(this.data[this.data.length-8].date))
      .attr("y2", this.yScale(this.data[this.data.length-8].avg))
      .attr("y1", this.height);

    this.changeText
      .attr("x", this.width + 4)
      .attr("y", this.yScale(this.data[this.data.length-1].avg) + 5)
      .attr("fill", this.textColors(this.change));

    this.changeLine
      .attr("x1", this.xScale(this.data[this.data.length-4].date))
      .attr("x2", this.xScale(this.data[this.data.length-4].date))
      .attr("y1", this.yScale(this.data[this.data.length-4].avg) - 3)
      .attr("y2", -10);

    select(".axis.x-axis .tick:nth-of-type(1)").append("text").text("`20").attr("dy", 33)
    select(".axis.x-axis .tick:nth-of-type(6)").append("text").text("`21").attr("dy", 33)
  }
}

function formatNumber(x) {
  return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function formatDate(dateString){
  const string = dateString.toString();
  const beforeGMT = string.split("GMT")[0];
  const split = beforeGMT.split(" ");
  const yyyy = split[3];
  const mm = split[1];
  const dd = split[2];

  // If, for example, you want an abbreviated month;
  const months = {"Jan":"Jan.", "Feb":"Feb.", "Mar":"March", "Apr":"April", "May":"May", "Jun":"June", "Jul":"July", "Aug":"Aug.", "Sep":"Sept.", "Oct":"Oct.", "Nov":"Nov.", "Dec":"Dec."};
  const monthAbbr = months[mm];

  return `${monthAbbr}`;
}