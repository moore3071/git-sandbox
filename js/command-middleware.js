var Fs = require('./filesystem');

var history = Josh.History();
var readline = new Josh.ReadLine({history: history});
var shell = Josh.Shell({readline: readline, history: history});

var pathhandler = new Josh.PathHandler(shell);

var gfs = new Fs.GitFileSystem();

pathhandler.current = gfs.root;

//Sort of like our getopts
function indexFlags(args) {
	var results = [];
	var re = /^\s*-/i;
	for(var i=0; i<args.length; i++) {
		if(re.test(args[i]))
			results.push(i);
	}
	return results;
}

//Josh.js doesn't treat quotes correctly, this should suffice until it's added
function makeStrings(args) {
	var start, end, content;
	for(var i =0; i<args.length; i++) {
		if(!start && args[i].indexOf("'")===0) {
			start = i;
			content = args[i].substr(1);
		} else if(start && args[i].charAt([args[i].length-1])==="'") {
			end = i;
			content += ' '+args[i].substring(1,args[i].length);
			args.splice(start, end-start+1, content);

			start = undefined;
			end = undefined;
		}
		else if(start) {
			content += ' '+args[i];
		}
	}
	if(start) {
		throw new Error('Uncompleted string in arguments');
	}
}

shell.setCommandHandler("edit", {
	exec: function(cmd, args, callback) {
		//TODO make a div with an input box with args[0] content if it's a valid file and two buttons 'cancel' and 'save and close'
	}
});

var gitSubCommands = ['init', 'add', 'branch', 'checkout', 'clean', 'commit', 'log', 'merge', 'mv', 'pull', 'push', 'reset', 'revert', 'status', 'remote'];

shell.setCommandHandler("git", {
	exec: function(cmd, args, callback) {
		if(args===undefined) {
			git_help([], callback);
		}
		try {
			makeStrings(args);
		} catch(e) {
			callback(e.message);
			return;
		}
		var c = args.shift();
		switch(c) {
			case 'init': git_init(args, callback); break;
			case 'add': git_add(args, callback); break;
			case 'branch': git_branch(args, callback); break;
			case 'checkout': git_checkout(args, callback); break;
			case 'clean': git_clean(args, callback); break;
			case 'commit': git_commit(args, callback); break;
			case 'log': git_log(args, callback); break;
			case 'merge': git_merge(args, callback); break;
			case 'mv': git_mv(args, callback); break;
			case 'pull': git_pull(args, callback); break;
			case 'push': git_push(args, callback); break;
			case 'reset': git_reset(args, callback); break;
			case 'revert': git_revert(args, callback); break;
			case 'rm': git_rm(args, callback); break;
			case 'status': git_status(args, callback); break;
			case 'remote': git_remote(args, callback); break;

			case '--version': git_version(args, callback); break;
			case '--help': git_help(c, args, callback); break;
			default: git_unknown(callback);
		}
	},
	completion: function(cmd, arg, line, callback) {
		shell.bestMatch(arg, gitSubCommands);
	}
});

