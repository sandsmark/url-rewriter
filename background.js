var requestFilter = { urls: [ "<all_urls>" ] };

var items = [];

chrome.storage.sync.get( function( itms ) { items = itms; });

chrome.storage.sync.onChanged.addListener( function( ) {
    chrome.storage.sync.get( function( itms ) { items = itms; });
});

chrome.webRequest.onBeforeRequest.addListener( function( event ) {
    for( var key in items ) {
        var item = items[key];

        var match = event.url.match( new RegExp( item.regex, "i" ) );
        if( match && match.length > item.groupNum )
        {
            match[item.groupNum] = item.replacement;
            var newUrl = match.slice( 1 ).join( "" );
            return { redirectUrl: newUrl };
        }
    }
}, requestFilter, ["blocking"]);

chrome.browserAction.onClicked.addListener( function() {
	var optionsUrl = chrome.extension.getURL('options.html'); 
	chrome.tabs.query( {}, function( extensionTabs ) {
		var found = false;
		for (var i=0; i < extensionTabs.length; i++) {
			if (optionsUrl == extensionTabs[i].url) {
				found = true;
				chrome.tabs.update(extensionTabs[i].id, {"selected": true});
			}
		}
		if (found == false) {
			chrome.tabs.create({url: "options.html"});
		}
	} );
} );
