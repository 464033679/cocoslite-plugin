/*jslint vars: true, plusplus: true, devel: true, nomen: true, regexp: true, indent: 4, maxerr: 50 */
/*global define*/

define(function (require, exports, module) {
    "use strict";

    var Menus        = brackets.getModule("command/Menus"),
    	Commands     = brackets.getModule("command/Commands"),
    	AppInit      = brackets.getModule("utils/AppInit");
    var EditorType   = brackets.EditorType;

    var EventManager = require("core/EventManager");

    var _gameEditorMenus = {};
    var _persistentMenus = {};

    var _currentFocusWindow = EditorType.GameEditor;

    function registerEditorMenus(type, menuIDs, commands) {
    	var menus = [];

    	function pushCommands(menuID, commands) {
			if(!Array.isArray(commands)) {
				commands = [commands]
			} 

			commands.forEach(function(command) {
				menus.push({menuID:menuID, command:command});
			});
    	}

    	if(Array.isArray(menuIDs)) {
    		menuIDs.forEach(function (pairs) {
    			pushCommands(pairs[0], pairs[1]);
			})
    	}
    	else if(Array.isArray(commands)) {
    		pushCommands(menuIDs, commands);
    	}
    	else {
    		menus.push({menuID:menuIDs, command:commands});
    	} 


    	for(var i in menus) {
    		var menuID  = menus[i].menuID;
    		var command = menus[i].command;

    		var menu = getMenu(type, menuID);

	    	if(command && menu.indexOf(command) === -1) {
	    		menu.push(command);
	    	}
    	}
    }

    function getMenus(type) {
    	var menus = {};

    	if(type === EditorType.GameEditor) {
    		menus = _gameEditorMenus;
    	} else if(type === EditorType.All) {
    		menus = _persistentMenus;
    	}

    	return menus;
    }

    function getMenu(type, id) {
 		var menus = getMenus(type);

    	if(!menus[id]) {
    		menus[id] = [];

    		if(type === _currentFocusWindow) {
    			setMenuHidden(id, false);
    		}
    	}
    	return menus[id];
    }

    function setMenuHidden(id, hidden) {
	    brackets.app.setMenuHidden(id, hidden, function (err) {
            if (err) {
                // console.error("setMenuHidden() -- id not found: " + id + " (error: " + err + ")");
            }
        });
    }

    function setAllMenuHidden(hidden) {

		// hide all menu
		var menuMap = Menus.getAllMenus();
		for(var id in menuMap) {
            setMenuHidden(id, hidden);

            var menu = menuMap[id];
            var menuItems = menu.menuItems;
            for(var menuItemID in menuItems) {
            	var item = menuItems[menuItemID];
	    		var id;

	    		if(item.isDivider) {
	    			id = item.dividerId;
	    		}
	    		else {
	    			var command = item.getCommand();
		    		if(!command) { 
		    			continue; 
		    		}
		    		id = command.getID();
	    		}

	            setMenuHidden(id, hidden);
            }
		}
    }

    function setGameEditorMenusHidden(hidden) {
    	setEditorMenusHidden(EditorType.GameEditor, hidden);
    }

	function setPersistentEditorMenusHidden(hidden) {
    	setEditorMenusHidden(EditorType.All, hidden);
    }

    function setEditorMenusHidden(type, hidden) {
    	var menus = getMenus(type);

    	for(var menuID in menus) {

			var menuMap = Menus.getAllMenus();
			var menu = menuMap[menuID];

			var realMenuItemIDs = menu.menuItems;
    		var menuItemIDs = menus[menuID];

    		if(Object.keys(realMenuItemIDs).length === Object.keys(menuItemIDs).length || hidden === false) {
    			setMenuHidden(menuID, hidden);
    		}

    		menuItemIDs.forEach(function(item) {
    			setMenuHidden(item, hidden);
    		})
    	}
    }

    function handleIDEFocus() {
    	_currentFocusWindow = EditorType.IDE;

    	setAllMenuHidden(false);
    	setGameEditorMenusHidden(true);
    	setPersistentEditorMenusHidden(false);
    }

    function handleGameEditorFocus() {
    	_currentFocusWindow = EditorType.GameEditor;

    	setAllMenuHidden(true);
    	setGameEditorMenusHidden(false);
    	setPersistentEditorMenusHidden(false);
    }

    function hackMenus() {
		var originRemoveMenu = Menus.removeMenu;
    	Menus.removeMenu = function(id) {
    		originRemoveMenu.apply(this, arguments);

    		delete _gameEditorMenus[id];
    	}

        var originAddMenuDivider = Menus.Menu.prototype.addMenuDivider;
        Menus.Menu.prototype.addMenuDivider = function (position, relativeID) {
            var item = originAddMenuDivider.apply(this, arguments);

            if(_currentFocusWindow === EditorType.GameEditor) {
                setMenuHidden(item.dividerId, true);
            }

            return item;
        }

        Menus.Menu.prototype.addGameEditorMenuDivider = function (position, relativeID) {
            var item = originAddMenuDivider.apply(this, arguments);
            var command = item.dividerId;

            var menu = getMenu(EditorType.GameEditor, this.id);
            menu.push(command);

            if(_currentFocusWindow === EditorType.GameEditor) {
                setMenuHidden(command, false);
            }

            return item;
        }

    	var originAddMenuItem = Menus.Menu.prototype.addMenuItem;
    	Menus.Menu.prototype.addMenuItem = function(command, keyBindings, position, relativeID) {
    		var item = originAddMenuItem.apply(this, arguments);

            if(_currentFocusWindow === EditorType.GameEditor) {
                setMenuHidden(command, true);
            }

    		return item;
    	}

    	Menus.Menu.prototype.addGameEditorMenuItem = function(command, keyBindings, position, relativeID) {
    		var item = originAddMenuItem.apply(this, arguments);

    		var menu = getMenu(EditorType.GameEditor, this.id);
	    	menu.push(command);

            if(_currentFocusWindow === EditorType.GameEditor) {
                setMenuHidden(command, false);
            }

    		return item;
    	}

    	Menus.Menu.prototype.addAllEditorMenuItem = function(command, keyBindings, position, relativeID) {
    		var item = originAddMenuItem.apply(this, arguments);

    		var menu = getMenu(EditorType.All, this.id);
	    	menu.push(command);

    		return item;
    	}

    	var originRemoveMenuItem = Menus.Menu.prototype.removeMenuItem;
    	Menus.Menu.prototype.removeMenuItem = function(command) {
    		originRemoveMenuItem.apply(this, arguments);

    		var menu = getMenu(this.id);
    		var index = menu.indexOf(command);
    		if(index !== -1) {
    			menu.slice(index, 1);
    		}
    	}
    }

    function initMenus() {
        var menus = [
            [Menus.AppMenuBar.FILE_MENU, [
                Commands.FILE_OPEN,
                Commands.FILE_CLOSE,
                Commands.FILE_CLOSE_ALL,
                Commands.FILE_SAVE,
                Commands.FILE_SAVE_ALL,
                Commands.FILE_SAVE_AS
            ]],
            [Menus.AppMenuBar.EDIT_MENU, [
                Commands.EDIT_UNDO,
                Commands.EDIT_REDO,
                Commands.EDIT_CUT,
                Commands.EDIT_COPY,
                Commands.EDIT_PASTE,
                Commands.EDIT_SELECT_ALL
            ]],
            ["debug-menu", [
                "debug.switchLanguage"
            ]]
        ]
        registerEditorMenus(EditorType.All, menus);

        var menu = Menus.getMenu(Menus.AppMenuBar.FILE_MENU);
        menu.addGameEditorMenuDivider(Menus.AFTER, Commands.FILE_CLOSE_ALL);

        menu = Menus.getMenu(Menus.AppMenuBar.EDIT_MENU);
        menu.addGameEditorMenuDivider(Menus.AFTER, Commands.EDIT_REDO);
        menu.addGameEditorMenuDivider(Menus.AFTER, Commands.EDIT_PASTE);
    }

	function init() {

        // hack Menu functions
        hackMenus();

        // init menus
        initMenus();

        // refresh menus
		handleGameEditorFocus();
    };

    init();
    
    window.addEventListener('focus', handleGameEditorFocus);
    EventManager.on(EventManager.IDE_FOCUS,    handleIDEFocus);

});
