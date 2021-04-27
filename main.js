const TWO_MINUTES = 120000;
const TWO_SECONDS = 2000;
const COINS_SELECTED_LIMIT = 5;
let allCoinsMap = new Map();
let coinIdToMoreInfoObjectCacheMap = new Map();
let selectedCoinsForLiveReport = new Set();
let selectedCoinsForModal;
let updateChartInterval = null;
loadAllCoins();

function loadAllCoins() {
    // Show loading page animation
    $(".page-load").show();

    // Get all coins from server
    $.get(" https://api.coingecko.com/api/v3/coins").then(
        function (coins) {
            $(".page-load").hide();

            for (let index = 0; index < coins.length; index++) {
                let coin = {
                    id: coins[index].id,
                    symbol: coins[index].symbol,
                    name: coins[index].name
                };
                allCoinsMap.set(coin.id, coin);
                displayCoinInHomeView(coin);
            }
        })
        .catch(() => {
            $(".page-load").hide();
            console.error("Failed to retrieve coins data from server");
            alertUser("Failed to retrieve coins data from server");
        });
}

function displayCoinInHomeView(coin) {
    // Get the coins container element
    let coinsDisplaySection = $("#coinsDisplaySection");

    // Create coins' details
    let currentCoinCard = $("<div>").addClass("coin-card p-3 m-2");
    let moreInfoDiv = $("<div>").addClass("more-info-div");
    let coinSymbol = $("<h3>").html(coin.symbol);
    let coinName = $("<h5>").html(coin.name);

    // Create toggle button
    let toggleSwitch = $("<label>").addClass("switch");
    let toggleCheckbox = $("<input>").attr({ type: 'checkbox', id: coin.id });
    toggleCheckbox.change(() => onHomeViewToggleChange(coin.id));
    let toggleSlider = $("<span>").addClass("slider");
    toggleSwitch.append(toggleCheckbox, toggleSlider);

    // Create more info Button
    let moreInfoButton = $("<button>").addClass("btn");
    moreInfoButton.html("more info");
    moreInfoButton.click(function () {
        moreInfoButton.hide();
        onMoreInfoClicked(coin.id, moreInfoDiv);
        lessInfoButton.show();
    });

    // Create less info button
    let lessInfoButton = $("<button>").addClass("btn");
    lessInfoButton.html("less info");
    lessInfoButton.hide();
    lessInfoButton.click(function () {
        moreInfoDiv.empty();
        lessInfoButton.hide();
        moreInfoButton.show();
    });

    currentCoinCard.append(toggleSwitch, coinSymbol, coinName, moreInfoDiv,
        moreInfoButton, lessInfoButton);
    coinsDisplaySection.append(currentCoinCard);
}

function onMoreInfoClicked(coinId, moreInfoDiv) {
    // If the coin's more information is saved in cache, get info from there
    // Otherwise, retrieve info from server
    if (coinIdToMoreInfoObjectCacheMap.has(coinId)) {
        showCoinMoreInfo(coinIdToMoreInfoObjectCacheMap.get(coinId), moreInfoDiv);
    }
    else {
        // Add progress bar
        let loadingGif = document.createElement("img");
        loadingGif.src = "sources/loading.gif";
        loadingGif.style = "width : 20%";
        moreInfoDiv.append(loadingGif);

        $.get(" https://api.coingecko.com/api/v3/coins/" + coinId).then(
            function (coin) {
                // Remove progress bar
                loadingGif.remove();

                let coinMoreInfo = {
                    id: coinId,
                    image: coin.image.small,
                    ils: coin.market_data.current_price.ils,
                    eur: coin.market_data.current_price.eur,
                    usd: coin.market_data.current_price.usd
                };

                showCoinMoreInfo(coinMoreInfo, moreInfoDiv);
                saveCoinInCache(coinMoreInfo);
            })
            .catch(() => {
                loadingGif.remove();
                console.log("Failed to retrieve more information");
                alertUser("Failed to retrieve more information");
            });
    }
}

function showCoinMoreInfo(coinMoreInfo, moreInfoDiv) {
    let currencyList = document.createElement("ul");
    currencyList.classList.add("fa-ul", "text-left");

    let usdCurrency = createCurrencyListItem("USD", coinMoreInfo.usd, "fa-dollar-sign");
    let eurCurrency = createCurrencyListItem("EUR", coinMoreInfo.eur, "fa-euro-sign");
    let ilsCurrency = createCurrencyListItem("ILS", coinMoreInfo.ils, "fa-shekel-sign");

    currencyList.append(usdCurrency, eurCurrency, ilsCurrency);
    moreInfoDiv.append(currencyList);

    let currentCoinImage = document.createElement("img");
    currentCoinImage.src = coinMoreInfo.image;

    moreInfoDiv.append(currentCoinImage);
}

