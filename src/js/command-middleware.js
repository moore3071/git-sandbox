var shell = Josh.Shell();
var Fs = require('./filesystem');

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

}
function git_branch(args, callback) {

}
function git_checkout(args, callback) {

}
function git_clean(args, callback) {

}
function git_commit(args, callback) {

}
function git_log(args, callback) {

}
function git_merge(args, callback) {

}
function git_mv(args, callback) {

}
function git_pull(args, callback) {

}
function git_push(args, callback) {

}
function git_reset(args, callback) {

}
function git_revert(args, callback) {

}
function git_status(args, callback) {

}
function git_remote(args, callback) {
	if(!args) {
		
	} else if(args[0]==='add') {

	} else if(args[0]==='rename') {

	} else if(args[0]==='remove') {

	} else {

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
