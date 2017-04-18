//'use strict';                                                                   
/*global require, echo,__plugin, module*/                                         
var blocks = require('blocks');                                                   
                                                                                  
function mob( monster ) {                                                         
    //Summon entity type at mob location                                          
    if (typeof monster == 'undefined' ) { //if they used no params                
        monster = "PIG"; //default to pig                                         
    }                                                                             
    var spawnLoc = new org.bukkit.Location(this.world, this.x, this.y, this.z);   
    try {                                                                         
        var spawnType = org.bukkit.entity.EntityType.valueOf(monster);            
    } catch(e) {                                                                  
        spawnType = org.bukkit.entity.EntityType.valueOf("PIG"); //default        
    }                                                                             
    if (spawnType.isSpawnable())                                                  
        this.world.spawnEntity( spawnLoc, spawnType );                            
    return this;                                                                  
}                                                                                 
                                                                                  
module.exports = function(Drone){                                                 
  Drone.extend(mob)                                                               
}; 