function createCurrencyListItem(currencyCoinSymbol, currencyValue, iconClassName) {
    let currencyItem = document.createElement("li");
    let span = document.createElement("span");
    let icon = document.createElement("i");
    span.classList.add("fa-li");
    icon.classList.add("fas", iconClassName);

    span.append(icon);
    currencyItem.append(span);
    currencyItem.innerHTML += currencyValue + " " + currencyCoinSymbol;

    return currencyItem;
}

function saveCoinInCache(coinMoreInfo) {
    // Save coin's more info in cache
    coinIdToMoreInfoObjectCacheMap.set(coinMoreInfo.id, coinMoreInfo);

    // Delete coin's more info from chace after two minutes
    setTimeout(function () {
        coinIdToMoreInfoObjectCacheMap.delete(coinMoreInfo.id);
    }, TWO_MINUTES);
}

function onHomeViewToggleChange(coinId) {
    if (selectedCoinsForLiveReport.has(coinId)) {
        selectedCoinsForLiveReport.delete(coinId);
    }
    else {
        if (selectedCoinsForLiveReport.size < COINS_SELECTED_LIMIT) {
            selectedCoinsForLiveReport.add(coinId);
        }
        else {
            selectedCoinsForModal = new Set(selectedCoinsForLiveReport);
            selectedCoinsForModal.add(coinId);
            createModalContent();
            $(".modal").modal();
        }
    }
}

function createModalContent() {
    $(".modal-body").empty();
    $("#modalSaveButton").prop('disabled', true);
    selectedCoinsForModal.forEach(id => {
        displayCoinInModal(id);
    });
}

function displayCoinInModal(coinId) {
    let newModalCoinCard = $("<div>").addClass("coin-card modal-coin-card");
    let coinSymbol = $("<h3>").html(allCoinsMap.get(coinId).symbol);

    // Create toggle button
    let toggleButtonSwitchLabel = $("<label>").addClass("switch");
    let toggleButtonCheckbox = $("<input>").attr({ type: 'checkbox', id: coinId, checked: true });
    let toggleButtonSliderSpan = $("<span>").addClass("slider");
    toggleButtonSwitchLabel.append(toggleButtonCheckbox, toggleButtonSliderSpan);
    toggleButtonCheckbox.change(() => onModalToggleChange(coinId));

    newModalCoinCard.append(toggleButtonSwitchLabel, coinSymbol);
    $(".modal-body").append(newModalCoinCard);
}

function onModalToggleChange(coinId) {
    if (selectedCoinsForModal.has(coinId)) {
        selectedCoinsForModal.delete(coinId);
    }
    else {
        selectedCoinsForModal.add(coinId);
    }

    // Disable save button if all six coins are selected
    // Otherwise, enable it
    if (selectedCoinsForModal.size < 6) {
        $("#modalSaveButton").prop('disabled', false);
    }
    else {
        $("#modalSaveButton").prop('disabled', true);
    }
}

function onSaveChangesModal() {
    selectedCoinsForLiveReport = selectedCoinsForModal;
    //updateModalToggleChangesInHomeView();
    onCloseModal();
}

function onCloseModal() {
    $("#coinsDisplaySection input:checked").each(function () {
        if (!selectedCoinsForLiveReport.has($(this).attr("id"))) {
            $(this).prop('checked', false);
        }
    });
    $(".modal").modal('hide');
}

function onLiveReports() {
    if (selectedCoinsForLiveReport.size == 0) {
        alertUser("You need to select at least one coin!");
    }
    else {
        clearPageContent();

        $(".page-load").show();
        $("#liveReportsSection").fadeIn("slow");
        createChart();
    }
}

