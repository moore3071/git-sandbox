var shell = Josh.Shell();

shell.setCommandHandler("hello", {
	exec: function(cmd, args, callback) {
		var arg = args[0] || '';
		var response = "who is this " + arg + " you are talking to?";
		if(arg === 'josh') {
			response = 'pleased to meet you.';
		} else if(arg === 'world') {
			response = 'world says hi.';
		} else if(!arg) {
			response = 'who are you saying hello to?';
		}
		callback(response);
	},
	completion: function(cmd, arg, line, callback) {
		callback(shell.bestMatch(arg, ['world', 'josh']));
	}
});

shell.setCommandHandler("ls", {
	exec: function(cmd, args, callback) {
		var arg = args[0] || '';
		var response = "boot usr bin home tmp";
		if(!!arg)
			response = "ls: cannot access '"+arg+"': no such file or directory";
		callback(response);
	},
	completion: function(cmd, arg, line, callback) {
		console.log(shell.bestMatch(arg, ['bin', 'boot', 'usr', 'home', 'tmp']));
		callback(shell.bestMatch(arg, ['bin', 'boot', 'usr', 'home', 'tmp']));
	}
});

shell.setCommandHandler("args", {
	exec: function(cmd, args, callback) {
		callback(args.toString());
	},
	completion: function(cmd, arg, line, callback) {
		console.log('cmd: '+cmd+' arg: '+arg+' line: '+line);
		callback({completion: 'mein leiben', suggestions: []});
	}
});

shell.activate();
