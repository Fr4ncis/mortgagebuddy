/* Content scripts can't open the options page themselves. */
chrome.runtime.onMessage.addListener(function(msg, sender, sendResponse){
  if (msg && msg.type === "open-options"){
    chrome.runtime.openOptionsPage();
    sendResponse({ok: true});
  }
  return false;
});

chrome.runtime.onInstalled.addListener(function(details){
  if (details.reason === "install") chrome.runtime.openOptionsPage();
});
