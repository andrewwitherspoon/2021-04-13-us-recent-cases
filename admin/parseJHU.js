const io = require('indian-ocean');
const d3 = require('d3');

let stateData = [];
let usData = [];
let toCheckData = [];

let twoLetterDict = require("../src/data/statesDict.json");
let stateDict = require("../src/data/fullNameStateDict.json");
let stateTopo = require("./states.topo.json"); // state topojson
let statePop = require("./statePopulation.json"); // From 2019 ACS

let url = "https://raw.githubusercontent.com/CSSEGISandData/COVID-19/master/csse_covid_19_data/csse_covid_19_time_series/time_series_covid19_confirmed_US.csv"; // JHU time series

const makeRequest = async () => { // Load data
  try {
    // this parse may fail
    const data = await d3.csv(url);
    return data;
  } catch (err) {
    console.log(err)
    throw Error("Failed to load data")
  }
};

async function main(data) { // Parse data after its loaded
  let states = [...new Set(data.map(d=> d.Province_State))]; // Get unique array of states
  let dates = Object.keys(data[0]).slice(12); // Array of dates

  data.forEach((d,i)=> { // Make array of new cases from cumulative county case totals
    let cases = Object.values(d).slice(12);
    d.newCases = [];
    cases.forEach((day,index)=> {
      let count = index > 0 ? parseInt(day) - parseInt(cases[index-1]) : parseInt(day);
      let obj = {
        date: dates[index],
        newCases: count
      }
      d.newCases.push(obj)
    })
  });

  casesByState = states.map(state => {
    return {
      key: state,
      values: data.filter(f => f.Province_State === state)
    }
  });

  casesByState.forEach(state => { // Make state data
    let currDate = dates[dates.length-1];
    let prevDate = dates[dates.length-8];

    let currAvg = (
      d3.sum(state.values, d=> d.newCases[d.newCases.length-1].newCases) + d3.sum(state.values, d=> d.newCases[d.newCases.length-2].newCases) +
      d3.sum(state.values, d=> d.newCases[d.newCases.length-3].newCases) + d3.sum(state.values, d=> d.newCases[d.newCases.length-4].newCases) +
      d3.sum(state.values, d=> d.newCases[d.newCases.length-5].newCases) + d3.sum(state.values, d=> d.newCases[d.newCases.length-6].newCases) +
      d3.sum(state.values, d=> d.newCases[d.newCases.length-7].newCases)
      )/7;

    let prevAvg = (
      d3.sum(state.values, d=> d.newCases[d.newCases.length-8].newCases) + d3.sum(state.values, d=> d.newCases[d.newCases.length-9].newCases) +
      d3.sum(state.values, d=> d.newCases[d.newCases.length-10].newCases) + d3.sum(state.values, d=> d.newCases[d.newCases.length-11].newCases) +
      d3.sum(state.values, d=> d.newCases[d.newCases.length-12].newCases) + d3.sum(state.values, d=> d.newCases[d.newCases.length-13].newCases) +
      d3.sum(state.values, d=> d.newCases[d.newCases.length-14].newCases)
      )/7;

    let obj = {
      state: stateDict[state.key][0],
      currDate: currDate,
      prevDate: prevDate,
      currAvg: currAvg,
      prevAvg: prevAvg,
      change: (currAvg - prevAvg) / prevAvg * 100
    }

    // Making an object to be used to check the data manually in a csv
    let objToCheck = {
      state: stateDict[state.key][0]
    };
    objToCheck[currDate = dates[dates.length-14]] = d3.sum(state.values, d=> d.newCases[d.newCases.length-14].newCases);
    objToCheck[currDate = dates[dates.length-13]] = d3.sum(state.values, d=> d.newCases[d.newCases.length-13].newCases);
    objToCheck[currDate = dates[dates.length-12]] = d3.sum(state.values, d=> d.newCases[d.newCases.length-12].newCases);
    objToCheck[currDate = dates[dates.length-11]] = d3.sum(state.values, d=> d.newCases[d.newCases.length-11].newCases);
    objToCheck[currDate = dates[dates.length-10]] = d3.sum(state.values, d=> d.newCases[d.newCases.length-10].newCases);
    objToCheck[currDate = dates[dates.length-9]] = d3.sum(state.values, d=> d.newCases[d.newCases.length-9].newCases);
    objToCheck[currDate = dates[dates.length-8]] = d3.sum(state.values, d=> d.newCases[d.newCases.length-8].newCases);
    objToCheck[currDate = dates[dates.length-7]] = d3.sum(state.values, d=> d.newCases[d.newCases.length-7].newCases);
    objToCheck[currDate = dates[dates.length-6]] = d3.sum(state.values, d=> d.newCases[d.newCases.length-6].newCases);
    objToCheck[currDate = dates[dates.length-5]] = d3.sum(state.values, d=> d.newCases[d.newCases.length-5].newCases);
    objToCheck[currDate = dates[dates.length-4]] = d3.sum(state.values, d=> d.newCases[d.newCases.length-4].newCases);
    objToCheck[currDate = dates[dates.length-3]] = d3.sum(state.values, d=> d.newCases[d.newCases.length-3].newCases);
    objToCheck[currDate = dates[dates.length-2]] = d3.sum(state.values, d=> d.newCases[d.newCases.length-2].newCases);
    objToCheck[currDate = dates[dates.length-1]] = d3.sum(state.values, d=> d.newCases[d.newCases.length-1].newCases);
    objToCheck.weekOne = prevAvg;
    objToCheck.weekTwo = currAvg;
    objToCheck.change = (currAvg - prevAvg) / prevAvg * 100;

    toCheckData.push(objToCheck);
    stateData.push(obj);
  });

  stateData.forEach(state=> { // Join state data with state topo
    stateTopo.objects.states.geometries.forEach(d=> {
      if (d.properties.st == state.state) {
        d.properties.state = state.state;
        d.properties.currRate = state.currRate;
        d.properties.currDate = state.currDate;
        d.properties.prevDate = state.prevDate;
        d.properties.currAvg = state.currAvg;
        d.properties.prevAvg = state.prevAvg;
        d.properties.change = state.change;
      }
      return d
    })
  });

  dates.forEach(date=> { // Loop through dates to make U.S. total
    let obj = {
      date: date,
      cases: d3.sum(data, d=> d[date])
    }
    usData.push(obj)
  });

  usData.forEach((d,i)=> { // Get new cases
    d.newCases = i == 0 ? d.cases : d.cases - usData[i-1].cases;
  })

  let nyRevision = dates.indexOf("3/24/21"); // 20k case NY data dump
  usData[nyRevision].newCases = 59306;

  usData.forEach((d,i)=> { // Get 7-day average
    let avg = i < 6 ? d.newCases : (usData[i].newCases + usData[i-1].newCases + usData[i-2].newCases + usData[i-3].newCases + usData[i-4].newCases + usData[i-5].newCases + usData[i-6].newCases) / 7;
    d.avg = avg;
  })

  let checkFileName = `${formatDateString(dates[dates.length-1])} case growth`
  io.writeDataSync(`./${checkFileName}.csv`, toCheckData);
  io.writeDataSync("../src/data/usData.json", usData);
  io.writeDataSync("../src/data/stateData.json", stateData);
  io.writeDataSync("../src/data/stateTopo.json", stateTopo);
}

makeRequest().then(data => main(data)); // Push data up to main function

function formatDateString(dateString){
  const split = dateString.split("/");
  const yyyy = split[2];
  const mm = split[0];
  let dd = split[1];

  const months = {"1":"Jan.", "2":"Feb.", "3":"March", "4":"April", "5":"May", "6":"June", "7":"July", "8":"Aug.", "9":"Sept.", "10":"Oct.", "11":"Nov.", "12":"Dec."};
  const monthAbbr = months[mm];
  return `${monthAbbr} ${dd}`;
}