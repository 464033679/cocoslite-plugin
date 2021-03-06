define(function (require, exports, module) {
    "use strict";

    /**
     * List of constants for global command IDs.
     */

    exports.CMD_OPEN_SCRIPT                 = "cl.openScript";                   
    exports.CMD_OPEN_IDE                    = "cl.openIDE";
    exports.CMD_NEW_PROJECT                 = "cl.createProject";
    exports.CMD_NEW_SCENE_UNTITLED          = "cl.createScene.untitled";
    exports.CMD_NEW_SCENE                   = "cl.createScene";
    exports.CMD_PROJECT_SETTINGS            = "cl.projectSettings";

    exports.CMD_GAME_OBJECT                 = "cl.gameObject";
    exports.CMD_COMPONENT                   = "cl.component";
    exports.CMD_NEW_EMPTY_GAME_OBJECT       = "cl.gameObject.new";
    exports.CMD_NEW_EMPTY_CHILD_GAME_OBJECT = "cl.gameObject.new.child";
    exports.CMD_NEW_EMPTY_COMPONENT         = "cl.component.new";
    exports.CMD_NEW_COMPONENT_IN_PROJECT    = "cl.component.new.in.project";

    exports.CMD_PLAY                        = "cl.play";
    exports.CMD_PAUSE                       = "cl.pause";
    exports.CMD_STEP                        = "cl.step";

    exports.CMD_HIDE_INSPECTOR              = "cl.hide.inspector";

    exports.CMD_SIMULATE                    = "cl.simulate";
});
