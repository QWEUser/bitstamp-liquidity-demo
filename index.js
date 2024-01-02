// global variable declaration

const inputs = $(".main-text-containers__input");
const bidsPlaceholder = $("#bids");
const asksPlaceholder = $("#asks");
const bidsAsksPlaceholder = document.querySelector("#bids-asks");
const burgerMenu = $(".burger-menu-container");
const cellWidth = $("#asks-weight-title").width();
let subscribedChannels = [];
let dataObject = {};
displayDataFirstTime = true;

let resultFirst = 0;
let amountFirst = 0;

let usdSpent = 0;
let btcBought = 0;
let averageSecond = 0;

let wsDataQueue = [];
let foundStartingPoint = false;

// create hight of grid based on grid cell height

const gridCellHeight = $("#bids-weight-title").height();
$("#bids-asks").height(`${40 * gridCellHeight}px`);

// event listeners for buttons and inputs

for (i = 0; i < inputs.length; i++) {
  inputs[i].addEventListener("focus", removeValue);
  inputs[i].addEventListener("focusout", formatInput);
  inputs[i].addEventListener("focusout", displayData);
  inputs[i].addEventListener("input", resizeInput);
  inputs[i].addEventListener("keyup", resizeInput);
}

$(".burger-menu-container").click(function () {
  $(".mobile-menu-container").toggleClass("mobile-menu-container-open");
  $(".burger-menu-container").toggleClass("burger-menu-container-open");
});

$(".mobile-menu__item").click(function () {
  $(".mobile-menu-container").toggleClass("mobile-menu-container-open");
  $(".burger-menu-container").toggleClass("burger-menu-container-open");
});

$(".header-logo").click(function () {
  // $(".header-logo").scrollTop(0);
  window.scroll({
    top: 0,
    left: 0,
    behavior: "smooth",
  });
});

// populate bids and asks grid with loading elements

for (i = 0; i < 20 * 6; i++) {
  bidsAsksPlaceholder.appendChild(createLoadingCell());
}

// restricts input for the given textbox to the given inputFilter.

let target = parseFloat(
  $("#main-text-containers__user-input").val().substr(2).replace(/,/g, "")
);

function setInputFilter(textbox, inputFilter) {
  [
    "input",
    "keydown",
    "keyup",
    "mousedown",
    "mouseup",
    "select",
    "contextmenu",
    "drop",
  ].forEach(function (event) {
    textbox.oldValue = "";
    textbox.addEventListener(event, function () {
      if (inputFilter(this.value)) {
        this.oldValue = this.value;
        this.oldSelectionStart = this.selectionStart;
        this.oldSelectionEnd = this.selectionEnd;
      } else if (this.hasOwnProperty("oldValue")) {
        this.value = this.oldValue;
        this.setSelectionRange(this.oldSelectionStart, this.oldSelectionEnd);
      }
    });
  });
}

// Restrict input to '$ ' and numerals by using a regular expression filter.

setInputFilter(
  document.getElementById("main-text-containers__user-input"),
  function (value) {
    // return /^\d*\.?\d*$/.test(value); //this version accepts numbers and '.' only
    return /^\$?\s?\d{0,3}\,?(\d{3}\,?)*\.?\d*$/.test(value);
  }
);

// Restrict input to  '$ ' and numerals by using a regular expression filter.

setInputFilter(
  document.getElementById("main-text-containers__user-cash"),
  function (value) {
    return /^\$?\s?\d{0,3}\,?(\d{3}\,?)*\.?\d*$/.test(value);
  }
);

// Functions to resize and format a textbox depending on the length of the input

function resizeInput() {
  if (this.size > 15) {
    this.size = 19;
    this.style.fontSize = "1.2rem";
  } else {
    this.size = this.value.length;
    this.style.fontSize = "1.6rem";
  }
  if (event.which == 13 || event.keyCode == 13) {
    this.blur();
  }
}

function formatInput() {
  this.value = numeral(this.value).format("$ 0,0.[00000000]");
  this.size = this.value.length;
  target = parseFloat(this.value.substr(2).replace(/,/g, ""));
  this.setAttribute("data-target", target);

  if (this.size > 15) {
    this.size = 19;
    this.style.fontSize = "1.2rem";
  } else {
    this.size = this.value.length;
    this.style.fontSize = "1.6rem";
  }
}

function removeValue() {
  this.value = "";
}

