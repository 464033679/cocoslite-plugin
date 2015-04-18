/*jslint vars: true, plusplus: true, devel: true, nomen: true, regexp: true, indent: 4, maxerr: 50 */
/*global define */

require.config({
    paths: {
        "text" : "lib/text",
        "i18n" : "lib/i18n"
    },
    locale: brackets.getLocale()
});


define(function (require, exports, module) {
    "use strict";

    var ExtensionUtils = brackets.getModule("utils/ExtensionUtils"),
        UrlParams      = brackets.getModule("utils/UrlParams").UrlParams,
        PreferencesManager = brackets.getModule("preferences/PreferencesManager"),
        NodeDomain     = brackets.getModule("utils/NodeDomain");

    function initNodeDomain() {
        window.cocosDomain = new NodeDomain("cocos", ExtensionUtils.getModulePath(module, "node/CocosDomain"));
    }

    function initEditor() {

        var modules;

        if(brackets.editorType === brackets.EditorType.GameEditor) {
            modules = ["thirdparty/vue",
                    "cocos2d-js/frameworks/cocos2d-html5/CCBoot",
                    "core/Cocos",
                    "core/ObjectManager",
                    "core/Hierarchy",
                    "core/Inspector",
                    "core/Undo",
                    "core/ComponentManager",
                    "core/Selector",
                    "core/Project",
                    "core/MenusManager",
                    "core/GameEditor",
                    
                    "editor/EditorManager",
                    "editor/SceneEditor",
                    "editor/MeshEditor",
                    "editor/Control2D"];

            initNodeDomain();
        }
        else if(brackets.editorType === brackets.EditorType.IDE) {
            modules = ["ide/ide",
                       "ide/ChromeConnect"];
        }

        require(modules);
    }

    function hackBrackets() {

        function initEditorType() {
            brackets.EditorType = {
                GameEditor : "GameEditor",
                IDE : "IDE",
                All : "all"
            }

            var params = new UrlParams();
        
            // read URL params
            params.parse();

            var type = params.get("editorType");
            brackets.editorType = type ? type : "GameEditor";
            brackets.config.app_title += (brackets.platform === "mac" ? " \u2014 " : " - ") + brackets.editorType;

            if(appshell.app.focus) {
                window.focus = appshell.app.focus;
            }
        }

            
        function hackPreferencesManager() {
            var PREFS_NAME          = "mainView.state";

            var originSetViewState = PreferencesManager.setViewState;
            PreferencesManager.setViewState = function() {
                if(arguments[0] === PREFS_NAME) {
                    arguments[0] = PREFS_NAME + "." + brackets.editorType;
                }
                originSetViewState.apply(this, arguments);
            }

            var originGetViewState = PreferencesManager.getViewState;
            PreferencesManager.getViewState = function() {
                if(arguments[0] === PREFS_NAME) {
                    arguments[0] = PREFS_NAME + "." + brackets.editorType;
                }
                return originGetViewState.apply(this, arguments);
            }
        }

        initEditorType();
        hackPreferencesManager();
    }

    hackBrackets();
    initEditor();
});