function git_init(args, callback) {
	var result, silent = false;
	//Catch the quiet flag(s) #yes, git init lets you use it multiple times
	if(args.includes('--quiet') || args.includes('-q')) {
		silent = true;
		while(args.includes('--quiet')) { 
			args.splice(args.indexOf('--quiet'),1);
		}
		while(args.includes('-q')) {
			args.splice(args.indexOf('-q'),1);
		}
	}
	var opts = indexFlags(args);
	if(opts.length>0) {
		callback('Unrecognized flag to git init: `'+opts[0]+'`. If this is a proper git init flag, then consider making a PR to git sandbox');
	}
	try {
		result = filler();//Call the function here
	} catch(e) {
		callback(e.message);
		return;
	}
	if(silent) {
		callback();
	} else {
		callback(result);
	}
}
function git_add(args, callback) {
	var flags = {};
	var options = indexFlags(args);
	for(var i = options.length-1; i>=0; i--) {
		switch(args[options[i]]) {
			case('-A'):
			case('--all'):
			case('--no-ignore-removal'):
				flags.all = true;
				break;
			default:
				throw new Error('Unrecognized flag to git add: `'+args[options[i]]+'`. If this is a proper git add flag, then consider making a PR to git sandbox');
		}
		//Options can be deleted at the end since none take arguments
		args.splice(options[i],1);
	}
	try {
		gfs.stage(args, flags); //TODO implement stage in filesystem
	} catch(e) {
		callback(e.message);
	}
}
function git_rm(args, callback) {
	var flags = {};
	var options = indexFlags(args);
	for(var i = options.length-1; i>=0; i--) {
		switch(args[options[i]]) {
			default:
				callback('git remove does not currently accept any flags in git sandbox. Consider making a PR to git sandbox to add flags to git remove');
				return;
		}
	}
	try {
		gfs.removeAndStage(args, flags); //TODO implement remove
	} catch(e) {
		callback(e.message);
	}
}
function git_fetch(args, callback) {
	var flags = {};
	var options = indexFlags(args);
	for(var i = options.length-1; i>=0; i--) {
		switch(args[options[i]]) {
			case('--all'):
				flags.all = true;
				args.splice(options[i],1);
				break;
			default:
				callback('Error: git fetch does not accept the flag `'+args[options[i]]+'` currently. If this is a proper git fetch flag, then consider making a PR to git sandbox');
		}
	}
	try {
		var response = gfs.fetchFromRemotes(args, flags); //TODO implement fetch
		callback(response);
	} catch(e) {
		callback(e.message);
	}
}
function git_branch(args, callback) {
	var flags = {};
	var options = indexFlags(args);
	for(var i = options.length-1; i>=0; i--) {
		switch(args[options[i]]) {
			case('--list'):
				flags.list = true;
				args.splice(options[i],1);
				break;
			case('-m'):
				flags.move = true;
				args.splice(options[i],1);
				break;
			case('-d'):
				flags.delete = true;
				args.splice(options[i],1);
				break;
			default:
				callback('Unrecognized flag to git add: `'+options[i]+'`. If this is a proper git add flag, then consider making a PR to git sandbox');
				return;
		}
	}

	if(Object.keys(flags).length>1) {
		callback('usage: git branch [--list [pattern]]\nor: git branch (-m) [<old>] <new>\nor: git branch (-d) <name>');
		return;
	}

	if(flags.delete) {
		if(args.length===1) {
			gfs.removeBranch(args[0]);
		} else {
			callback('usage: git branch [--list [pattern]]\nor: git branch (-m) [<old>] <new>\nor: git branch (-d) <name>');
		}
	} else if(flags.move) {
		if(args.length===2) {
			gfs.renameBranch(args[0],args[1]);
		} else if (args.length===1) {
			gfs.renameBranch(gfs.getCurrentBranch(),args[0]); //TODO implement these
		} else {
			callback('usage: git branch [--list [pattern]]\nor: git branch (-m) [<old>] <new>\nor: git branch (-d) <name>');
		}
	} else if(flags.list) {
		if(args.length===1) {
			var re = new RegExp(args[0],'i');
			callback(gfs.listBranches(re)); //TODO implement these methods
		} else {
			callback(gfs.listBranches());
		}
	} else if(args.length===0) {
		callback(gfs.listBranches());
	} else if(args.length===1) {
		try {
			gfs.makeBranch(args[0]); //TODO implement makeBranch
		} catch(e) {
			callback(e.message);
		}
	} else {
		callback('usage: git branch [--list [pattern]]\nor: git branch (-m) [<old>] <new>\nor: git branch (-d) <name>');
		return;
	}
}
function git_checkout(args, callback) {
	var flags = {};
	var options = indexFlags(args);
	for(var i = options.length-1; i>=0; i--) {
		switch(args[options[i]]) {
			case('-b'):
				flags.branch = true;
				args.splice(options[i],1);
				break;
			default:
				callback('Unrecognized flag to git checkout: `'+options[i]+'`. If this is a proper git checkout flag, then consider making a PR to git sandbox');
				return;
		}
	}
	if(flags.branch) {
		try {
			gfs.makeBranch(args[0]);
		} catch(e) {
			callback(e.message);
			return;
		}
	}
	try {
		gfs.setBranch(args[0]); //TODO implement setBranch
	} catch(e) {
		callback(e.message);
	}
}
function git_clean(args, callback) {
	var flags = {};
	var options = indexFlags(args);
	for(var i = options.length-1; i>=0; i--) {
		switch(args[options[i]]) {
			case('-n'):
				flags.dryRun = true;
				args.splice(options[i],1);
				break;
			case('-f'):
				flags.force = true;
				args.splice(options[i],1);
				break;
			case('-d'):
				flags.directories = true;
				args.splice(options[i],1);
				break;
			default:
				callback('Unrecognized flag to git clean: `'+options[i]+'`. If this is a proper git clean flag, then consider making a PR to git sandbox');
				return;
		}
	}
	if(args.length>0) {
		callback('git clean does not currently accept patterns. Consider making a PR to git sandbox implementing this');
	} else {
		callback(gfs.removeUntracked(flags)); //TODO implement removeUntracked
	}
}
function git_commit(args, callback) {
	var flags = {};
	var options = indexFlags(args);
	for(var i = options.length-1; i>=0; i--) {
		switch(args[options[i]]) {
			case('-m'):
				if(args.length<options[i]+2) {
					callback('Error: message needed after `-m` flag');
					return;
				}
				flags.message = args[options[i]+1];
				args.splice(options[i],2);
				break;
			default:
				callback('Unrecognized flag to git commit: `'+options[i]+'`. If this is a proper git commit flag, then consider making a PR to git sandbox');
				return;
		}
	}
	gfs.makeCommitFromStaged(flags); //TODO implement this in filesystem
}
//No pagination in Josh.js makes this tough. Let's fake 'alias' it to git log --reverse
function git_log(args, callback) {
	var flags = {};
	var options = indexFlags(args);
	for(var i = options.length-1; i>=0; i--) {
		switch(args[options[i]]) {
			case('--reverse'):
				flags.reverse = true;
				args.splice(options[i],2);
				break;
			default:
				callback('Git log does not accept any flags in git sandbox yet');
				return;
		}
	}
	if(flags.reverse) {
		callback(gfs.logOutput(flags));
	} else {
		callback('aliased to `git log --reverse`\n'+gfs.logOutput(flags)); //TODO implement logOutput in filesystem
	}
}
function git_merge(args, callback) {
	var flags = {};
	var options = indexFlags(args);
	for(var i = options.length-1; i>=0; i--) {
		callback('Git merge does not accept any flags in git sandbox yet');
		return;
	}
	try {
		gfs.merge(args, flags); //TODO implement merging
	} catch(e) {
		callback(e.message);
	}
}
function git_mv(args, callback) {
	var flags = {};
	var options = indexFlags(args);
	for(var i = options.length-1; i>=0; i--) {
		callback('Git mv does not accept any flags in git sandbox yet');
		return;
	}
	try {
		gfs.moveAndUpdate(args,flags); //TODO implement this
	} catch(e) {
		callback(e.message);
	}
}
function git_pull(args, callback) {
	var flags = {};
	var options = indexFlags(args);
	for(var i = options.length-1; i>=0; i--) {
		callback('Git pull does not accept any flags in git sandbox yet');
		return;
	}
	try {
		gfs.fetchFromRemotes(args, flags); //XXX reference point for fetch and merge
		gfs.merge(args, flags);
	} catch(e) {
		callback(e.message);
	}
}
function git_push(args, callback) {
	var flags = {};
	var options = indexFlags(args);
	for(var i = options.length-1; i>=0; i--) {
		callback('Git push does not accept any flags in git sandbox yet');
		return;
	}
	try {
		gfs.pushToRemote(args, flags); //TODO implement this
	} catch(e) {
		callback(e.message);
	}
}
function git_reset(args, callback) {
	var flags = {};
	var options = indexFlags(args);
	for(var i = options.length-1; i>=0; i--) {
		callback('Git reset does not accept any flags in git sandbox yet');
		return;
	}
	gfs.reset(args, flags); //TODO implement this
}
function git_revert(args, callback) {
	var flags = {};
	var options = indexFlags(args);
	for(var i = options.length-1; i>=0; i--) {
		callback('Git revert does not accept any flags in git sandbox yet');
		return;
	}
	try {
		gfs.undoCommit(args, flags); //TODO implement this
	} catch(e) {
		callback(e.message);
	}
}
function git_status(args, callback) {
	var flags = {};
	var options = indexFlags(args);
	for(var i = options.length-1; i>=0; i--) {
		callback('Git status does not accept any flags in git sandbox yet');
		return;
	}
	callback(gfs.showDiffFromHead()); //TODO implement this method in filesystem
}
function git_remote(args, callback) {
	if(!args) {
		callback(gfs.listRemotes());
	} else if(args[0]==='add') {
		if(args.length!==3) {
			callback('usage: git remote add <name> <url>');
		} else {
			if(gfs.remotes.hasOwnProperty(args[1])) {
				callback('fatal: remote `'+args[1]+'` already exists');
			} else {
				gfs.addRemote(args[1],args[2]); //TODO add this method in filesystem
			}
		}
	} else if(args[0]==='rename') {
		if(args.length!==3) {
			callback('usage: git remote rename <old> <new>');
		} else {
			if(!gfs.remotes.hasOwnProperty(args[1])) {
				callback('fatal: no such remote: `'+args[1]+'`');
			} else if(gfs.remotes.hasOwnProperty(args[2])) {
				callback('fatal: remote `'+args[2]+'` already exists');
			} else {
				gfs.renameRemote(args[1], args[2]);
			}
		}
	} else if(args[0]==='remove') {
		if(args.length!==2) {
			callback('usage: git remote remove <name>');
		} else {
			try {
				gfs.removeRemote(args[1]);
			} catch(e) {
				callback('fatal: no susch remote: `'+args[1]+'`');
			}
		}
	} else {
		callback('error: unrecognized subcommand `'+args[0]+'`');
	}
}
function git_version(args, callback) {
	callback('Based off of Git 2.13.0, but very simplified');
}
function git_help(command, args, callback) {
	//FIXME add data instead of relying solely on git-scm
	switch(command) {
		case 'init': callback("https://git-scm.com/docs/git-init"); break;
		case 'add': callback("https://git-scm.com/docs/git-add"); break;
		case 'branch': callback("https://git-scm.com/docs/git-branch"); break;
		case 'checkout': callback("https://git-scm.com/docs/git-checkout"); break;
		case 'clean': callback("https://git-scm.com/docs/git-clean"); break;
		case 'commit': callback("https://git-scm.com/docs/git-commit"); break;
		case 'log': callback("https://git-scm.com/docs/git-log"); break;
		case 'merge': callback("https://git-scm.com/docs/git-merge"); break;
		case 'mv': callback("https://git-scm.com/docs/git-mv"); break;
		case 'pull': callback("https://git-scm.com/docs/git-pull"); break;
		case 'push': callback("https://git-scm.com/docs/git-push"); break;
		case 'reset': callback("https://git-scm.com/docs/git-reset"); break;
		case 'revert': callback("https://git-scm.com/docs/git-revert"); break;
		case 'status': callback("https://git-scm.com/docs/git-status"); break;
		case 'remote': callback("https://git-scm.com/docs/git-remote"); break;
		default: callback("Available Git commands: "+gitSubCommands.toString()); break;
	}
}
function git_unknown(callback) {
	callback("Unknown command. It's possible this is an actual command in Git, in which "+
		"case feel free to make a PR adding it. If you are looking for a list of "+
		"supported commands, then run `git help`");
}

shell.activate();
