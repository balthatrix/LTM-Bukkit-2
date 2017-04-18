'use strict';

/** Constants **/
var ARMOR_STAND = org.bukkit.entity.EntityType.ARMOR_STAND;
var POSE_ELEMENTS = ['body', 'head', 'larm',
    'rarm', 'lleg', 'rleg'];
var POSE_FUNCTIONS = ['setBodyPose', 'setHeadPose', 'setLeftArmPose',
    'setRightArmPose', 'setLeftLegPose', 'setRightLegPose'];

var EQUIP_ELEMENTS = ['head', 'body', 'legs', 'boot', 'hand'];
var EQUIP_FUNCTIONS = ['setHelmet', 'setChestplate', 'setLeggings', 
	'setBoots', 'setItemInHand'];


	
	
	
var SteveBot = function (name, loc, initial_pose, animation, desires, tiny, baseplate, arms) {
    this.name = name;
    this.loc = loc;
    this.pose = initial_pose;
    this.animation = animation;
    this.desires = desires;

    this.entity = loc.world.spawnEntity(loc, ARMOR_STAND);
	this.entity.setSmall(tiny);
	this.entity.setBasePlate(baseplate);
    this.entity.setArms(arms);
	if (name) {
		this.entity.setCustomName(name);
		this.entity.setCustomNameVisible(true);
	}
    this.setPose(this.pose);
    this.animate();
    this.tick();
};

SteveBot.prototype.setName = function (name) { 
	this.name = name; 
};

SteveBot.prototype.setAnimation = function(animation) {
    this.animation = animation;
};

SteveBot.prototype.getName = function() { return this.name; };

SteveBot.prototype.setPose = function (poseObj) {
   if (!poseObj && !(poseObj instanceof Pose))
     return;
   var pose = poseObj.getPose();
   var equip = poseObj.getEquip();

   //this loop will call
   //entity.setBodyPose(EulerAngle pose from pose obj);
   //entity.setHeadPose.... etc
   //only if pose['element'] exists
   for (var i = 0; i < POSE_ELEMENTS.length; i++) {
       if (POSE_ELEMENTS[i] in pose)
           this.entity[POSE_FUNCTIONS[i]](pose[POSE_ELEMENTS[i]]);   
   }
   //similar loop, calling the equip functions
   for (var i = 0; i < EQUIP_ELEMENTS.length; i++) {
       if (EQUIP_ELEMENTS[i] in equip) {
           ///console.log("trying to use func entity."+EQUIP_FUNCTIONS[i]+"("+equip[EQUIP_ELEMENTS[i]]+")");
		   this.entity[EQUIP_FUNCTIONS[i]](equip[EQUIP_ELEMENTS[i]]);
       }
   }
};

SteveBot.prototype.setDesires = function (desires) {
    this.desires = desires;
};
/** here is the desire system in all it's glory
  * if any desire returns true, all other lower priority desires are not run
**/
SteveBot.prototype.tick = function () {
    if (this.entity.isValid()) {
        for (var desire in this.desires) {
            if (desire(this))
                break;
        }
        var futurebot = this;
        setTimeout(function(){ futurebot.tick() }, 50); //each SteveBot ticks every minecraft tick
    }
};

SteveBot.prototype.addDesire = function (desire, priority) {
   //cap desire prioirty at lowest of other desires
   if (priority > this.desires.length)
      priority = this.desires.length;
   //insert into an array position while preserving other elements
   this.desires.splice(priority, 0, desire);

};

SteveBot.prototype.animate = function () {
    if (this.entity.isValid()) {
		if (this.animation && this.animation instanceof Animation) {
    		var frame = this.animation.nextFrame();
            var futurebot = this;
			setTimeout(
				function() { 
					futurebot.setPose(frame[1]);
					futurebot.animate();
				},
				frame[0]
			);
		}
	}

};

SteveBot.prototype.getEntity = function() { return entity; };




