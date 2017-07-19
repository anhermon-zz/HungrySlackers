// Copyright (c) 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

String.prototype.contains = function(x){return this.indexOf(x)>-1;}

var server = 'http://172.16.50.88:9000/HungrySlackers';
var openUrl = '/Invite';
var joinUrl = '/join';
var closeUrl = '/close';
var cancelUrl = '/cancel';


var tempDishes;

var tenBisDishesIndexUrl = 'https://www.10bis.co.il/ShoppingCart/DishesIndex';
var orderConfirmationUrl = 'https://www.10bis.co.il/OrderConfirmation';
var addDishAjaxUrl       = 'https://www.10bis.co.il/ShoppingCart/AddDishAjax';

function doRefresh() {
	chrome.tabs.getSelected(null, function(tab) {
		var code = 'window.location.reload();';
		chrome.tabs.executeScript(tab.id, {code: code});
	});
}

/**
 * Get the current URL.
 *
 * @param {function(string)} callback - called when the URL of the current tab
 *   is found.
 */
function getCurrentTabUrl(callback) {
  // Query filter to be passed to chrome.tabs.query - see
  // https://developer.chrome.com/extensions/tabs#method-query
  var queryInfo = {
    active: true,
    currentWindow: true
  };

  chrome.tabs.query(queryInfo, function(tabs) {
    // chrome.tabs.query invokes the callback with a list of tabs that match the
    // query. When the popup is opened, there is certainly a window and at least
    // one tab, so we can safely assume that |tabs| is a non-empty array.
    // A window can only have one active tab at a time, so the array consists of
    // exactly one tab.
    var tab = tabs[0];

    // A tab is a plain object that provides information about the tab.
    // See https://developer.chrome.com/extensions/tabs#type-Tab
    var url = tab.url;

    // tab.url is only available if the "activeTab" permission is declared.
    // If you want to see the URL of other tabs (e.g. after removing active:true
    // from |queryInfo|), then the "tabs" permission is required to see their
    // "url" properties.
    console.assert(typeof url == 'string', 'tab.url should be a string');

    callback(url);
  });

  // Most methods of the Chrome extension APIs are asynchronous. This means that
  // you CANNOT do something like this:
  //
  // var url;
  // chrome.tabs.query(queryInfo, function(tabs) {
  //   url = tabs[0].url;
  // });
  // alert(url); // Shows "undefined", because chrome.tabs.query is async.
}

/**
 * @param {string} searchTerm - Search term for Google Image search.
 * @param {function(string,number,number)} callback - Called when an image has
 *   been found. The callback gets the URL, width and height of the image.
 * @param {function(string)} errorCallback - Called when the image is not found.
 *   The callback gets a string that describes the failure reason.
 */
function sendToServer(url, dataToSend, callback, errorCallback) {
	$.post(url, callback)
	.fail(errorCallback);
}

function renderStatus(statusText) {
  console.log(statusText);
  document.getElementById('status').textContent = statusText;
}
function onMenuBtnClick() {
	console.log('clicked');
	getCurrentTabUrl(function(url) {
		//TODO
		renderStatus('Open new order with: ' + url);
	});
}
function addCommonData(data, res) {
	data.UserId = res.UserId;
	data.RestaurantId = res.Restaurant.RestaurantId;
	data.RestaurantName = res.Restaurant.RestaurantName;
	
	//console.log(data);
	//console.log(JSON.stringify(data));
}
function openNewOrder() {
	baseAction(function(){
		get10BisData(function(res) {
			var data = { 
					url: url				
			};
			addCommonData(data, res);	
			sendToServer(server + openUrl, data, function(responseData) {
				// TODO - process response here
				console.log('sent to server - success');

		}, function(errorMessage) {
		  renderStatus('Failed to open new order. ' + errorMessage);
		});
	});
  });
}

function join() {
	baseAction(function(){
		get10BisData(function(tenBisData){
			getOrderConfirmation(function(orderConfirmationData) {
				var data = {
					DishList : orderConfirmationData.DishList
				};
				
				//temporary
				tempDishes = data.DishList;
				addCommonData(data, tenBisData);
				sendToServer(server + joinUrl, data, function(responseData) {
					console.log('sent to server - success');
				});
			})
		});
	});
}

function close() {
	baseAction(function(){
		get10BisData(function(res) {
			var data = {};
			addCommonData(data, res);
			addAllDishes(tempDishes, 
			function(data){
				console.log(data);
				if (data == true) {
					renderStatus('success');
				} else if(data == false) {
					renderStatus('failed');
				}
			}, function(err){
				renderStatus('failed');
				console.error('error:', err);
			}, doRefresh) ;
		});
	});
}
function baseAction(cb) {
		getCurrentTabUrl(function(url) {
			if (!url.contains('www.10bis.co.il')) {
				renderStatus('tab is not 10bis');
				return;
			}
			cb();
		});
}

function cancel () {
	baseAction(function() {
		get10BisData(function(res) {
			data = {};
			addCommonData(data, res);
			sendToServer(server + cancelUrl, data, function(response) {
				renderStatus('Order canceled');
			});
			
		});
	});
	
}

function get10BisData(cb) {
	$.get(tenBisDishesIndexUrl, cb);
}
function getOrderConfirmation(cb) {
	$.get(orderConfirmationUrl, cb);
}
function addAllDishes(dishes, cb, onError, onFinishedAll) {
	console.log(dishes);
	var requests = [];
	$.each(dishes, function(index, dish) {
		requests.push(addDish(dish, cb, onError));
	});
	$.when(requests).done(onFinishedAll);
}

function addDish(dish,cb,onError) {
	return $.post(addDishAjaxUrl, dish)
	 .done(cb)
	 .fail(onError);
}

document.addEventListener('DOMContentLoaded', function() {

  document.getElementById("open-btn").addEventListener("click", function() {
	openNewOrder();
  });
  document.getElementById("join-btn").addEventListener("click", function() {
	join();
  });
  document.getElementById("close-btn").addEventListener("click", function() {
	close();
  });
  document.getElementById("cancel-btn").addEventListener("click", function() {
	cancel();
  });
  
});