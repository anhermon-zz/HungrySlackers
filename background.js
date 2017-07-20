chrome.runtime.onMessage.addListener(function(msg, sender) {
    chrome.notifications.create("1", msg.body, function(){});
});