SteveBot.prototype.moveTo = function (endLocation) {
    var startLocation = this.entity.getLocation();

    function isLocationWalkable(loc) { 
        return server.getPluginManager().getPlugin("ThoughtStem").isLocationWalkable(loc);
    }

    var brokenCount = 0;
    /* Travel downwards until block is walkable.*/
    while (!isLocationWalkable(startLocation)) {
        //took too long to find a walkable location
        if (brokenCount > 30) {
            console.log("Broke trying to find starting location");
            return;
        }
        console.log(startLocation);
        console.log(isLocationWalkable(startLocation));
        startLocation = startLocation.subtract(0, 1, 0);
        brokenCount++;
    }
    brokenCount = 0;
    while (!isLocationWalkable(endLocation)) {
        //took too long to find a walkable locatio
        if (brokenCount > 30) {
            console.log("Broke trying to find ending location");
            return;
        }
        endLocation = endLocation.subtract(0, 1, 0);
        brokenCount++;
    }
    /* construct the astar pathfinder, and get the tiles from it.*/
    var astar = server.getPluginManager().getPlugin("ThoughtStem").newAStar(startLocation, endLocation, 700);
    try {
        var tiles = astar.iterate(); 
    } catch (err) {
        return; //either startLocation, endLocation was not walkable, or range difference was too much
    }

    //conversion to js array instead of java ArrayList
    for (var i = 0; i < tiles.size(); i++) {
        var t = tiles.get(i); 
        t.getLocation(startLocation).getBlock().setType(org.bukkit.Material.DIAMOND_BLOCK);
    }

    var path = [];
    for (var i = 0; i < tiles.size(); i++)
        path[i] = tiles.get(i);

    /*
     * Move logic:
     *
     *   - We have an ArrayList of walkable tiles, starting with the tile we are standing on
     *     and ending with the tile we want to be on
     *
     *   - At any time, the next tile will only be +/- 1 y. If +1 y, we need to jump. Regardless,
     *     we need to move toward the next tile with a certain velocity.
     *
     *   - Main loop: 
     *       let currentTile = tile we are standing on
     *       while (currentTile != path's end) {
     *          let currentTile = tile we are standing on
     *          let nextTile = path[ path.indexOf(currentTile) + 1] //the next tile in the path
     *          velo.x,z = nextTile - currentTile
     *          if nextTile.y > currentTile.y
     *              velo.y = ++;
     *          apply velocity
     *      }
     *
     */

    var currentLocation = this.entity.getLocation();

    //Sub function, used to get the closest path tile from any location
    function closestPathTile(loc) {
        var shortest_dist = 10000;
        var shortest_tile_index = 0
        for (var i = 0; i < path.length; i++) {
            if (loc.distanceSquared(path[i].getLocation(startLocation)) < shortest_dist) {
                shortest_dist = loc.distanceSquared(path[i].getLocation(startLocation));
                shortest_tile_index = i;
            }
        }
        console.log("Shortest tile to location was tile: "+shortest_tile_index);
        return shortest_tile_index;
    }

    var futurebot = this;
    function movementTick() { 
        currentLocation = futurebot.entity.getLocation();
        var nextTile = path [ closestPathTile(currentLocation) + 2 ]; //get next tile in path

        var velovec = nextTile.getLocation(startLocation).toVector().toBlockVector().subtract(currentLocation.toVector().toBlockVector());

        if (nextTile.getLocation(startLocation).getBlockY() > currentLocation.subtract(0,1,0).getBlockY())
            velovec.setY(1.2); //set the Y to a jump 

        console.log("Applying velocity: "+velovec);
        futurebot.entity.setVelocity(velovec);
        if (closestPathTile(currentLocation) != path.length - 1) {
            setTimeout(movementTick, 50);
        }
    }
    movementTick();
};

/**
 * Consturctor for a new Pose object.
 * 
 * parameter: pose
 *  A json object containing: (all optional)
 *  {
 *     'body' : angle,
 *     'head' : angle,
 *     'larm' : angle,
 *     'rarm' : angle,
 *     'lleg' : angle,
 *     'rleg' : angle,
 *  }
 * 
 *  equip: a json object:
    {
		'head': ItemStack
		'body': ItemStack
		'legs': ItemStack
		'boot': ItemStack
		'hand': ItemStack
	}
 */
var Pose = function(pose, equip) {
    this.pose = pose;
    this.equip = equip;
};

Pose.prototype.getPose = function() { return this.pose; };

Pose.prototype.getEquip = function() { return this.equip; };


/**
 * Animation constructor.
 *
 * Parameters: 
 *   pose_array : object of form [ [pose, delayToNext], [pose, delayToNext]...]
 */
var Animation = function(pose_array) {
    this.poses = pose_array;
    this.frame = 0;
};

Animation.prototype.nextFrame = function() {
	if (this.poses.length > 1) {
        //if the current frame is the last frame, reset the frame counter
        this.frame++;
    	if (this.frame == this.poses.length)
     	   this.frame = 0;
        //return the delay (if greater than 0, else 1000) and the pose itself, and increment the frame counter
    	return [
			(this.poses[this.frame][1] && this.poses[this.frame][1] > 0) ? this.poses[this.frame][1] : 1000,
			this.poses[this.frame][0]
		];
	} else {
		return [1000, this.poses[0][0]]
	}
};



exports.Animation = Animation;
exports.Pose = Pose;
exports.SteveBot = SteveBot;
exports.angle = function (x,y,z) {
    return new org.bukkit.util.EulerAngle(x,y,z);
}
exports.skull = function (playername) {
    var skul = new org.bukkit.inventory.ItemStack(org.bukkit.Material.SKULL_ITEM, 1, 3);
    var meta = skul.getItemMeta();
    if (playername instanceof org.bukkit.entity.Player)
        meta.setOwner(playername.getName());
    else
        meta.setOwner(playername);
    skul.setItemMeta(meta);
    return skul;
};
exports.entities = function (entity, range, types) {
    var nearby = entity.getNearbyEntities(range*2, range*2, range*2);
    var result = [];
    for (var i = 0; i < nearby.size(); i++) {
        if (types != null && types instanceof Array) {
            for (var j = 0; j < types.length; j++) {
                if (nearby.get(i).getType().equals(types[j]))
                    result.push(nearby.get(i));
            }
        } else if (types != null) {
            if (nearby.get(i).getType().equals(types))
                result.push(nearby.get(i));
        }
        else {
            result.push(nearby.get(i));
        }
    }
    return result;
};
