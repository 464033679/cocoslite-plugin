/*jslint vars: true, plusplus: true, devel: true, nomen: true, regexp: true, indent: 4, maxerr: 50 */
/*global define*/

define(function (require, exports, module) {
    "use strict";

    var ProjectManager   = brackets.getModule("project/ProjectManager"),
        CommandManager   = brackets.getModule("command/CommandManager");

    var Commands         = require("core/Commands"),
        EventManager     = require("core/EventManager");

    var _ide           = null;
    var _scriptChanged = false;

    function openIDE () {
        if(!_ide) {
            _ide = window.open(window.location.href+"?editorType=IDE");

            _ide.onbeforeunload = function() {
                _ide = null;
            }

            _ide.addEventListener('focus', function() {
                EventManager.trigger(EventManager.IDE_FOCUS);
            });
        }
        _ide.focus();
    }

    function handleComponentChanged(e, fullPath) {
        try{
            var component = require(fullPath);
            if(!component || !component.Constructor || !component.Params) { return; }

            var constructor = component.Constructor;
            var prototype   = constructor.prototype;
            var _super      = prototype.__proto__;
            var prop        = new component.Params;
            var releaseMode = cc.game.config[cc.game.CONFIG_KEY.classReleaseMode];

            var fnTest = /\b_super\b/;
            var desc = { writable: true, enumerable: false, configurable: true };

            for (var name in prop) {
                var isFunc = (typeof prop[name] === "function");
                var override = (typeof _super[name] === "function");
                var hasSuperCall = fnTest.test(prop[name]);

                if (releaseMode && isFunc && override && hasSuperCall) {
                    desc.value = ClassManager.compileSuper(prop[name], name, classId);
                    Object.defineProperty(prototype, name, desc);
                } else if (isFunc && override && hasSuperCall) {
                    desc.value = (function (name, fn) {
                        return function () {
                            var tmp = this._super;

                            // Add a new ._super() method that is the same method
                            // but on the super-Class
                            this._super = _super[name];

                            // The method only need to be bound temporarily, so we
                            // remove it when we're done executing
                            var ret = fn.apply(this, arguments);
                            this._super = tmp;

                            return ret;
                        };
                    })(name, prop[name]);
                    Object.defineProperty(prototype, name, desc);
                } else if (isFunc) {
                    desc.value = prop[name];
                    Object.defineProperty(prototype, name, desc);
                } else {
                    prototype[name] = prop[name];
                }

                if (isFunc) {
                    // Override registered getter/setter
                    var getter, setter, propertyName;
                    if (constructor.__getters__ && constructor.__getters__[name]) {
                        propertyName = constructor.__getters__[name];
                        for (var i in constructor.__setters__) {
                            if (constructor.__setters__[i] == propertyName) {
                                setter = i;
                                break;
                            }
                        }
                        cc.defineGetterSetter(prototype, propertyName, prop[name], prop[setter] ? prop[setter] : prototype[setter], name, setter);
                    }
                    if (constructor.__setters__ && constructor.__setters__[name]) {
                        propertyName = constructor.__setters__[name];
                        for (var i in constructor.__getters__) {
                            if (constructor.__getters__[i] == propertyName) {
                                getter = i;
                                break;
                            }
                        }
                        cc.defineGetterSetter(prototype, propertyName, prop[getter] ? prop[getter] : prototype[getter], prop[name], getter, name);
                    }
                }
            }

        }
        catch(e) {
            console.log(e);
        }
    }

    function handleEditorChanged(fullPath) {
        var init = require(fullPath).init;
        
        if(init) {
            init();
        }
    }

    function handleBeforeScriptChanged() {
        _scriptChanged = true;
    }

    function handleScriptChanged(e, fullPath, scriptErr) {
        _scriptChanged = false;

        if(scriptErr) { return; }

        if(fullPath.indexOf("/Editor/") === -1) {
            handleComponentChanged(e, fullPath);
        } else {
            handleEditorChanged(fullPath);
        }
    }


    function handleOpenScript(fullPath) {
        if(!_ide) {

            openIDE();

            _ide.initIDE = function(module) {
                _ide = module;
                _ide.openFile(fullPath);

                _ide.on("beforeScriptChanged", handleBeforeScriptChanged);
                _ide.on("_scriptChanged", handleScriptChanged);
            };

        } else {
            _ide.openFile(fullPath);
        }
    }

    function handleWindowClose() {
        if(_ide) {
            _ide.close();
        }
        _ide = null;
    }

    function hackGameObject() {

        var originUpdate = cl.GameObject.prototype.update;
        cl.GameObject.prototype.update = function(dt) {
            if(_scriptChanged) { return; }

            try{
                originUpdate.call(this, dt);
            }
            catch(e){
                console.log("[GameObject.update]"+e);
            }
        }

    }


    CommandManager.register("OpenScript", Commands.CMD_OPEN_SCRIPT, handleOpenScript);
    CommandManager.register("IDE", Commands.CMD_OPEN_IDE, openIDE);

    ProjectManager.on("projectOpen", hackGameObject),

    window.addEventListener('beforeunload', handleWindowClose);
});
