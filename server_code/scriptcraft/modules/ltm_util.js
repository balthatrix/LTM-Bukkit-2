'use strict';
/*global __plugin, org, Packages, module, exports*/
var entities = {},
  entitytypes,
  t, i, name;
if (__plugin.bukkit) {
  entitytypes = org.bukkit.entity.EntityType.values();
}
if (__plugin.canary) {
  entitytypes = Packages.net.canarymod.api.entity.EntityType.values();
}

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
