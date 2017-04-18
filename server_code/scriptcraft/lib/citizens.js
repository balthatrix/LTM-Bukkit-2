'use strict';

var CITIZENS = server.pluginManager.getPlugin("Citizens");
var NPC_REGISTRY = CITIZENS.getNPCRegistry();
global.user_npcs = [
        /* user-spawned NPCs will be added here*/
    ];
var events = {
    NavigationBeginEvent : Packages.net.citizensnpcs.api.ai.event.NavigationBeginEvent,
    NavigationCancelEvent : Packages.net.citizensnpcs.api.ai.event.NavigationCancelEvent,
    NavigationCompleteEvent : Packages.net.citizensnpcs.api.ai.event.NavigationCompleteEvent,
    NavigationReplaceEvent : Packages.net.citizensnpcs.api.ai.event.NavigationReplaceEvent,
    NavigationStuckEvent : Packages.net.citizensnpcs.api.ai.event.NavigationStuckEvent,
    NPCSpawnEvent : Packages.net.citizensnpcs.api.ai.event.NPCSpawnEvent,
    NPCCollisionEvent : Packages.net.citizensnpcs.api.ai.event.NPCCollisionEvent,
    NPCCombustEvent : Packages.net.citizensnpcs.api.ai.event.NPCCombustEvent,
    NPCCreateEvent : Packages.net.citizensnpcs.api.ai.event.NPCCreateEvent,
    NPCDamageByBlockEvent : Packages.net.citizensnpcs.api.ai.event.NPCDamageByBlockEvent,
    NPCDamageByEntityEvent : Packages.net.citizensnpcs.api.ai.event.NPCDamageByEntityEvent,
    NPCDeathEvent : Packages.net.citizensnpcs.api.ai.event.NPCDeathEvent,
    NPCLeftClickEvent : Packages.net.citizensnpcs.api.ai.event.NPCLeftClickEvent,
    NPCRightClickEvent : Packages.net.citizensnpcs.api.ai.event.NPCRightClickEvent
}
var citizen = function (entityType, name, spawn_loc, invuln) {

    if (!entityType) entityType = org.bukkit.entity.EntityType.PIG;
    if (!name) name = "";
    if (!spawn_loc) spawn_loc = org.bukkit.Bukkit.getWorlds()[0].getSpawnLocation();
    if (typeof invuln == "undefined") invuln = true;
    
    var npc = NPC_REGISTRY.createNPC(entityType, name);
    var spawn = npc.spawn(spawn_loc);
    if (!spawn) {
        console.log("Could not spawn NPC... "+name);
        return;
    }

    npc.setProtected(invuln); //sets if NPC is invulnerable
    user_npcs.push(npc);
    return npc;
};

var registerNPCEvent = function (npc, func, eventType) {
    var eventHandler = function(event) {
            if (event == null || event.getNPC() != npc)
                return;
            func();
    };
    events.on(eventType, eventHandler);
};

var goalConstructor = function (g) { 
    var goal = new Packages.net.citizensnpcs.api.ai.Goal(g); 
    return goal; 
};

exports.citizen = citizen;
exports.registerNPCEvent = registerNPCEvent;
exports.events = events;
exports.goal = goalConstructor;
