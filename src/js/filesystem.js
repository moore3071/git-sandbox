var sha1 = require('sha1');

/** This file provides a fake file system for the git repositories. This
 * includes: normal files, directories, git blobs, git commits, and git trees. 
 * @param {string} name the name of the file
 * @throws errors if the input isn't a string
 * @returns {File} a File object with name of name
 */
function File(name) {
	if(typeof(name)!=='string') {
		throw new Error("File name must be a string");
	}
	this.name = name;
	this.content = null;
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

	if(parent_dir===undefined || parent_dir instanceof Directory) {
		if(parent_dir instanceof Directory) {
			this.parent = parent_dir;
			parent_dir.add(this);
		}
	} else {
		throw new Error('Directory parent must be a directory');
	}
	this.name = name;
	this.content = new Map();
}

Directory.prototype = {

	/** Add a file to the contents of this directory. Accepts a file object
	 * or a name for a new File.
	 * @param {string|File|Directory|Blob|Commit} file the file to be added to this
	 * directory
	 * @throws errors if the input isn't the correct type or content with
	 * this name already exists
	 */
	add: function(file) {
		if (typeof(file)==='string') {
			file = new File(file);
		}
		if (file instanceof Directory || file instanceof File) {
			if (this.content.has(file.name)) {
				throw new Error('A file with this name already exists');
			} else {
				this.content.set(file.name, file);
			}
		} else if(file instanceof Tree || file instanceof Blob || file instanceof Commit) {
			//File names for blobs, commits, etc, are their hash
			if (this.content.has(file.hash)) {
				throw new Error('A file with this hash already exists');
			} else {
				this.content.set(file.hash, file);
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
		if (this.content.has(file_name)) {
			this.content.delete(file_name);
		} else {
			throw new Error('cannot remove a nonexisting file');
		}
	},
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
	if(content!==undefined && typeof(content)!=='string') {
		throw new Error("Blobs can only be constructed with strings");
	}
	this.content = content;
	this.hash();
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
	if(obj_list.has(this.hash)) {
		return obj_list.get(this.hash);
	} else {
		return this.copy();
	}
};
/** Return a hash of the blob using sha1.
 * @returns {string} hash of the object
 */
Blob.prototype.hash = function() {
	return sha1('blob: '+this.content);
};

/** Trees are like directories except they accept blobs or trees as children and
 * don't have parents.
 * @returns {Tree} A new tree
 */
function Tree() {
	this.content = new Map();
}
Tree.prototype = {
	/** Copy a tree recursively so remotes don't interact with the trees of others
	 * @returns {Tree} A tree identical to this
	 */
	copy: function() {
		var result = new Tree();
		for (var i in Object.keys(this.content)) {
			result.content.i = this.content.i.copy();
		}
		return result;
	},
	/** Copy a tree if it doesn't exist in a remote's objects, otherwise return the existing tree
	 * @param {Map} obj_list a map of objects from a remote
	 * @returns {Tree} A tree identical to this
	 */
	applyToRemote: function(obj_list) {
		if(obj_list.has(this.hash)) {
			return obj_list.get(this.hash);
		} else {
			var result = new Tree();
			for(var i in this.content) {
				result.content.i = this.content.i.applyToRemote(obj_list);
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
		if (typeof(name)!==String) {
			throw new Error('name must be a string');
		}
		if (typeof(input)!==Blob && typeof(input)!==Tree) {
			throw new Error('contents must be a blob or tree');
		} else if(this.content.has(name)) {
			throw new Error('content with this hash already exists');
		} else {
			this.content.set(name, input);
		}
	},
	/** Removes a Blob or Tree from this tree's contents
	 * @param {String} hash the hash of the Tree or Blob to be removed
	 * @throws an error if the hash is not a string
	 * @throws an error if there's nothing with this hash in contents
	 */
	remove: function(hash) {
		if (typeof(hash)!==String) {
			throw new Error('argument must be a string');
		} else if(!this.content.has(hash)) {
			throw new Error('no content with this hash to remove');
		} else {
			this.content.delete(hash);
		}
	},
	/** Return a hash of the tree using sha1.
	 * @returns {string} hash of the object
	 */
	hash: function() {
		var contentsHash = 'tree: ';
		var keys = Array.from(this.content.keys()).sort();
		for(var i=0; i<keys.length; i++) {
			contentsHash += i+' '+this.content.get(i).hash+' ';
		}
		return sha1(contentsHash);
	},
	/** Check recursively if the hashed object exists in contents
	 * @param {string} hash the hash to check for
	 * @returns {Tree|Blob} the object searched for
	 */
	contains: function(hash) {
		var tmp;
		if(this.content.size()!==0) {
			for(var i in this.content.values()) {
				if(i.hash()===hash) {
					return i;
				}
				if(i instanceof Tree) {
					tmp = i.contains(hash);
					if(tmp!==undefined) {
						return tmp;
					}
				}
			}
		}
	}
};

/** Commits point to their parent(s) along with their contents 
 * @param {string} message the name of the commit
 * @param {string} parent the parent commit that this commit will point to
 * @param {string} [secondary_merge_parent=null] a second parent commit if this
 * is a merge commit
 * @param {Date} [time=Date.now()] the time the commit was made
 * @returns {Commit} A commit with the specified features
 */
function Commit(message, parent, secondary_merge_parent, time) {
	Directory.call(this, message, parent);
	this.mergeParent = secondary_merge_parent;
	this.creationTime = time || Date.now();
}
Commit.prototype = Object.create(Tree.prototype);
/** Copy a commit and all of its contents
 * @returns {Commit} An identical commit to this
 */
Commit.prototype.copy = function() {
	var result = new Commit(this.name, this.parent, this.mergeParent, this.creationTime);
	for (var i in Object.keys(this.content)) {
		result.content.i = this.content.i.copy();
	}
	result.parent = this.parent.copy();
	result.mergeParent = this.mergeParent.copy();
};
/** Copy a commit, but leave out its parent(s)
 */
Commit.prototype.copyContents = function() {
	var result = new Commit(this.name, null, null, this.creationTime);
	for (var i in Object.keys(this.content)) {
		result.content.i = this.content.i.copy();
	}
	return result;
};
/** Copy a commit, using objects from a gitremote
 * @param {Map} objects a map of hashes(strings) to objects
 * @returns {Commit} A commit identical to this but pointing to trees and
 * blobs that already exist
 */
Commit.prototype.applyToRemote = function(obj_list) {
	if(obj_list.has(this.hash)) {
		throw new Error('an object with this hash already exists');
	}
	var result = new Commit(this.name, null, null, this.creationTime);
	for(var i in Object.keys(this.content)) {
		result.content.i = this.content.i.applyToRemote(obj_list);
	}
	return result;
};
/** Return a hash of the blob using sha1.
 * @returns {string} hash of the object
 */
Commit.prototype.hash = function() {
	var contentsHash = 'commit: '+this.creationTime+' ';
	for (var i in this.content.values()) {
		contentsHash += i.hash();
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
		return JSON.stringifiy(this) === JSON.stringify(other);
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
		this.loadhistoryFromCommit(branch_tips[i],i);
	}
}
GitRemote.prototype = {
	branches: new Map(),
	objects: new Map(),
	//TODO finish
	/** Load in history from a commit, also can be used to update a branch
	 * @param {Commit} head the commit to load history from
	 * @param {string} branchname the name of the branch
	 * @param {boolean} [options.create=false] load only if this branchname doesn't already exist
	 */
	loadhistoryFromCommit: function(head, branchname, options) {
		function findCommonAncestor(commit) {
			if(this.objects.has(commit.hash) && this.objects.get(commit.hash).deepequals(commit)) {
				return this.objects.get(commit.hash);
			}
			return findCommonAncestor(commit.parent) || findCommonAncestor(commit.mergeParent);
		}
		function isAncestor(pot_ancestor, commit) {
			if(commit.deepequals(pot_ancestor))
				return true;
			return isAncestor(pot_ancestor, commit.parent) || isAncestor(pot_ancestor, commit.mergeParent);
		}
		//Throw an error if creating a branch but it already exists
		if(options.create) {
			if(this.branches.has(branchname)) {
				throw new Error("Cannot create new branch. Branch already exists with name: "+branchname);
			}
		}
		//Fast forward
		if(this.branches.has(branchname)) {
			if(isAncestor(this.branches.get(branchname),head) && !this.branches.get(branchname).equals(head)) {
				var tip = head.applyToRemote(this.objects);
				var tmptip = head.parent;
				while(!tmptip.equals(this.branches.get(branchname))) {
					tmptip.applyToRemote(this.objects);
					tmptip = tmptip.parent;
				}
				this.branches.set(branchname, tip);
			}
		}
	},
	/** Check if this remote contains a commit with the specified hash
	 * @param {string} hash the hash of the commit in question
	 * @returns {Commit|undefined} a commit with the specified hash
	 * or undefined if nothing was found.
	 */
	hasCommit: function(hash) {
		if(this.objects.has(hash)) {
			return this.objects.get(hash);
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
			var tmp;
			if(fs[i].content && Object.keys(fs.i).length ===1) {
				tmp = new File(i);
				tmp.setContent(fs[i].content);
				root.add(tmp);
			} else if(typeof(fs[i])===Object){
				tmp = new Directory(i,root);
				buildfs(tmp,fs[i]);
			}
		}
	}

	this.root = new Directory('');
	this.root.path = '/';
	this.remotes = new Map();

	this.modified_files = [];
	this.staged_files = [];

	if (fs_children !== undefined) {
		buildfs(this.root, fs_children);
	}
}
GitFileSystem.prototype = Object.create(GitRemote.prototype);

//TODO Fix me
/** make a new remote with the given name and optionally another remote to copy
 * @params {string} remote_name name of the remote in this GitFileSystem
 */
GitFileSystem.prototype.newRemote = function(remote_name, old_remote) {
	var copied_remote = typeof(old_remote) === undefined ? this : old_remote;
	if (!(remote_name in this.remotes)) {
		this.remotes[remote_name] = copied_remote;
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

/** needed by pathhandler for cd and ls, this function gets the node (file or 
 * directory) mentioned by path and runs callback with it.
 */
GitFileSystem.prototype.getNode = function(path, callback) {
	if(!path) {
		callback(pathhandler.current);
	}
	var target = path[0]=='/'?this.root:pathhandler.current;
	var splitpath = path.split('/');
	for (var i in splitpath) {
		if(i=='..') {
			if(target.parent) {
				target = target.parent;
			} else {
				return callback();
			}
		} else if(i=='.') {
			//do nothing
		} else if(target.content.has(i)) {
			target = target.content.get(i);
		} else {
			return callback();
		}
	}
	return callback(target);
};
/** needed by pathhandler, this function returns a node's children
 */
GitFileSystem.prototype.getChildNodes = function(node, callback) {
	return callback(node.content.values());
};

GitFileSystem.prototype.getNodeFromPath = function(path) {
	if(!path) {
		return pathhandler.current;
	}
	var target = path[0]=='/'?this.root:pathhandler.current;
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
		} else if(target.content.has(i)) {
			target = target.content.get(i);
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
