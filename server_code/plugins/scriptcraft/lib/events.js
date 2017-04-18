'use strict';
/************************************************************************
## events Module

The Events module provides a thin wrapper around Bukkit's
Event-handling API.  Bukkit's Events API makes use of Java Annotations
which are not available in Javascript, so this module provides a
simple way to listen to minecraft events in javascript.

### events.on() static method

This method is used to register event listeners. 

#### Parameters


 * eventName - A string or java class. If a string is supplied it must
   be part of the Bukkit event class name.  See [Bukkit API][buk] for
   details of the many bukkit event types. When a string is supplied
   there is no need to provide the full class name - you should omit
   the 'org.bukkit.event' prefix. e.g. if the string
   "block.BlockBreakEvent" is supplied then it's converted to the
   org.bukkit.event.block.BlockBreakEvent class .
 
   If a java class is provided (say in the case where you've defined
   your own custom event) then provide the full class name (without
   enclosing quotes).

 * callback - A function which will be called whenever the event
   fires. The callback should take 2 parameters, listener (the Bukkit
   registered listener for this callback) and event (the event fired).

 * priority (optional - default: "HIGHEST") - The priority the
   listener/callback takes over other listeners to the same
   event. Possible values are "HIGH", "HIGHEST", "LOW", "LOWEST",
   "NORMAL", "MONITOR". For an explanation of what the different
   priorities mean refer to bukkit's [Event API Reference][buk2].

#### Returns

An org.bukkit.plugin.RegisteredListener object which can be used to
unregister the listener. This same object is passed to the callback
function each time the event is fired.

#### Example:

The following code will print a message on screen every time a block is broken in the game

```javascript
events.on( 'block.BlockBreakEvent', function( listener, evt ) { 
    evt.player.sendMessage( evt.player.name + ' broke a block!');
} );
```

To handle an event only once and unregister from further events...

```javascript    
events.on( 'block.BlockBreakEvent', function( listener, evt ) { 
    evt.player.sendMessage( evt.player.name + ' broke a block!');
    evt.handlers.unregister( listener );
} );

To unregister a listener *outside* of the listener function...

```javascript    
var myBlockBreakListener = events.on( 'block.BlockBreakEvent', function( l, e ) { ... } );
...
var handlers = org.bukkit.event.block.BlockBreakEvent.getHandlerList();
handlers.unregister(myBlockBreakListener);
```

To listen for events using a full class name as the `eventName` parameter...

```javascript    
events.on( org.bukkit.event.block.BlockBreakEvent, function( listener, evt ) { 
    evt.player.sendMessage( evt.player.name + ' broke a block!');
} );
```

[buk2]: http://wiki.bukkit.org/Event_API_Reference
[buk]: http://jd.bukkit.org/dev/apidocs/index.html?org/bukkit/event/Event.html

***/

var bkEventPriority = org.bukkit.event.EventPriority,
  bkEventExecutor = org.bukkit.plugin.EventExecutor,
  bkRegisteredListener = org.bukkit.plugin.RegisteredListener,
  bkEventPackage = 'org.bukkit.event.';


exports.when = function(eventType, handler, player, guard, priority ) {
  if(guard == undefined)
    guard = true
  console.log("*****Registering an event....")
  var guardedHandler = function(e) {
      if (guard) {
        if (e.player && e.player.name != player.name) return;
      }
      try {
          var unqOrigName = eventType.split(".")[1]
          var arr = e.toString().split(".")
          var actual = arr[arr.length - 1].split("@")[0]
          if (unqOrigName != actual) return;
      } catch(err) {
      //in case an error happens, call handler
        handler(e);
        console.log("******ERR, " + err)
      }
      handler(e);
  }
  var handlerList,
    listener = {},
    eventExecutor;

  if ( typeof priority == 'undefined' ) {
    priority = bkEventPriority.HIGHEST;
  } else {
    priority = bkEventPriority[priority.toUpperCase()];
  }
  if ( typeof eventType == 'string' ) {
    if ( typeof Java != 'undefined' ) {
        console.log("*****METHOD 1 of getting handler list...")
      handlerList = java.lang.Class.forName(bkEventPackage + eventType).getMethod("getHandlerList").invoke(null);
    } else {
        console.log("*****METHOD 2 of getting handler list...")
      eventType = eval( bkEventPackage + eventType );
      handlerList = eventType.getHandlerList();
    }
  }
  console.log("*****handlerList: ", handlerList)
  console.log(handlerList.toString())
  console.log(eventType);
  eventExecutor = new bkEventExecutor( ) {
    execute: function( l, e ) {
      guardedHandler( e );
    } 
  };
  /* 
   wph 20130222 issue #64 bad interaction with Essentials plugin
   if another plugin tries to unregister a Listener (not a Plugin or a RegisteredListener)
   then BOOM! the other plugin will throw an error because Rhino can't coerce an
   equals() method from an Interface.
   The workaround is to make the ScriptCraftPlugin java class a Listener.
   Should only unregister() registered plugins in ScriptCraft js code.
   */
  listener.reg = new bkRegisteredListener( __plugin, eventExecutor, priority, __plugin, false );
  handlerList.register( listener.reg );
  if (player && global.playerevents) {
      if (!global.playerevents[player.name])
          global.playerevents[player.name] = []

      var unregister = function(){
            handlerList.unregister( listener.reg );
      };

      global.playerevents[player.name].push(unregister)
  }
  return listener.reg;
};

exports.on = function( 
  /* String or java Class */
  eventType, 
  /* function( registeredListener, event) */ 
  handler,   
  /* (optional) String (HIGH, HIGHEST, LOW, LOWEST, NORMAL, MONITOR), */
  priority,
  player  ) {
  var handlerList,
    listener = {},
    eventExecutor;

  if ( typeof priority == 'undefined' ) {
    priority = bkEventPriority.HIGHEST;
  } else {
    priority = bkEventPriority[priority.toUpperCase()];
  }
  if ( typeof eventType == 'string' ) {
    /*
     Nashorn doesn't support bracket notation for accessing packages. 
     E.g. java.net will work but java['net'] won't. 
     
     https://bugs.openjdk.java.net/browse/JDK-8031715
     */
    if ( typeof Java != 'undefined' ) {
      // nashorn environment
      eventType = Java.type( bkEventPackage + eventType );
    } else {
      eventType = eval( bkEventPackage + eventType );
    }
  }
  handlerList = eventType.getHandlerList( );
  handlerList = getHandlerListForEventType (eventType);
  eventExecutor = new bkEventExecutor( ) {
    execute: function( l, e ) {
      handler( listener.reg, e );
    }
  };
  /* 
   wph 20130222 issue #64 bad interaction with Essentials plugin
   if another plugin tries to unregister a Listener (not a Plugin or a RegisteredListener)
   then BOOM! the other plugin will throw an error because Rhino can't coerce an
   equals() method from an Interface.
   The workaround is to make the ScriptCraftPlugin java class a Listener.
   Should only unregister() registered plugins in ScriptCraft js code.
   */
  listener.reg = new bkRegisteredListener( __plugin, eventExecutor, priority, __plugin, false );
  handlerList.register( listener.reg );
  if (player && global.playerevents) {
      if (!global.playerevents[player.name])
          global.playerevents[player.name] = []

      var unregister = function(){
            handlerList.unregister( listener.reg );
      };

      global.playerevents[player.name].push(unregister)
  }
  return listener.reg;
};
