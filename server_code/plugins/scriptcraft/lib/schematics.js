'use strict';

exports.copy = function(name){
  var ts = server.getPluginManager().getPlugin("ThoughtStem");
  ts.saveSchematic(name, self)
}

exports.paste = function(name, loc){

  var ts = server.getPluginManager().getPlugin("ThoughtStem")


  //BEGIN Make function for generating schematic file with a particular name, like this:
  ts.cleanupSchematic(name)
//  var file = new File("schems/"+name+".ltmschem")
//  if(file.exists())
//    file.delete()
  //END Make routine for generating schematic file with a particular name


  //this starts the download I guess?
  ts.fetchSchematic(name)

  var the_name = name
  var me = self
  var waitForDownload = setInterval(function(){

    //BEGIN make a function which
    //1) checks if the file exists... returns false if it doesn't
    //2) reads the file line by line, and returns the raw json string.
    //json = ts.getSchemJsonData(the_name)
    //if(!json) {
    // broadcast and return....
    //}

    if(!ts.fileExists("schems/"+the_name+".ltmschem"))
    {
      broadcast(the_name)
      broadcast("Downloading schematic...")
      return
    }

    broadcast("Download complete.  Building...")
    clearInterval(waitForDownload)

    var code = ts.readFrom("schems/"+the_name+".ltmschem")

    var data = JSON.parse(code)

    var start = new org.bukkit.Location(loc.world, loc.x, loc.y, loc.z)
    var drone = new Drone(me,start)

    for(var i = 0; i < data.length; i++){
      var d = data[i]

      var name = d["name"]
      var meta = 0
      if(name.match(/:/)){
        meta = parseInt(name.split(":")[1])
        name = name.split(":")[0]
      }

      //broadcast("Building " + name.toUpperCase())

        try{
          var id = eval("org.bukkit.Material."+name.toUpperCase())


          var block = loc.world.getBlockAt(start.x + d["x"], start.y + d["y"], start.z + d["z"] )
          block.setType( id )
          block.setData( meta )
        } catch(e){
          e.printStackTrace()
        }
    }

    broadcast("Build complete.")
  }, 1000)
}
