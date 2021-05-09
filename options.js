var hide_timeout;
var rewriteDefTemplate;

$( document ).ready( function() { restore(); } );

function hide_message() {
	clearTimeout( hide_timeout );
	$( "#message" ).html( "&nbsp;" ).removeClass();
}

function show_message(type, text, time) {
	$( "#message" ).removeClass().addClass( type ).html( text );
	hide_timeout = setTimeout( function() { hide_message(); }, time * 1000);
}

// Rewrite definitions are keyed "rewriteDefX", where X is a number starting at 0
// A rewrite definition contain the following fields:
// .regex - the regex to match
// .groupNum - the group number to replace
// .replacement - the replacement text

function restore() {
	$( "#addBtn" ).click( add_row );
	$( "#message" ).click( hide_message );
	$( "#saveBtn" ).click( save );
	$( "#testInputText" ).on( 'input', updateTestOutput );
	$( window ).unload( save );
	
	rewriteDefTemplate = $( "#rewriteDefTemplate" ).detach();
	rewriteDefTemplate.attr( "id", "" );
	
	chrome.storage.sync.get( function( items ) {
		for( var key in items ) {
			add_row( null, key, items[key] );
		}
		if( Object.keys( items ).length === 0 ) {
			add_row( null, null, null );
			show_message( "info", "Add a rewrite rule below.", 15 );
		}
	});
}

function add_row( event, key, item ) {
	var rewriteDef = rewriteDefTemplate.clone();

	rewriteDef.find( 'input' ).each( function() { $(this).on( 'input', updateTestOutput ); } );

	if( item )
	{
		rewriteDef.find( "[name='regexText']" ).val( item.regex );
		rewriteDef.find( "[name='groupNumText']" ).val( item.groupNum );
		rewriteDef.find( "[name='replacementText']" ).val( item.replacement );
		rewriteDef.find( "[name='removeBtn']" ).attr( "name", "remove-" + key );
	}
	
	rewriteDef.find( "button[name^='remove']" ).click( del_row );
	
	$( "#rewriteDefContainer" ).append( rewriteDef );
}

function del_row() {
	var rewriteDef = $( this ).parents( ".rewriteDef" );
	rewriteDef.remove();
	
	var key = rewriteDef.find( "button[name^='remove']" ).attr( "name" ).split( "-" )[1];
	if( key ) chrome.storage.sync.remove( key, function() {
		if( runtime.lastError ) show_message( "error", "Failed to remove rewrite rule: " + runtime.lastError, 10 );
		else show_message( "success", "Removed rewrite rule.", 5 );
	} );
}

function save() {
	var store = {};
	var i = 0;
	var unusedFields = false;
	var rewriteDefs = $( ".rewriteDef" ).each( function() {
		var item = {
			regex: $( this ).find( "[name='regexText']" ).val(),
			groupNum: $( this ).find( "[name='groupNumText']" ).val(),
			replacement: $( this ).find( "[name='replacementText']" ).val(),
		};
		if( item.regex.length == 0 || item.groupNum.length == 0 )
		{
			show_message( "warning", "Please make sure all fields are filled in before saving. Delete any unused rows.", 5 );
			unusedFields = true;
			return false;
		}
		store[i++] = item;
	} );
	
	if( unusedFields ) return;
	
	chrome.storage.sync.get(function(items) {
		for (var key in items) {
			if (!store.hasOwnProperty(key)) {
				chrome.storage.sync.remove(key);
			}
		}
	});
	chrome.storage.sync.set(store);
	
	show_message("success", "Saved all rewrite rules.", 5);
}

function isUrlAbsolute( url ) { 
    return (url.indexOf('://') > 0 || url.indexOf('//') === 0);
}

function updateTestOutput()
{
	var testInput = $( "#testInputText" ).val();
	var foundMatch = false;

	$( "#testInputErrorText" ).html( "" )
	
	var rewriteDefs = $( ".rewriteDef" ).each( function() {
		var item = {
			regex: $( this ).find( "[name='regexText']" ).val(),
			groupNum: $( this ).find( "[name='groupNumText']" ).val(),
			replacement: $( this ).find( "[name='replacementText']" ).val(),
		};
		var errText = $( this ).find( "[name='errText']" );
		if( item.regex.length > 0 && item.groupNum.length > 0 )
		{
			try
			{
				var expr = new RegExp( item.regex, "i" );
				errText.html( "" );
			}
			catch( err ) { errText.html( err.message ); }

			var match = testInput.match( expr );
			if( match && match.length > item.groupNum )
			{
				match[item.groupNum] = item.replacement;
				var result = match.slice( 1 ).join( "" );
				$( "#testOutputText" ).val( result );
				
				if( !isUrlAbsolute( result ))
				{
					$( "#testInputErrorText" ).html( "One of your rewrite rules is removing the protocol (ex. 'http://' from the URL). Are you sure you want to do this?");
				}
				
				foundMatch = true;
				return false;
			}
		}
		else errText.html( "" );
	} );

	if( !foundMatch ) $( "#testOutputText" ).val( "(no match found)" );
}