function init() {
  var orderBookTimestamp = null;
  /**
   * This var is an example of subscription message. By changing its event property to: "bts:unsubscribe"
   * you can delete your subscription and stop receiving events.
   */

  var subscribeMsg = {
    event: "bts:subscribe",
    data: {
      channel: "diff_order_book_btcusd",
    },
  };

  subscribeTck = {
    event: "bts:subscribe",
    data: {
      channel: "live_trades_btcusd",
    },
  };

  /**
   * Execute a websocket handshake by sending an HTTP upgrade header.
   */
  var ws;
  initWebsocket();

  /**
   * Retrieve the orderbook state from the public API
   */

  var fetchOrderBook = function () {
    dataObject = {};
    $.getJSON(
      "https://www.bitstamp.net/api/v2/order_book/btcusd?group=1",
      function (data) {
        dataObject = data;
        i = 0;

        orderBookTimestamp = data.microtimestamp;
        displayData();
      }
    );

    $.getJSON(
      "https://www.bitstamp.net/api/v2/ticker/btcusd/",
      function (data) {
        $("#current-price-container").html(
          numeral(JSON.stringify(data.last)).format("$ 0,0.00")
        );
      }
    ).fail(function () {
      {
        console.log(
          "Oops, looks like your request got blocked! Don't worry, it's just a built in browser precaution, the data should start loading with the next trade that happens on Bitstamp :)"
        );
      }
    });
  };

  /**
   * Serializes websocket data when it's received.
   */

  serializeTrade = function (data) {
    if (typeof dataObject.asks === "undefined") {
      return;
    }

    tradePrice = JSON.stringify(data.price);

    if (tradePrice < 1) {
      cFormat = "$ 0,0.0000";
    } else {
      cFormat = "$ 0,0.00";
    }

    $("#current-price-container").html(numeral(tradePrice).format(cFormat));
    if (data.type == 0) {
      $("#current-price-container").css("color", "#159e49");
    } else {
      $("#current-price-container").css("color", "#f7931a");
    }
    setTimeout(function () {
      $("#current-price-container").css("color", "var(--gray)");
    }, 500);
  };

  serializeData = function (data) {
    for (i = 0; i < data.asks.length; i++) {
      price = parseFloat(data.asks[i][0]);
      amount = parseFloat(data.asks[i][1]);

      function matchArray(arr) {
        return arr[0] >= price;
      }

      indx = dataObject.asks.findIndex(matchArray);

      if (amount === 0.0) {
        dataObject.asks.splice(indx, 1);
      } else if (price != parseFloat(dataObject.asks[indx][0])) {
        dataObject.asks.splice(indx, 0, [price, amount]);
      } else {
        dataObject.asks.splice(indx, 1, [price, amount]);
      }
    }

    for (i = 0; i < data.bids.length; i++) {
      price = parseFloat(data.bids[i][0]);
      amount = parseFloat(data.bids[i][1]);

      function matchArray(arr) {
        return arr[0] <= price;
      }

      indx = dataObject.bids.findIndex(matchArray);

      if (amount === 0.0) {
        dataObject.bids.splice(indx, 1);
      } else if (price != parseFloat(dataObject.bids[indx][0])) {
        dataObject.bids.splice(indx, 0, [price, amount]);
      } else {
        dataObject.bids.splice(indx, 1, [price, amount]);
      }
    }
  };

  /**
   * We save the websocket messages in the beginning to avoid missing the early ones that should be applied
   * to our order book
   */

  function initWebsocket() {
    ws = new WebSocket("wss://ws.bitstamp.net");

    window.onbeforeunload = function () {
      ws.onclose = function () {}; // disable onclose handler first
      ws.close();
    };

    ws.onopen = function () {
      ws.send(JSON.stringify(subscribeMsg));
      ws.send(JSON.stringify(subscribeTck));
    };

    ws.onmessage = function (evt) {
      response = JSON.parse(evt.data);
      /**
       * This switch statement handles message logic. It is responsible for fetching the starting state of
       * the order book and processing data in case of data event
       */
      switch (response.event) {
        case "data": {
          if (!foundStartingPoint) {
            // We have to fetch the order book after we have received a couple of websocket messages
            if (wsDataQueue.length === 5) {
              fetchOrderBook();
            }
            if (wsDataQueue.length === 15) {
              alert(
                "Connection to Bitstamp failed. Please" + " refresh the page."
              );
              ws.close();
            }
            /**
             * Because we subscribe to WS events before fetching the order book state from the API we
             * have to save the websocket messages and later apply those that must be applied on our
             * order book to get the correct order book state
             */
            wsDataQueue.push(response.data);
            console.log(orderBookTimestamp);
            if (orderBookTimestamp !== null) {
              /**
               * After we have our initial order book state, the first thing we need to do is to find
               * the first diff that happens after our order book snapshot and apply it along with
               * all those that followed
               */
              wsDataQueueTimestamps = wsDataQueue.map(
                (curData) => curData.microtimestamp
              );
              console.log(wsDataQueueTimestamps);
              console.log(wsDataQueueTimestamps);
              // this line below was part of the original Bitstamp documentation, but is not functioning, because it searches for a strig in an object with string elements, instead of comparing the first and last timestamp in wsDataQueueTimestamps
              // if (wsDataQueueTimestamps.includes(orderBookTimestamp)) {
              if (
                Number(wsDataQueueTimestamps[0]) <=
                  Number(orderBookTimestamp) &&
                Number(orderBookTimestamp) <=
                  Number(
                    wsDataQueueTimestamps[wsDataQueueTimestamps.length - 1]
                  )
              ) {
                foundStartingPoint = true;
                console.log("foundStartingPoint = true");
                for (var i = 0; i < wsDataQueue.length; i++) {
                  // We assume that the microtimestamps are in an increasing order
                  if (wsDataQueue[i].microtimestamp > orderBookTimestamp) {
                    serializeData(wsDataQueue[i]);
                  }
                }
                wsDataQueue = [];
              }
            }
          } else {
            serializeData(response.data);
          }
          break;
        }
        case "trade": {
          serializeTrade(response.data);
          break;
        }
        case "bts:request_reconnect": {
          /**
           * Reconnecting does not guarantee us that we have not missed a websocket message. Missing a
           * single message would put the order book in an invalid state. This is why we can't just
           * reconnect.
           */
          break;
        }
      }
    };
    /**
     * In case of unexpected close event, we don't try to reconnect because we might end up in an invalid order
     * book state.
     */
    ws.onclose = function () {
      console.log("Websocket connection closed");
    };
  }
}

