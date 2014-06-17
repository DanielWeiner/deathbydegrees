function DeathByDegreesVM () {
	var self = this;
	self.focusedElement = null;
	self.konamiEvents = [];
	self.fromCharacter = ko.observable();
	self.toCharacter = ko.observable();
	self.fromCharacters = ko.observableArray();
	self.toCharacters = ko.observableArray();
	self.connections = ko.observableArray([]);
	self.baconNumber = ko.observable();
	self.toCharacterResult = ko.observable();
	self.fromCharacterResult = ko.observable();
	self.toCharacterResultName = ko.observable();
	self.toCharacter.subscribe(function(newVal) {
		$("#toCharacters").val(newVal);
		var charStr = $.grep(self.toCharacters(), function(val){ return val._id === newVal; })[0].name;
		$("#toCharactersInput").val(charStr)
		self.toCharacterResultName(charStr);
	});
	self.fromCharacterResultName = ko.observable();
	self.fromCharacter.subscribe(function(newVal) {
		$("#fromCharacters").val(newVal);
		var charStr = $.grep(self.fromCharacters(), function(val){ return val._id === newVal; })[0].name;
		$("#fromCharactersInput").val(charStr)
		self.fromCharacterResultName(charStr);

	});
	self.isLoading = ko.observable(false);
	self.fromCharsVisible = ko.observable(false);
	self.toCharsVisible = ko.observable(false);
	self.openToChars = function() {
		var targetEvents = ["up", "up", "down", "down", "left", "right", "left", "right"];
		var matches = true;
		var i;
		if (targetEvents.length === self.konamiEvents.length) {
			for (i = 0; i < targetEvents.length; i++) {
				if (targetEvents[i] !== self.konamiEvents[i]) {
					matches = false;
					break;
				}
			}
		} else {
			matches = false;
		}
		
		if (matches) {
			self.konamiEvents.push("B");
		} else {
			self.konamiEvents = [];
		}
		self.toCharsVisible(true);
		$("#toCharacters").focus();
		var event;
	    event = document.createEvent('MouseEvents');
	    event.initMouseEvent('mousedown', true, true, window);
	    $("#toCharacters")[0].dispatchEvent(event);
	}
	self.openFromChars = function() {
		var targetEvents = ["up", "up", "down", "down", "left", "right", "left", "right", "B"];
		var matches = true;
		var i;
		if (targetEvents.length === self.konamiEvents.length) {
			for (i = 0; i < targetEvents.length; i++) {
				if (targetEvents[i] !== self.konamiEvents[i]) {
					matches = false;
					break;
				}
			}
		} else {
			matches = false;
		}
		
		if (matches) {
			self.konamiEvents.push("A");
		} else {
			self.konamiEvents = [];
		}
		self.fromCharsVisible(true);
		$("#fromCharacters").focus();
		var event;
	    event = document.createEvent('MouseEvents');
	    event.initMouseEvent('mousedown', true, true, window);
	    $("#fromCharacters")[0].dispatchEvent(event);
	}
	$.get('/characters', function(data){
		self.toCharacters(data);
		self.fromCharacters(data);
		var newHTML  ='';
		var i;
		for ( i = 0; i < data.length; i++) {
			newHTML += '<option value="'+ data[i]._id + '">' + data[i].name + '</option>';
		}
		var autoCompSource  = $.map(data, function(val){
			return {label: val.name, value: val._id};
		});

		$('#toCharacters').html(newHTML);
		$('#fromCharacters').html(newHTML);
		$('#fromCharacters').change(function(val){
			var _id = Number($(this).val());
			self.fromCharacter(_id);
			self.fromCharsVisible(false);
		});
		$('#toCharacters').change(function(val){
			var _id = Number($(this).val());
			self.toCharacter(_id);
			self.toCharsVisible(false);
		});
		$('#fromCharactersInput').autocomplete({source: autoCompSource, minLength: 2, 
			select: function(event, ui) {
				event.preventDefault();
				$('#fromCharactersInput').val(ui.item.label);
				self.fromCharacter(ui.item.value);}, 
			focus: function (event, ui) {
				event.preventDefault();
				$('#fromCharactersInput').val(ui.item.label);
				$(self.focusedElement).css({background: 'cyan'});
				self.focusedElement = event.firstChild;
				$(self.focusedElement).css({background: 'blue'});
		}}).focus(function() {
			$(this).val('');
		}).blur(function() {
			if ($(this).val() === '') {
				var name = $("#fromCharacters option[value="+self.fromCharacter()+"]").html();
				$(this).val(name);
			}
		});
		$('#toCharactersInput').autocomplete({source: autoCompSource, delay: 500, minLength: 2, 
			select: function(event, ui) {
				event.preventDefault();
				$('#toCharactersInput').val(ui.item.label);
				self.toCharacter(ui.item.value);}, 
			focus: function (event, ui) {
				event.preventDefault();
				$('#toCharactersInput').val(ui.item.label);
		}}).focus(function() {
			$(this).val('');
		}).blur(function() {
			if ($(this).val() === '') {
				var name = $("#toCharacters option[value="+self.toCharacter()+"]").html();
				$(this).val(name);
			}
		});
		self.toCharacter($.grep(data, function(val){ return val.name == "Nina Williams";})[0]._id);
		self.fromCharacter(data[Math.floor(Math.random() * data.length)]._id);
		$('#fromCharactersInput').val("Enter Name here...");
	});
	self.randomPath = function () {
		var rand1 = self.toCharacters()[Math.floor(Math.random() * self.toCharacters().length)]._id;
		var rand2 = self.toCharacters()[Math.floor(Math.random() * self.toCharacters().length)]._id;
		self.toCharacter(rand1);
		self.fromCharacter(rand2);
		self.findPath();
	}
	self.startBtn = function() {
		var targetEvents = ["up", "up", "down", "down", "left", "right", "left", "right", "B", "A"];
		var matches = true;
		var i;
		if (targetEvents.length === self.konamiEvents.length) {
			for (i = 0; i < targetEvents.length; i++) {
				if (targetEvents[i] !== self.konamiEvents[i]) {
					matches = false;
					break;
				}
			}
		} else {
			matches = false;
		}
		
		if (matches) {
			$('html, body').animate({ scrollTop: 0 }, 0);
			$("#mainHeader").html("I bet you think you're so clever.")
			self.konamiEvents = [];
		} else {
			self.konamiEvents = [];
			self.findPath();
		}
		
	}
	self.findPath = function(){
		self.isLoading(true);
		$.post('/findPath', {fromCharacter: self.fromCharacter(), toCharacter: self.toCharacter()}, function(data){
			var connArray = [];
			
			if (data.baconNumber === 0) {
				self.toCharacterResult(self.toCharacter());
				self.fromCharacterResult(self.fromCharacter());
				var charName = self.fromCharacterResultName();
				connArray.push(charName + " is " + charName +"!");
				self.toCharacterResult()
			} else if (!data.found) {
				// self.baconNumber(data.baconNumber);
				// self.fromCharacterResult(data.connections[0].characterID1);
				// self.toCharacterResult(data.connections[0].characterID2);
			} else {
				var i;
				connArray.push(data.characters[0]);
				for (i = 0; i < data.games.length; i++) {
					connArray.push("in");
					connArray.push(data.games[i]);
					connArray.push("with");
					connArray.push(data.characters[i+1]);
				}
			}	
			if (data.found) {
				var baconText = data.characters[0] + " is " + data.baconNumber 
				+ " step" + (data.baconNumber === 1? "" : "s") + " removed from " + data.characters[data.characters.length-1].replace(/\.$/, '')
				+ "." +(data.baconNumber > 6? ".. for now." : ""); 
				self.animateText(self.baconNumber, baconText, 60);	
				self.connections(connArray);
			} else {
				var baconText = self.toCharacterResultName().replace(/&quot;/g, '"') + " is farther than 6 steps removed from " + self.fromCharacterResultName().replace(/&quot;/g, '"') 
				+ "... for now."; 
				self.animateText(self.baconNumber, baconText, 60);
				self.connections([]);
			}
			
		}).always(function() {
			self.isLoading(false);
		});
	}
	self.animateText = function(variable, text, time, len) {
		if (typeof len === 'undefined' || len === null) {
			len = 1;
		}
		if (text.charAt(len - 1) === " ") {
			len++;
		}
		variable(text.substr(0, len));

		if (len < text.length) {
			setTimeout(function(){self.animateText(variable, text, time, len+1);}, time);
		} 
	}

}

$(function(){
	window.vm = new DeathByDegreesVM();
	window.onkeydown = function(event) {
		var konamiCode = ["up", "up", "down", "down", "left", "right", "left", "right", "B", "A", "start"];
		var currentSeq = vm.konamiEvents;
		var i;
		var matches = true;
		for (i=0; i < currentSeq.length; i++) {
			if (currentSeq[i] !== konamiCode[i]) {
				matches = false;
				break;
			}
		}
		if (!matches) {
			vm.konamiEvents = [];
		}
		if (event.keyCode === 38) {
			vm.konamiEvents.push("up");
		} else if (event.keyCode === 40) {
			vm.konamiEvents.push("down");
		}  else if (event.keyCode === 37) {
			vm.konamiEvents.push("left");
		} else if (event.keyCode === 39) {
			vm.konamiEvents.push("right");
		} else {
			vm.konamiEvents.push("WRONG");
		}
	};
	ko.applyBindings(vm);
});
