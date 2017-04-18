//var File = java.io.File,
//    FileReader = java.io.FileReader,
//    BufferdReader = java.io.BufferedReader;

var store = {},
    bkBukkit = org.bukkit.Bukkit

var droneStore = {store: {}}

var files = {}
var last_error = {}
function loadModsForOnlinePlayers() {
    //spigot
    //console.log("Trying to load mods for online players.");
    java.io = false;
    File = false;
    FileReader = false;
    BufferedReader = false;
    FileWriter = false;
    PrintWriter = false;

    try {
        java.io = false;
        global.File = false;
        global.FileReader = false;
        global.BufferedReader = false;
        global.FileWriter = false;
        global.PrintWriter = false;
    } catch (err) {
        console.log("Err while overwriting file packages: " + err)
    }
    var ts = bkBukkit.getServer().getPluginManager().getPlugin("ThoughtStem");

    //try {

        for (var j = 0; j < bkBukkit.getServer().getOnlinePlayers().length; j++) {
            var player_name = bkBukkit.getServer().getOnlinePlayers()[j].getName();

            ts.prepareModFolderFor(player_name);

            //replaced with the above routine
//            var dir = new File();  //user's script dir
//
//            if (!dir.exists()) {
//                dir.mkdirs(); //make it if it doesn't exist
//            }

            var fnameList = ts.listFiles("scripts/"+player_name);

            //console.log("here is the code dir for  " + player_name, fnameList)
            for (var i = 0; i < fnameList.length; i++) //iterate over the files in scripts/user
            {
                var codeStr = ts.readFrom("scripts/"+player_name+"/"+fnameList[i]);
                //console.log("here is the code for " + fnameList[i]+": " +codeStr);
                tryToLoadMod(codeStr, fnameList[i], player_name);
            }
        }
    //} catch (err) {
    //    console.log("err in loadModsForOnlinePlayers: ", err)
    //}


    //if (bkBukkit.getServer().getOnlinePlayers() instanceof java.util.Collection) {
  //      console.log("Detected a spigot instance. Num of players online: "+bkBukkit.getServer().getOnlinePlayers().size());

//    } else {
//        //console.log("Detected a bukkit instance. Num of players online: "+bkBukkit.getServer().getOnlinePlayers().length);
//        for (var j = 0; j < bkBukkit.getServer().getOnlinePlayers().length; j++) {
//            var player_name = bkBukkit.getServer().getOnlinePlayers()[j].getName();
//            var dir = new File("scripts/"+player_name)  //user's script dir
//            if (!dir.exists()) {
//                dir.mkdirs(); //make it if it doesn't exist
//            }
//            for (var i = 0; i < dir.listFiles().length; i++) //iterate over the files in scripts/user
//            {
//                var file = dir.listFiles()[i]
//
//                tryToLoadMod(file, player_name)
//            }
//        }
//    }
}

function tryToLoadMod(modstr, modFname, player_name){
    //console.log("Loading mod "+modFname+" for " + player_name)
    if (typeof player(player_name) === 'undefined') {
        console.log("Player_name: "+player_name+" was not found");
        return
    }


    var code = modstr
    code = transformCode(code, player_name)

    var mod_name = modFname
    mod_name = mod_name.substr(0, mod_name.length() - 3) //cut off the .js

  
    if(alreadyLoadedMod(player_name, mod_name, code)){
      //console.log("Already loaded " + mod_name + " for " + player_name)
      return;
    }
    
    //console.log("Loading " + mod_name + " for " + player_name)


    /* event and interval registers and flushes */
    try {
        clearIntervalsAndEvents(player_name)
        /*eval all their code...tell them if an error occurred*/
        var playerNameTemp = player_name
        if (!isNaN((''+player_name)[0])) {//if the first character is a number
            player_name = 'a' + player_name
        }
        eval("if(typeof("+player_name+") == \"undefined\") "+ player_name + "= {}") //initalize their namespace
        //eval("if("+player_name+" == undefined) {"+player_name + "={}; }") //initalize their namespace

        eval(player_name+"."+mod_name+" = new function(){" + code + "}")
        player_name = playerNameTemp
        registerModAsLoaded(player_name, mod_name, code);
        var message = org.bukkit.ChatColor.translateAlternateColorCodes('@', '@eMod loaded (' + mod_name + ')')
        player(player_name).sendMessage(message) //send a message letting them know their mod has been loaded
    } catch (e) {
        if (last_error[player_name] != mod_name) {
            player(player_name).sendMessage("There was an error with your code ("+mod_name+"): " + e.message)
            player(player_name).sendMessage("Line: "+ (e.lineNumber - injectedNames(player_name).length))
            last_error[player_name] = mod_name; 
        }
    }
}
function registerModAsLoaded(player_name, mod_name, code) {
    var playerModName = player_name+"/"+mod_name //proper js namespace of mod e.g. thoughtstem/mod1

    files[playerModName] = code;

}
function alreadyLoadedMod(player_name, mod_name, code){
    //console.log("Checking if already loaded " + mod_name + " for " + player_name)

    var playerModName = player_name+"/"+mod_name //proper js namespace of mod e.g. thoughtstem/mod1

    /* DUPE CODE CHECK....*/
    if (files[playerModName] && (files[playerModName] == code)) {
        return true;
    }
    else {
        return false
    }
}

function readCodeFrom(file){
  var buffered = new BufferedReader(new FileReader(file)); //initalize BR

  var code = ""
  var line = null
  while ( (line = buffered.readLine()) !== null ) {
      code += line + '\n';
  }
  buffered.close(); //close the FR

  return code
}

