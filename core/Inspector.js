/*jslint vars: true, plusplus: true, devel: true, nomen: true, regexp: true, indent: 4, maxerr: 50 */
/*global define, cl*/

define(function (require, exports, module) {
    "use strict";

	var Resizer 	   = brackets.getModule("utils/Resizer");

    var ObjectManager  = require("core/ObjectManager"),
    	EventManager   = require("core/EventManager"),
    	Undo 		   = require("core/Undo"),
    	EditorManager  = require("editor/EditorManager"),
    	Vue            = require("thirdparty/Vue"),
    	html    	   = require("text!html/Inspector.html");


    var $content = $(html);
    $content.insertAfter(".content");

    var $inspector    = $content.find(".inspector");
    var $addComponent = $content.find(".add-component");

    Resizer.makeResizable($content, Resizer.DIRECTION_HORIZONTAL, Resizer.POSITION_LEFT, 250);

    $content.on("panelResizeUpdate", onResize);

	var currentObject = null, tempObject = null;
	var showing = false;

	function width() {
		return $content.width();
	}

	function onResize() {
        $(".main-view .content").css({"right": width() + "px"});
        cc.view._resizeEvent();
	}

	function show(speed){
		showing = true;

		if(speed === undefined) {
            speed = 500;
        }
        
		$content.css({"right":"0px"});
		$(".main-view .content").css({"right": width() + "px"});
        
        if(cc.view) {
        	cc.view._resizeEvent();
        }
	}

	function hide(speed){
		showing = false;

		if(speed === undefined) {
            speed = 500;
        }

		$content.css({"right":-$content.width()+"px"});
		$(".main-view .content").css({"right": "0px"});
		
		if(cc.view) {
			cc.view._resizeEvent();
		}
	}
	
	function bindInput(input, obj, key){
		obj._inspectorInputMap[key] = input;

		input.value = obj[key];
		input.innerChanged = false;

		input.finishEdit = function(){
			Undo.beginUndoBatch();

			if(input.updateValue) {
                input.updateValue();
            }
            
			input.innerChanged = true;

			var newValue = input.realValue ? input.realValue : input.value;

			if(obj.constructor === Array) {
				obj.set(key, newValue); 
                
				if(obj.valueChanged) {
                    obj.valueChanged();
                }
			}
			else {
                obj[key] = newValue;
            }

			input.innerChanged = false;

			Undo.endUndoBatch();
		};
	}

	function createInputForArray(array, $input){
		for(var i=0; i<array.length; i++){
			var $item = $("<div class='array-item'>");
			$item.append($("<span class='number'>#"+i+"</span>"));
			
			createInput(array, i, $item, true);
            
			$input.append($item);
		}
	}

	function createInputForDefaultValue(obj, key, value) {

		var $input = null;
  		
		if(typeof value === 'boolean'){
  			$input = $('<span class="check value" v-on="click: onClick">');
            $input.addClass('{{checked ? "fa-check" : "fa-square-o"}}');

            var vue = new Vue({
                el: $input[0],
                data: {
                    checked: false
                },
                methods: {
                    onClick: function() {
                        $input.checked = this.checked = !this.checked;
                        $input.finishEdit();
                    }
                }
            });

            cl.defineGetterSetter($input, "value", function(){
                return $input.checked;
            }, function(val){
                vue.$data.checked = $input.checked = val;
            });
		}

  		else {
  			$input = $("<span><input></span>");
  			var input = $input.find('input')[0];

  			if(typeof value === 'string') {
                input.setAttribute('type', 'text');
            }
	  		else if(typeof value === 'number') {
  				$input.updateValue = function(){
  					this.realValue = parseFloat(this.value);
  				};
  			}

  			input.onkeypress = function(event){
	  			if(typeof $input.finishEdit === 'function' && event.keyCode === 13) {
	            	$input.finishEdit();
	            }
	  		};

	  		input.onblur = function(event){
	  			if(typeof $input.finishEdit === 'function'){
	  				if($input.updateValue) {
	                    $input.updateValue();
	                }
	  				if($input.realValue !== obj[key]) {
	                    $input.finishEdit();
	                }
	  			}    
	  		};

			cl.defineGetterSetter($input, "value", function(){
				return input.value;
			}, function(val){
				input.value = val;
			});
  		}

		return $input;
	}

	function createInputForObject(obj, key, value) {
		var $input = null;

		if(value.constructor === cl.Point){
			/*jshint multistr: true */
            $input = $("<span>\
						<span style='width:50%;margin-right:2px;float:left;display:block;overflow:hidden;'><input class='x-input'></span>\
					    <span style='display:block;overflow:hidden;'><input class='y-input'></span>\
					    </span>");
			var xInput = $input.find('.x-input')[0];
			var yInput = $input.find('.y-input')[0];

			cl.defineGetterSetter($input, "value", function(){
				var x = parseFloat(xInput.value);
					var y = parseFloat(yInput.value);
					return cl.p(x, y);
			}, function(val){
				xInput.value = val.x;
				yInput.value = val.y;
			});

			$input.find("input").each(function(i, e){
				this.onkeypress = function(event){
		  			if(typeof $input.finishEdit === 'function' && event.keyCode === 13) {
                        $input.finishEdit();
                    }
		  		};

		  		this.onblur = function(event){
		  			if(typeof $input.finishEdit === 'function'){
		  				if($input.updateValue) {
                            $input.updateValue();
                        }
		  				if($input.value.x !== obj[key].x || $input.value.y !== obj[key].y) {
                            $input.finishEdit();
                        }
		  			}
		  		};
			});
		} 
		else if(value.constructor  === Array){
			value._inspectorInputMap = {};

			$input = $("<div class='array'>");
			
			createInputForArray(value, $input);

			value._inspectorInput = $input;
		}

		return $input;
	}

	function createInput(obj, key, el, discardKey){
		var $input;
		var value = obj[key];

		var editors = EditorManager.getOrderedEditors();
		for(var i=0; i<editors.length; i++) {
			var editor = editors[i];

			if(editor.createInput) {
				try{
					$input = editor.createInput(obj, key, value);
				}
				catch(err) {
					console.log("Editor [%s] crateInput failed : ", editor.name, err);
				}

				if($input) {
					break;
				}
			}
		}

		if($input) {
			// need do nothing
		}
		else if(typeof value !== 'object') {
			$input = createInputForDefaultValue(obj, key, value);
		}
		else {
			$input = createInputForObject(obj, key, value);
		}
		
		if($input){
			bindInput($input, obj, key);
		}
		else {
			$input = $('<span></span>');
		}

		if(!discardKey) {
			// Change first letter to upper case
			var temp = key.substring(0,1).toUpperCase();
			temp += key.substring(1,key.length);

			var $key = $('<span class="key">'+temp+'</span>');
			el.append($key);
		}

		$input.addClass("value");
		el.append($input);
	}

	function initComponentUI(component){
		component._inspectorInputMap = {};

		var el = $('<div>');
		el.appendTo($inspector);
		el.attr('id', component.classname);
		el.addClass('component');

		var title = $('<div class="component-title">'+component.classname+'</div>');
		el.append(title);

		var icon = $('<span class="fa-caret-down indicate">');
		title.append(icon);

		var settings = $('<span class="fa-cog settings">');
		title.append(settings);

		var content = $('<div class="component-content">');
		el.append(content);

		title.click(function() {

			if(content.is(':visible')) {
				icon.removeClass('fa-caret-down');
				icon.addClass('fa-caret-right');
			} else {
				icon.addClass('fa-caret-down');
				icon.removeClass('fa-caret-right');
			}

			content.toggle();
		});

		var ps = component.properties;
		for(var k=0; k<ps.length; k++){
			var p = ps[k];
			
			var row = $('<div class="row">');
			content.append(row);
			
			createInput(component, p, row);
		}
	}

	function initObjectUI(obj){
		var cs = currentObject.components;
		if(!cs) {
            return;
        }

		for(var key in cs){
			initComponentUI(cs[key]);
		}
	}

	function handleSelectedObject(event, objs){
		clear();

		var obj = objs[0];
		if(!obj) {
            return;
        }

		currentObject = obj;

		// $addComponent.show();
		initObjectUI(obj);
	}

	function handleComponentAdded(event, component) {
		var target = component.getTarget();
		if(target !== currentObject) {
            return;
        }

		initComponentUI(component);
	}

	function handleObjectPropertyChanged(event, o, p) {
		if(!o._inspectorInputMap) {
			return;
		}

		if(o.constructor === Array && p===""){
			if(o._inspectorInput.innerChanged) {
                return;
            }
			o._inspectorInput.empty();

			createInputForArray(o, o._inspectorInput);
			
			return;
		}
		var input = o._inspectorInputMap[p];
		if(input && !input.innerChanged) {
            input.value = o[p];
        }
	}


	function clear() {
		currentObject = null;
		$inspector.empty();
		$addComponent.hide();
	}

	EventManager.on(EventManager.SELECT_OBJECTS,          handleSelectedObject);
	EventManager.on(EventManager.COMPONENT_ADDED,         handleComponentAdded);
	EventManager.on(EventManager.OBJECT_PROPERTY_CHANGED, handleObjectPropertyChanged);
	EventManager.on(EventManager.SCENE_CLOSED,            clear);

	exports.show  = show;
	exports.hide  = hide;
	exports.clear = clear;
	exports.__defineGetter__("showing", function(){
		return showing;
	});
});