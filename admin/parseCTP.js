const io = require('indian-ocean');
const d3 = require('d3');

let theData = [];
let usTotal = [];

let twoLetterDict = require("../src/data/statesDict.json");
let stateDict = require("../src/data/fullNameStateDict.json");
let stateTopo = require("./states.topo.json"); // state topojson
let statePop = require("./statePopulation.json"); // From ACS

let url = "https://covidtracking.com/api/v1/states/daily.json"; // The Covid Tracking Project

const makeRequest = async () => { // Load data
  try {
    // this parse may fail
    const data = await d3.json(url);
    return data;
  } catch (err) {
    console.log(err)
    throw Error("Failed to load data")
  }
};

async function main(data) { // Parse data after its loaded

  let parseTime = d3.timeParse("%Y-%m-%d")
  data.sort((a,b)=> a.date - b.date);
  data.forEach((d,i)=> {
    let string = d.date.toString();
    let year = string.slice(0,4);
    let month = string.slice(4,6);
    let day = string.slice(6);
    d.formattedDate = parseTime(year+"-"+month+"-"+day)
  })

  let states = [...new Set(data.map(d=> d.state))]; // Get unique array of states
  let dates = [...new Set(data.map(d=> d.date))]; // Get unique array of dates

  casesByState = states.map(state => {
    return {
      key: state,
      values: data.filter(f => f.state === state)
    }
  });

  casesByState.forEach(state => {
    let currDate = state.values[state.values.length-1].formattedDate;
    let prevDate = state.values[state.values.length-8].formattedDate;

    let currAvg = (state.values[state.values.length-1].positiveIncrease + state.values[state.values.length-2].positiveIncrease + state.values[state.values.length-3].positiveIncrease +
      state.values[state.values.length-4].positiveIncrease + state.values[state.values.length-5].positiveIncrease + state.values[state.values.length-6].positiveIncrease + state.values[state.values.length-7].positiveIncrease) / 7;

    let prevAvg = (state.values[state.values.length-8].positiveIncrease + state.values[state.values.length-9].positiveIncrease + state.values[state.values.length-10].positiveIncrease +
      state.values[state.values.length-11].positiveIncrease + state.values[state.values.length-12].positiveIncrease + state.values[state.values.length-13].positiveIncrease + state.values[state.values.length-14].positiveIncrease) / 7;

    let obj = {
      state: state.key,
      currDate: currDate,
      prevDate: prevDate,
      currAvg: currAvg,
      prevAvg: prevAvg,
      change: (currAvg - prevAvg) / prevAvg * 100
    }
    theData.push(obj)
  });

  theData.forEach(state=> {
    stateTopo.objects.states.geometries.forEach(d=> {
      if (d.properties.st == state.state ) {
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

  let groupByDate = dates.map(date=> {
    return {
      key: date,
      values: data.filter(f=> f.date === date)
    }
  })

  groupByDate.forEach(date=> {
    let obj = {
      date: date.key,
      cases: d3.sum(date.values, d=> d.positiveIncrease)
    }
    usTotal.push(obj)
  })

  // Revisions to U.S. total
  usTotal.forEach(d=> {
    if (d.date == 20200922) { // Harris county backlog
      d.cases = d.cases - 17820;
    }
    if (d.date == 20200925) { // NC antigen testing backlog
      d.cases = d.cases - 6142;
    }
  })

  usTotal.forEach((d,i)=> {
    let avg = i < 6 ? d.cases : (usTotal[i].cases + usTotal[i-1].cases + usTotal[i-2].cases + usTotal[i-3].cases + usTotal[i-4].cases + usTotal[i-5].cases + usTotal[i-6].cases) / 7;
    d.avg = avg;
  })

  io.writeDataSync("../src/data/usData.json", usTotal);
  io.writeDataSync("../src/data/stateData.json", theData);
  io.writeDataSync("../src/data/stateTopo.json", stateTopo);
}

makeRequest().then(data => main(data)); // Push data up to main function