function injectedNames(player_name){
    return ["var Bukkit = org.bukkit.Bukkit;\n",
        "var ItemStack = org.bukkit.inventory.ItemStack;\n",
        "var ShapedRecipe = org.bukkit.inventory.ShapedRecipe;\n",
        "var Material = org.bukkit.Material;\n",
        "var EntityType = org.bukkit.entity.EntityType;\n",
        "var world = player('"+player_name+"').location.world;\n",
        "var citizens = require('citizens');\n",
        "var particle = require('particle');\n",
        "var armorstand = require('ltm_util');\n", //Legacy support
        "var schematics = require('schematics');\n",
        "var world = player('"+player_name+"').location.world;\n",
        "var world = player('"+player_name+"').location.world;\n",
        "var me = player('"+player_name+"');\n",
        "setInterval(function() { me = player('"+player_name+"'); }, 3000);\n",
        "var PotionEffect = org.bukkit.potion.PotionEffect;\n",
        "var PotionEffectType = org.bukkit.potion.PotionEffectType;\n"
    ]
}

function transformCode(code, player_name){
    code = code.replace(/function main(\d*)\((.*)\)/g,"this.main$1 = function($2)")


    return injectedNames(player_name).join("") + code
}

function clearIntervalsAndEvents(name){
  if (global.playerevents[name]) {
      if (global.playerevents[name].length > 0) {
          for (var i = 0; i < global.playerevents[name].length; i++) {
              global.playerevents[name][i].unregister() 
          }
          global.playerevents[name] = []
      }
  }
  if (global.intervals[name]) {
      if (global.intervals[name].length > 0) {
          for (var i = 0; i < global.intervals[name].length; i++) {
              clearInterval(global.intervals[name][i])
          }
          global.intervals[name] = []
      }
  }
}

var _onPlayerCommand = function( event ) {
    var message = event.getMessage();
    
    if (event.getMessage().indexOf("/reset") == 0) {
        refresh()
        return; // break out
    }

    if(event.getMessage().indexOf("/js") == 0)
    {
        var playerName = undefined
        if(event.getMessage().indexOf(" ") < event.getMessage().indexOf("."))
           playerName = event.getMessage().substring(event.getMessage().indexOf(" "), event.getMessage().indexOf(".")).trim();

        if(!playerName) return

        if (!isNaN((''+playerName)[0])) {
            playerName = 'a'+playerName;
        }

        modName = message.substring(message.indexOf(playerName) + playerName.length);
        modName = modName.replace(".main()", "");
        modName = modName.replace(";", "").trim();
        if (eval(playerName) == undefined || eval(playerName+"."+modName) == undefined) {
            event.player.sendMessage(org.bukkit.ChatColor.translateAlternateColorCodes('#', '#4Sorry, there was a problem running your mod. Please try logging out and in, and hitting the Mod button again.'));
            event.setCancelled(true);
            return;
        }
        
    }

    var result = bkBukkit.dispatchCommand( event.player, event.getMessage().substr(1) );

    if(result)
    {
        broadcast(event.player.getName() + " ran a command: " + message)
    }

    event.setCancelled(true);
};

var broadcast = function(msg){
    var players = server.onlinePlayers;
    var player;
    var i;
    for ( i = 0; i < players.length; i++ ) {
        player = players[i];
        player.sendMessage( msg );
    }
}

var setMeta = function(key, val, x, y, z){
    var loc;
    
    if(!y)
      loc = x + "@" + y + "@" + z;
    else
      loc = x;

    if(!droneStore.store[loc])
      droneStore.store[loc] = {};

    droneStore.store[loc][key] = val
}

var getMeta = function(key, x, y, z){
    var loc;
    
    if(!y)
      loc = x + "@" + y + "@" + z;
    else
      loc = x;

    if(!droneStore.store[loc] || !droneStore.store[loc][key])
      return undefined

    return droneStore.store[loc][key]
}

var player = function(name) {
    if (bkBukkit.getServer().getOnlinePlayers() instanceof java.util.Collection) {
        for (var i = 0;i < bkBukkit.getServer().getOnlinePlayers().size(); i++){ 
            if(bkBukkit.getServer().getOnlinePlayers().get(i).name == name)
                return bkBukkit.getServer().getOnlinePlayers().get(i);
        } 
    } else {
        for (var i = 0;i < bkBukkit.getServer().getOnlinePlayers().length; i++){ 
            if(bkBukkit.getServer().getOnlinePlayers()[i].name == name)
                return bkBukkit.getServer().getOnlinePlayers()[i];
        } 
    }
}


//Deprecated.  Used to use this to keep track of different player intervals.  Now it's just an alias. 
var interval = function(player, ref, time){
  
  setInterval(ref,time)
}

exports.broadcast = broadcast;
exports.player = player;
exports.setMeta = setMeta;
exports.getMeta = getMeta;

var _startGame = function( ) {
    console.log("****Game started")
    //events.on( 'player.PlayerCommandPreprocessEvent', _onPlayerCommand );


    //global.plots = {}
    global.playerevents = {} 
    global.intervals = {} 

    console.log("****Starting mod load interval")
    setInterval(loadModsForOnlinePlayers, 1000)
};


var grabbed
exports.load = function(name){
    var http = require('http/request');
    var s = self
        var url = "http://localhost/programs/"+ self.name +"-" + name + ".txt"
        var last = undefined
        //setInterval(function(){
        http.request(url,function(responseCode, responseBody){
            if(responseBody != last)
        {
            last = responseBody
            try{
                eval(s.name+" = new function(){" + responseBody + "}")
            } catch(e) {
                s.sendMessage("There was an error with your code: " + e.message)
            s.sendMessage("Line: "+ e.lineNumber)
            }
        }
        });
    //}, 3000);
}



/*
   start the game automatically when this module is loaded.
   */
_startGame();
