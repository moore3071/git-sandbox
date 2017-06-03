var sha1 = require('sha1');

(function(){
'use strict';

/** This file provides a fake file system for the git repositories. This
 * includes: normal files, directories, git blobs, git commits, and git trees. 
 * @param {string} name the name of the file
 * @throws errors if the input isn't a string
 * @returns {File} a File object with name of name
 */
function File(name, content) {
	if(typeof(name)!=='string') {
		throw new Error("File name must be a string");
	}
	this.name = name;
	if(typeof(content)==='string') {
		this.content = content;
	} else {
		this.content = undefined;
	}
}
File.prototype = {
	/** Set the content of a file to the input string
	 * @param {string} content the content to set
	 */
	setContent: function(content) { this.content = content; },
	/** Get a blob that represents this file's contents
	 * @returns {Blob} A blob representing this.content
	 */
	makeBlob: function() { return new Blob(this.content); }
};

/**Directories have a name and parent. Content consists of a map of
 * <filename,file>. Note that a parent is needed for josh.js to work correctly
 * @param {string} name the name of the directory
 * @param {Directory} [parent_dir=null] the parent of the current directory
 * @throws error if the arguments are malformed
 * @returns {Directory} Directory object with name name and parent parent_dir
 */
function Directory(name, parent_dir) {
	if(typeof(name)!=='string')
		throw new Error('Directory name must be a string');
	this.name = name;
	this.content = {};
	if(parent_dir===undefined || parent_dir instanceof Directory) {
		if(parent_dir instanceof Directory) {
			parent_dir.add(this);
		}
	} else {
		throw new Error('Directory parent must be a directory');
	}
}

Directory.prototype = {

	/** Add a file to the contents of this directory. Accepts a file object
	 * or a name for a new File.
	 * @param {string|File|Directory|Blob|Commit} file the file to be added to this
	 * directory
	 * @throws errors if the input isn't the correct type or content with
	 * this name already exists
	 */
	add: function(file, type) {
		if (typeof(file)==='string') {
			if(typeof(type)==='string' && type=='dir') {
				file = new Directory(file, this);
				return;
			} else {
				file = new File(file);
			}

		}
		if (file instanceof Directory || file instanceof File) {
			if (this.content.hasOwnProperty(file.name)) {
				throw new Error('A file with name "'+file.name+'" already exists');
			} else {
				this.content[file.name] = file;
				if(typeof(this.path)==='string')
					file.path = this.path+'/'+file.name;
			}
		} else if(file instanceof Tree || file instanceof Blob || file instanceof Commit) {
			//File names for blobs, commits, etc, are their hash
			if (this.content.hasOwnProperty(file.hash)) {
				throw new Error('A file with this hash already exists');
			} else {
				this.content[file.hash] = file;
				if(typeof(this.path)==='string')
					file.path = this.path+'/'+file.name;
			}
		} else {
			throw new Error('Only files may be adding to directories');
		}
	},
	/** Remove a file from the contents of this directory and delete it
	 * @param {string} file_name the name of the file to be deleted
	 * @throws errors if the file_name doesn't exist in the dir contents
	 */
	remove: function(file_name) {
		if (this.content.hasOwnProperty(file_name)) {
			delete this.content[file_name];
		} else {
			throw new Error('cannot remove a nonexisting file');
		}
	},
	//TODO
	/** Make a tree from this directory
	 * @returns {Tree} A tree representing this directory
	 */
	makeTree: function() {

	}
};

/** Blobs are like files except they have a hash stored with them. Note that in
 * this implementation blobs' contents are stored as is and no deltas are used.
 * This is meant to be a useable guide and not an honest Git re-implementation
 * @param {string} [content=null] the content of the blob
 * @returns {Blob} A blob object with the specified content
 */
function Blob(content) {
	if(content===undefined) {
		this.content = '';
	} else if(typeof(content)!=='string') {
		throw new Error("Blobs can only be constructed with strings");
	} else {
		this.content = content;
	}
	this.hash = this.Hash();
}
/** Copy a blob recursively so remotes don't interact with the blobs of others
 * @returns {Blob} A blob identical to this
 */
Blob.prototype.copy = function() {
	return new Blob(this.content);
};
/** Copy a blob if it doesn't already exist in a remote, otherwise return the existing remote
 * @param {Map} obj_list a map of objects from a remote
 * @returns {Blob} A Blob identical to this
 */
Blob.prototype.applyToRemote = function(obj_list) {
	if(obj_list.hasOwnProperty(this.hash)) {
		return obj_list[this.hash];
	} else {
		return this.copy();
	}
};
/** Return a hash of the blob using sha1.
 * @returns {string} hash of the object
 */
Blob.prototype.Hash = function() {
	return sha1('blob: '+this.content);
};

/** Trees are like directories except they accept blobs or trees as children and
 * don't have parents.
 * @returns {Tree} A new tree
 */
function Tree() {
	this.content = {};
	this.hash = this.Hash();
}
Tree.prototype = {
	/** Copy a tree recursively so remotes don't interact with the trees of others
	 * @returns {Tree} A tree identical to this
	 */
	copy: function() {
		var result = new Tree();
		var keys = Object.keys(this.content);
		for (var i = 0; i<keys.length; i++) {
			result.content[keys[i]] = this.content[keys[i]].copy();
		}
		result.hash = result.Hash();
		return result;
	},
	/** Copy a tree if it doesn't exist in a remote's objects, otherwise return the existing tree
	 * @param {Map} obj_list a map of objects from a remote
	 * @returns {Tree} A tree identical to this
	 */
	applyToRemote: function(obj_list) {
		if(obj_list.hasOwnProperty(this.hash)) {
			return obj_list[this.hash];
		} else {
			var result = new Tree();
			for(var i in this.content) {
				if(this.content.hasOwnProperty(i)) {
					result.add(i, this.content[i].applyToRemote(obj_list));
				}
			}
			return result;
		}
	},
	/** Adds a blob or tree to this tree's contents if a blob or tree with 
	 * the input's hash doesn't exist.
	 * @param {String} name the name to identify the content by
	 * @param {Tree|Blob} input the Tree or Blob to be added to content
	 * @throws an error if the name isn't a string
	 * @throws an error if the input isn't a tree or blob
	 */
	add: function(name, input) {
		if (typeof(name)!=='string') {
			throw new Error('name must be a string');
		}
		if (input instanceof Blob && input instanceof Tree) {
			throw new Error('contents must be a blob or tree');
		} else if(this.content.hasOwnProperty(name)) {
			throw new Error('content with this hash already exists');
		} else {
			this.content[name] = input;
		}
		this.hash = this.Hash();
	},
	/** Removes a Blob or Tree from this tree's contents
	 * @param {String} hash the hash of the Tree or Blob to be removed
	 * @throws an error if the hash is not a string
	 * @throws an error if there's nothing with this hash in contents
	 */
	remove: function(hash) {
		if (typeof(hash)!==String) {
			throw new Error('argument must be a string');
		} else if(!this.content.hasOwnProperty(hash)) {
			throw new Error('no content with this hash to remove');
		} else {
			delete this.content[hash];
		}
		this.hash = this.Hash();
	},
	/** Return a hash of the tree using sha1.
	 * @returns {string} hash of the object
	 */
	Hash: function() {
		var contentsHash = 'tree: ';
		var keys = Object.keys(this.content).sort();
		for(var i=0; i<keys.length; i++) {
			contentsHash += keys[i]+' '+this.content[keys[i]].hash+' ';
		}
		return sha1(contentsHash);
	},
	/** Check recursively if the hashed object exists in contents
	 * @param {string} hash the hash to check for
	 * @returns {Tree|Blob} the object searched for
	 */
	contains: function(hash) {
		var tmp;
		for(var i in this.content) {
			if(this.content.hasOwnProperty(i)) {
				if(this.content[i].hash===hash) {
					return this.content[i];
				}
				if(this.content[i] instanceof Tree) {
					tmp = this.content[i].contains(hash);
					if(tmp!==undefined) {
						return tmp;
					}
				}
			}
		}
	}
};

/** Commits point to their parent(s) along with their contents 
 * @param {string} [options.message=''] the name of the commit
 * @param {string} [options.parent=null] the parent commit that this commit will point to
 * @param {string} [options.secondary_merge_parent=null] a second parent commit if this
 * is a merge commit
 * @param {Date} [options.time=Date.now()] the time the commit was made
 * @param {Tree} [options.root=null] the root tree of the commit
 * @returns {Commit} A commit with the specified features
 */
function Commit(options) {
	if(options===undefined) {
		options = {};
	}
	if(options.message && typeof(options.message) !== 'string') {
		throw new Error('Commit message must be a string');
	} else if(options.parent && !(options.parent instanceof Commit)) {
		throw new Error('Commit parent must be a commit');
	} else if(options.secondary_merge_parent && !(options.secondary_merge_parent instanceof Commit)) {
		throw new Error('Commit parent must be a commit');
	} else if(options.time && !(options.time instanceof Date)) {
		throw new Error('Commit creation time must be a date object');
	} else if(options.root && !(options.root instanceof Tree)) {
		throw new Error('Commit root must be a git tree');
	}
	this.message = options.message || '';
	this.parent = options.parent || null;
	this.mergeParent = options.secondary_merge_parent || null;
	this.creationTime = options.time || new Date();
	this.root = options.root || null;
	this.hash = this.Hash();
}
/** Copy a commit and all of its contents
 * @returns {Commit} An identical commit to this
 */
Commit.prototype.copy = function() {
	var options = 
		{'message': this.message, 
		 'time': this.creationTime
		};
	if(this.parent) {
		options.parent = this.parent.copy();
	}
	if(this.mergeParent) {
		options.secondary_merge_parent = this.mergeParent.copy();
	}
	if(this.root) {
		options.root = this.root.copy();
	}
	return new Commit(options);
};
/** Copy a commit, but leave out its parent(s)
 */
Commit.prototype.copyContents = function() {
	var options = 
		{'message': this.message,
		 'parent': null,
		 'secondary_merge_parent': null,
		 'time': this.creationTime,
		 'root': this.root.copy()
		};
	return new Commit(options);
};
/** Copy a commit, using objects from a gitremote
 * @param {Map} objects a map of hashes(strings) to objects
 * @returns {Commit} A commit identical to this but pointing to trees and
 * blobs that already exist
 */
Commit.prototype.applyToRemote = function(obj_list) {
	if(obj_list.hasOwnProperty(this.hash)) {
		throw new Error('an object with this hash already exists');
	}
	var options = 
		{'message': this.message,
		 'parent': null,
		 'secondary_merge_parent': null,
		 'time': this.creationTime,
		 'root': this.root.applyToRemote(obj_list)
		};
	return new Commit(options);
};
/** Return a hash of the blob using sha1.
 * @returns {string} hash of the object
 */
Commit.prototype.Hash = function() {
	var contentsHash = 'commit: '+this.creationTime+' ';
	if(this.root) {
		contentsHash += this.root.Hash();
	}
	return sha1(contentsHash);
};
/** Equality checks are based on the hash.
 * @returns {boolean} whether the two hashes are equal
 */
Commit.prototype.equals = function(other) {
	return this.hash === other.hash;
};
/** Are the two commits equal including their parents all the way
 * until null
 * @returns {boolean} whether the commits and ancestors are equivalent
 */
Commit.prototype.deepequals = function(other) {
	if(this.equals(other)) {
		return JSON.stringify(this) === JSON.stringify(other);
	} else
		return false;
};

/** Make a git remote consisting of a graph and git objects
 * @param {GitGraph} gitgraph a gitgraph object to draw this remote on
 * @param {Array.<string,commit>} [branch_tips] a list of branch names and commits
 * usually taken as Array.from(GitRemote.branches)
 * @returns {GitRemote} a GitRemote object
 */
function GitRemote(gitgraph, branch_tips) {
	this.graph = gitgraph;
	for (var i in branch_tips) {
		this.loadHistoryFromCommit(branch_tips[i],i);
	}
}
GitRemote.prototype = {
	branches: {},
	objects: {},
	/** Load in history from a commit, also can be used to update a branch
	 * @param {Commit} head the commit to load history from
	 * @param {string} branchname the name of the branch
	 * @param {boolean} [options.create=false] load only if this branchname doesn't already exist
	 */
	loadHistoryFromCommit: function(head, branchname, options) {
		function findCommonAncestor(remote, commit) {
			if(!commit) {
				return;
			}
			if(remote.objects.hasOwnProperty(commit.hash) && remote.objects[commit.hash].deepequals(commit)) {
				return remote.objects[commit.hash];
			}
			return findCommonAncestor(remote, commit.parent) || findCommonAncestor(remote, commit.mergeParent);
		}
		function isAncestor(remote, pot_ancestor, commit) {
			if(commit===null)
				return false;
			if(commit.deepequals(pot_ancestor))
				return true;
			return isAncestor(remote, pot_ancestor, commit.parent) || isAncestor(remote, pot_ancestor, commit.mergeParent);
		}
		function addUpToAncestor(remote, ancestor, head) {
			var tip = head.applyToRemote(remote.objects);
			var tmp = head.parent;
			var last = tip;
			while((ancestor===null&&tmp!==null) || (ancestor!==null&&!tmp.equals(ancestor))) {
				last.parent = tmp.applyToRemote(remote.objects);
				last = last.parent;
				tmp = tmp.parent;
			}
			return tip;
		}
		//Throw an error if creating a branch but it already exists
		if(options && options.create) {
			if(this.branches.hasOwnProperty(branchname)) {
				throw new Error("Cannot create new branch. Branch already exists with name: "+branchname);
			}
		}
		//Fast forward
		if(this.branches.hasOwnProperty(branchname)) {
			if(isAncestor(this, this.branches[branchname],head) && !this.branches[branchname].equals(head)) {
				this.branches[branchname] = addUpToAncestor(this,this.branches[branchname], head);
				this.branches[branchname] = tip;
			}
			//TODO handle conflicts
		}
		var common = findCommonAncestor(this, head);
		//New branch with an ancestor in the history
		if(common) {
			this.branches[branchname] = addUpToAncestor(this, common, head);
		} else {
			this.branches[branchname] = addUpToAncestor(this, null, head);
		}
	},
	/** Check if this remote contains a commit with the specified hash
	 * @param {string} hash the hash of the commit in question
	 * @returns {Commit|undefined} a commit with the specified hash
	 * or undefined if nothing was found.
	 */
	hasCommit: function(hash) {
		if(this.objects.hasOwnProperty(hash)) {
			return this.objects.hash;
		}
	}
};

/** A git remote with a filesystem
 * @param {Object} fs_children a representation of the file structure with file
 *  names as keys. They optional can include the single key 'content' to make 
 *  that root object a file with the given content.
 *  @param {Gitgraph} A gitgraph item to draw the remote on
 *  @returns {GitFileSystem}
 */
function GitFileSystem(fs_children, gitgraph) {
	function buildfs(root, fs) {
		for (var i in fs) {
			if (fs.hasOwnProperty(i)) {
				var tmp;
				if(fs[i].content && Object.keys(fs[i]).length ===1) {
					tmp = new File(i);
					tmp.setContent(fs[i].content);
					root.add(tmp);
				} else if(typeof(fs[i])==='object') {
					tmp = new Directory(i,root);
					buildfs(tmp,fs[i]);
				}
			}
		}
	}

	this.root = new Directory('/');
	this.root.path = '';
	this.remotes = {};

	this.modified_files = [];
	this.staged_files = [];

	if (fs_children !== undefined) {
		buildfs(this.root, fs_children);
	}
}
GitFileSystem.prototype = Object.create(GitRemote.prototype);

/** make a new remote with the given name and optionally another remote to copy
 * @params {string} remote_name name of the remote in this GitFileSystem
 */
GitFileSystem.prototype.newRemote = function(remote_name, remote) {
	if(!(remote instanceof GitRemote) || typeof(remote_name)!=='string')
		throw new Error('Remotes must be added with a name and reference to a remote');
	if (!(remote_name in this.remotes)) {
		this.remotes[remote_name] = remote;
	} else {
		throw new Error('Git Remote: Tried to add a remote '+
			'with an existing name');
	}
};
/** Remove a remote from the list of remotes
 * @params {string} remote_name name of the remote to remove
 */
GitFileSystem.prototype.removeRemote = function(remote_name) {
	if (remote_name in this.remotes) {
		delete this.remotes.remote_name;
	} else {
		throw new Error('Git Remote: Tried to remove a non-'+
			'existing remote from list of remotes');
	}
};

GitFileSystem.prototype.makeRepo = function(targetdir) {
	if(!targetdir.content['.git']) {
		targetdir.add('.git', 'dir');
	}

	if(!targetdir.content['.git'].content.branches) {
		targetdir.content['.git'].add('branches', 'dir');
	}

	if(!targetdir.content['.git'].content.hooks) {
		targetdir.content['.git'].add('hooks', 'dir');
	}
	if(!targetdir.content['.git'].content.hooks.content.filler) {
		var filler = new File('filler', '#This is a filler file. hooks are currently not implemented in git sandbox');
		targetdir.content['.git'].content.hooks.add(filler);
	}

	if(!targetdir.content['.git'].content.info) {
		targetdir.content['.git'].add('info', 'dir');
	}
	if(!targetdir.content['.git'].content.info.content.exclude) {
		var exclude = new File('exclude', '#Currently not implemented. Acts as a gitignore for this repo but does not get shared with remotes');
		targetdir.content['.git'].content.info.add(exclude);
	}

	if(!targetdir.content['.git'].content.objects) {
		targetdir.content['.git'].add('objects', 'dir');
	}

	if(!targetdir.content['.git'].content.refs) {
		targetdir.content['.git'].add('refs', 'dir');
	}

	//Files directly in .git [description, HEAD, config]
	if(!targetdir.content['.git'].contents.description) {
		var description = new File('description', "Unnamed repository; edit this file 'description' to name this repository.\n#Note that this is an unused dummy file for git sandbox");
		targetdir.content['.git'].add(description);
	}
	if(!targetdir.content['.git'].contents.HEAD) {
		var head = new File('HEAD', 'refs/heads/master');
		targetdir.content['.git'].add(head);
	}
	if(!targetdir.content['.git'].contents.config) {
		var config = new File('config', '#This is unused in Git Sandbox. If you were looking for this, consider contributing and implementing git config');
		targetdir.content['.git'].add(config);
	}
};

/** needed by pathhandler for cd and ls, this function gets the node (file or 
 * directory) mentioned by path and runs callback with it.
 */
GitFileSystem.prototype.getNode = function(path, current) {
	if(!path) {
		return current;
	}
	var target = path[0]=='/'?this.root:current;
	var splitpath = path.split('/');
	for (var i in splitpath) {
		if(i=='..') {
			if(target.parent) {
				target = target.parent;
			} else {
				return;
			}
		} else if(i=='.') {
			//do nothing
		} else if(target.content.hasOwnProperty(i)) {
			target = target.content[i];
		} else {
			return;
		}
	}
	return target;
};
/** needed by pathhandler, this function returns a node's children
 */
GitFileSystem.prototype.getChildNodes = function(node) {
	return Object.keys(node.content);
};

GitFileSystem.prototype.getNodeFromPath = function(path, current) {
	if(!path) {
		return current;
	}
	var target = path[0]=='/'?this.root:current;
	var splitpath = path.split('/');
	for (var i in splitpath) {
		if(i=='..') {
			if(target.parent) {
				target = target.parent;
			} else {
				return target;
			}
		} else if(i=='.') {
			//do nothing
		} else if(target.content.hasOwnProperty(i)) {
			target = target.content.i;
		} else {
			throw new Error('invalid path');
		}
	}
	return target;
};

exports.File = File;
exports.Directory = Directory;
exports.Blob = Blob;
exports.Tree = Tree;
exports.Commit = Commit;
exports.GitRemote = GitRemote;
exports.GitFileSystem = GitFileSystem;

})();