init();
setInterval(displayData, 1000);

function displayData() {
  if (foundStartingPoint == true && typeof dataObject.asks !== "undefined") {
    let bitstampBidsAsksObject = JSON.parse(JSON.stringify(dataObject));
    htmlasks = "";
    htmlbids = "";

    priceFirst = parseFloat(
      $("#main-text-containers__user-input").attr("data-target")
    );
    resultFirst = 0;
    amountFirst = 0;

    amountSecond = parseFloat(
      $("#main-text-containers__user-cash").attr("data-target")
    );
    resultSecond = bitstampBidsAsksObject.asks[0][0];
    usdSpent = 0;
    btcBought = 0;
    averageSecond = 0;

    // Delete all elements from bids-asks grid

    $(".bids-asks--elements").remove();
    if (displayDataFirstTime) {
      // Delete all skeleton loading elements

      $(".loading-element").remove();
      displayDataFirstTime = false;
    }

    function determineFormat(amount) {
      if (amount < 1) {
        fiatFormat = "$ 0,0.00[00]";
        cryptoFormat = "0,0.00[0000]";
      } else {
        fiatFormat = "$ 0,0.00";
        cryptoFormat = "0,0.00";
      }
    }

    if (
      priceFirst >= bitstampBidsAsksObject.bids[0][0] &&
      priceFirst <= bitstampBidsAsksObject.asks[0][0]
    ) {
      $("#ccFirst").html("");
      $("#buyFirst").html("on Bitstamp, you currently need to spend");
      $("#main-text-containers__target-result").html("$ 0.01");
      $("#main-text-containers__target-average").html(
        "Wow, looks like you really don't need to be a whale to reach your target!"
      );
    } else if (priceFirst > bitstampBidsAsksObject.asks[0][0]) {
      for (i = 0; i < bitstampBidsAsksObject.asks.length; i++) {
        if (priceFirst <= bitstampBidsAsksObject.asks[i][0]) {
          break;
        }
        resultFirst +=
          parseFloat(bitstampBidsAsksObject.asks[i][0]) *
          parseFloat(bitstampBidsAsksObject.asks[i][1]);
        amountFirst += parseFloat(bitstampBidsAsksObject.asks[i][1]);
      }

      determineFormat(amountFirst);
      $("#ccFirst").html("up to");
      $("#buyFirst").html("on Bitstamp, you currently need to spend");
      $("#main-text-containers__target-result").html(
        numeral(resultFirst).format("$ 0,0.00")
      );
      $("#main-text-containers__target-average").html(
        `for which you would receive <span class="main__highlighted-text"> ${numeral(
          amountFirst
        ).format(cryptoFormat)}
          Bitcoin </span> at an average price of <span class="main__highlighted-text">
          ${numeral(resultFirst / amountFirst).format(fiatFormat)} </span>
          per Bitcoin.`
      );
    } else {
      for (i = 0; i < bitstampBidsAsksObject.bids.length; i++) {
        if (priceFirst >= parseFloat(bitstampBidsAsksObject.bids[i][0])) {
          break;
        }
        resultFirst +=
          parseFloat(bitstampBidsAsksObject.bids[i][0]) *
          parseFloat(bitstampBidsAsksObject.bids[i][1]);
        amountFirst += parseFloat(bitstampBidsAsksObject.bids[i][1]);
      }
      determineFormat(amountFirst);
      $("#ccFirst").html("down to");
      $("#buyFirst").html("on Bitstamp, you currently need to sell");
      $("#main-text-containers__target-result").html(
        numeral(amountFirst).format(cryptoFormat) + " Bitcoin "
      );
      $("#main-text-containers__target-average").html(
        `for which you would receive <span class="main__highlighted-text">
          ${numeral(resultFirst).format(fiatFormat)}</span> 
          at an average price of <span class="main__highlighted-text">
          ${numeral(resultFirst / amountFirst).format(
            fiatFormat
          )}</span> per Bitcoin.`
      );
    }

    for (
      i = 0;
      i < bitstampBidsAsksObject.asks.length && usdSpent <= amountSecond;
      i++
    ) {
      usdSpent +=
        bitstampBidsAsksObject.asks[i][0] * bitstampBidsAsksObject.asks[i][1];
      btcBought += parseFloat(bitstampBidsAsksObject.asks[i][1]);
      resultSecond = bitstampBidsAsksObject.asks[i][0];
      if (usdSpent >= amountSecond) {
        btcBought = btcBought - (usdSpent - amountSecond) / resultSecond;
      }
      if (amountSecond == 0) {
        averageSecond = resultSecond;
      } else {
        averageSecond = amountSecond / btcBought;
      }
    }
    determineFormat(btcBought);
    $("#main-text-containers__cash-result").html(
      numeral(resultSecond).format(fiatFormat)
    );
    $("#main-text-containers__cash-average").html(
      `on Bitstamp, purchasing <span class="main__highlighted-text">
      ${isNaN(btcBought) ? "0.00" : numeral(btcBought).format(cryptoFormat)}  
      Bitcoin</span> at an average price of
      <span class="main__highlighted-text">${numeral(averageSecond).format(
        fiatFormat
      )}
      </span>per Bitcoin in the process.`
    );

    let maxAsksWeight = 0;
    let maxBidsWeight = 0;

    // bids and asks come in [price, amount] pairs. We get the Weight of each bid or ask by multiplying the price (pair[0]) and amount (pair[1]) of each pair.

    const asksWeightArray = bitstampBidsAsksObject.asks
      .slice(0, 20)
      .map((pair) => pair[0] * pair[1]);

    const bidsWeightArray = bitstampBidsAsksObject.bids
      .slice(0, 20)
      .map((pair) => pair[0] * pair[1]);

    maxAsksWeight = Math.max(...asksWeightArray);
    maxBidsWeight = Math.max(...bidsWeightArray);

    // const sumAsksWeight = asksWeightArray.reduce(
    //   (previousValue, currentValue) => previousValue + currentValue,
    //   0
    // );

    // const sumBidsWeight = bidsWeightArray.reduce(
    //   (previousValue, currentValue) => previousValue + currentValue,
    //   0
    // );

    for (i = 0; i < 20; i++) {
      bidsAsksPlaceholder.appendChild(
        createGridCell(bitstampBidsAsksObject.asks[i][0], 2)
      );
      bidsAsksPlaceholder.appendChild(
        createGridCell(bitstampBidsAsksObject.asks[i][1], 6)
      );
      bidsAsksPlaceholder.appendChild(
        createGridWeightCell(
          asksWeightArray[i],
          maxAsksWeight,
          // sumAsksWeight,
          "#159e49",
          "left"
        )
      );
      bidsAsksPlaceholder.appendChild(
        createGridCell(bitstampBidsAsksObject.bids[i][0], 2)
      );
      bidsAsksPlaceholder.appendChild(
        createGridCell(bitstampBidsAsksObject.bids[i][1], 6)
      );
      bidsAsksPlaceholder.appendChild(
        createGridWeightCell(
          bidsWeightArray[i],
          maxBidsWeight,
          // sumBidsWeight,
          "#f7931a",
          "left"
        )
      );
    }
  }
}

//function to populate the bids and asks grid with price and amount values

function createGridCell(content, decimalPoints) {
  const cell = document.createElement("div");
  const text = document.createTextNode(
    parseFloat(content).toFixed(decimalPoints)
  );
  cell.appendChild(text);
  cell.classList.add("bids-asks--elements");
  return cell;
}

//function to populate the bids and asks grid with Weight bar

function createGridWeightCell(weight, maxWeight, color, justifySelf) {
  const cell = document.createElement("div");
  cell.style.width = `${(cellWidth * weight) / maxWeight}px`;
  cell.style.height = "1rem";
  cell.style.backgroundColor = color;
  cell.style.justifySelf = justifySelf;
  cell.classList.add("bids-asks--elements");
  return cell;
}

// function to populate bids and asks grid with loading elements

function createLoadingCell() {
  const cell = document.createElement("div");
  cell.classList.add("loading-element");
  cell.classList.add("faux-bids-asks");
  return cell;
}