function createChart() {
    // Create a string of the selected coins for the API get request
    let selectedCoinsSymbolsText = "";
    selectedCoinsForLiveReport.forEach(coinId => {
        selectedCoinsSymbolsText += allCoinsMap.get(coinId).symbol + ",";
    });
    selectedCoinsSymbolsText = selectedCoinsSymbolsText.slice(0, -1).toUpperCase();

    // Chart options
    let options = {
        exportEnabled: true,
        animationEnabled: true,
        title: {
            text: selectedCoinsSymbolsText + " to USD"
        },
        subtitles: [{
            text: "Click Legend to Hide or Unhide Data Series"
        }],
        toolTip: {
            shared: true
        },
        legend: {
            cursor: "pointer",
            itemclick: toggleDataSeries
        },
        axisX: {
            title: "Time",
            valueFormatString: "HH:mm:ss"
        },
        axisY: {
            title: "Coin Value"
        },
        data: []
    };

    // Create a graph for each coin and add it to the chart
    selectedCoinsForLiveReport.forEach(coinId => {
        options.data.push(createCoinGraph(allCoinsMap.get(coinId).symbol.toUpperCase()));
    });

    let chart = new CanvasJS.Chart("chartContainer", options);

    // Update chart's data every two second
    updateChartInterval = setInterval(function () {
        updateChartData(chart, selectedCoinsSymbolsText)
    }, TWO_SECONDS);
}

function createCoinGraph(coinSymbol) {
    let dataPoints = [];
    let newCoinGraphData = {
        type: "spline",
        name: coinSymbol,
        showInLegend: true,
        xValueFormatString: "DD MMM YYYY, HH:mm:ss",
        yValueFormatString: "$#,##0.###0",
        dataPoints: dataPoints
    };
    return newCoinGraphData;
}

function updateChartData(chart, coinsSymbolsText) {
    $.get("https://min-api.cryptocompare.com/data/pricemulti?fsyms=" + coinsSymbolsText +
        "&tsyms=USD").then(
            function (coins) {
                // Add new data to chart
                let time = new Date();
                chart.options.data.forEach(coin => {
                    let newDataPoint = { x: time, y: coins[coin.name].USD };
                    coin.dataPoints.push(newDataPoint);
                });

                // Remove loading gif and show chart
                $(".page-load").hide();
                $("#chartContainer").fadeIn();
                chart.render();
            })
        .catch(() => {
            console.log("Failed to retrieve coins' live reports from server");
            alertUser("Failed to retrieve coins' live reports from server");
            onHome(); // Go back to home view
        });
}

// Hide, or Show, the clicked coin's graph
function toggleDataSeries(e) {
    if (typeof (e.dataSeries.visible) === "undefined" || e.dataSeries.visible) {
        e.dataSeries.visible = false;
    } else {
        e.dataSeries.visible = true;
    }
    e.chart.render();
}

function onAbout() {
    clearPageContent();
    $("#aboutSection").fadeIn("slow");
}

function onHome() {
    clearPageContent();
    $("#coinsDisplaySection").fadeIn("slow");
}

function clearPageContent() {
    // Clear previous loading
    $(".page-load").hide();

    // Clear search input
    if ($("#searchCoinInput").val() != "") {
        $("#searchCoinInput").val("");
        $("#searchCoinInput").keyup();
    }

    // Clear live reports chart
    if (updateChartInterval != null) {
        clearInterval(updateChartInterval);
        updateChartInterval = null;
        $("#chartContainer").hide();
        $("#chartContainer").empty();
    }

    // Hide page sections
    $("#aboutSection").hide();
    $("#liveReportsSection").hide();
    $("#coinsDisplaySection").hide();
}

function onKeySearchCoin(input) {
    $("#errorMessage").remove();
    let text = input.value.trim().toLowerCase();

    // Get coins that their symbol contains the input value
    let matchingCoins = $('.coin-card h3:contains("' + text + '")');

    // Hide all coins
    $('.coin-card').hide();

    // Display matching coin, if there were any
    // If not display an error message
    if (matchingCoins.length > 0) {
        matchingCoins.closest('.coin-card').show();
    }
    else {
        displaySearchError();
    }
}

function displaySearchError() {
    let errorMessage = $('<div id="errorMessage">').addClass("error-msg");
    let errorImage = $("<img>").attr("src", "sources/search_error.gif");
    let errorDetails = $("<h3>").html("No coins were found! " + 
        "Please make sure you searched by coin symbol.");
    errorMessage.append(errorImage, errorDetails);
    $("#mainContainer").append(errorMessage);
    errorMessage.fadeIn();
}

function alertUser(msg) {
    $(".msg").html(msg);
    $(".alert").removeClass("hide");
    $(".alert").addClass("show");
}

// Close user alert
function onCloseAlert() {
    $(".alert").addClass("hide");
    $(".alert").removeClass("show");
};

// Change navbar background color on scroll
$(function () {
    $(document).scroll(function () {
        let nav = $(".navbar");
        nav.toggleClass('scrolled', $(this).scrollTop() > 25);
    });
});