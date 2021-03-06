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
	makeBlob: function() { return new Blob(this.content); },
	copy: function() { return new File(this.name, this.content); }
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
	 * @param {string} type if file is a string whether the new thing will be a file
	 * or directory
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
			throw new Error('Only files may be added to directories');
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
	/** Make a tree from this directory
	 * @returns {Tree} A tree representing this directory
	 */
	makeTree: function() {
		var result = new Tree();
		for(var i in this.contents) {
			if(this.contents[i] instanceof Directory) {
				var tmp = this.contents[i].makeTree();
				results.add(i, tmp);
			} else if(this.contents[i] instanceof File) {
				var tmpfile = new Blob(this.contents[i].content);
				results.add(i, tmpfile);
			} else {
				throw new Error('git sandbox does not accept git objects as contents of trees');
			}
		}
		return result;
	},
	copy: function() {
		var result = new Directory(this.name);
		for(var i in this.content) {
			result.add(this.content[i].copy());
		}
		return result;
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
 * @param {Object} obj_list a map of objects from a remote
 * @returns {Blob} A Blob identical to this
 */
Blob.prototype.applyToRemote = function(obj_list) {
	if(obj_list.hasOwnProperty(this.hash)) {
		return obj_list[this.hash];
	} else {
		return this.copy();
	}
};
/** Return a hash of the blob using sha1 and set this hash
 * @returns {string} hash of the object
 */
Blob.prototype.Hash = function() {
	this.hash = sha1('blob: '+this.content);
	return this.hash;
};

/** Trees are like directories except they accept blobs or trees as children and
 * don't have parents.
 * @returns {Tree} A new tree
 */
function Tree() {
	this.content = {};
	this.Hash();
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
		result.Hash();
		return result;
	},
	/** Copy a tree if it doesn't exist in a remote's objects, otherwise return the existing tree
	 * @param {Object} obj_list a map of objects from a remote
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
		if (!(input instanceof Blob) && !(input instanceof Tree)) {
			throw new Error('contents must be a blob or tree');
		} else if(this.content.hasOwnProperty(name)) {
			throw new Error('content with this hash already exists');
		} else {
			this.content[name] = input;
		}
		this.Hash();
	},
	/** Removes a Blob or Tree from this tree's contents
	 * @param {String} name the name of the Tree or Blob to be removed
	 * @throws an error if the name is not a string
	 * @throws an error if there's nothing with this name in contents
	 */
	remove: function(name) {
		if (typeof(name)!=='string') {
			throw new Error('argument must be a string');
		} else if(!this.content.hasOwnProperty(name)) {
			throw new Error('no content with this name to remove');
		} else {
			delete this.content[name];
		}
		this.hash = this.Hash();
	},
	/** Removes a Blob or Tree from this tree's contents based on its hash.
	 *  Note that this should not be used due to the possibility of having 
	 *  two blolbs or trees with the same hash in contents
	 *  @param {string} hash the hash of the Tree or Blob to be removed
	 */
	removeByHash: function(hash) {
		if (typeof(name)!=='string') {
			throw new Error('argument must be a string');
		} else {
			for(var i in this.content) {
				if(this.content[i].hash===hash) {
					delete this.content[i];
				}
			}
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
		this.hash = sha1(contentsHash);
		return this.hash;
	},
	/** Check recursively if the nameed object exists in contents
	 * @param {string} name the name to check for
	 * @returns {Tree|Blob} the object searched for
	 */
	contains: function(name) {
		var tmp;
		for(var i in this.content) {
			if(this.content.hasOwnProperty(i)) {
				if(this.content[i]) {
					return this.content[i];
				}
				if(this.content[i] instanceof Tree) {
					var tmp2 = this.content[i].contains(name);
					if(tmp2!==undefined) {
						return tmp2;
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
 * @param {string} [options.author='John Doe <j@example.com>'] the author's name and email
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
	} else if(options.author && typeof(options.author) !== 'string') {
		throw new Error('Commit author must be a string');
	}
	this.message = options.message || '';
	this.parent = options.parent || null;
	this.mergeParent = options.secondary_merge_parent || null;
	this.creationTime = options.time || new Date();
	this.root = options.root || null;
	this.author = options.author || 'John Doe <j@example.com>';
	this.Hash();
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
 * @param {Object} objects a map of hashes(strings) to objects
 * @returns {Commit} A commit identical to this but pointing to trees and
 * blobs that already exist
 */
Commit.prototype.applyToRemote = function(obj_list) {
	if(obj_list.hasOwnProperty(this.hash)) {
		return obj_list[this.hash];
	}
	var options = 
		{'message': this.message,
		 'parent': this.parent?this.parent.applyToRemote(obj_list):null,
		 'secondary_merge_parent': this.mergeParent?this.mergeParent.applyToRemote(obj_list):null,
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
	this.hash = sha1(contentsHash);
	return this.hash;
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

/** Given another commit find the common ancestor if one exists by
 * tracing the parent.
 * @param {Commit} other_commit the commit to find a common ancestor with
 * @returns {Commit} A commit that is an ancestor of this and other_commit
 */
Commit.prototype.getCommonAncestor = function(other_commit) {
	function countLength(commit) {
		var tmp = commit;
		var count = 0;
		while(tmp) {
			count+=1;
			tmp = tmp.parent;
		}
		return count;
	}
	
	if(this.equals(other_commit)) {
		return this;
	}
	var tmp = this;
	var c1 = countLength(this);
	var c2 = countLength(other_commit);
	for(var i=0; i<Math.abs(c1-c2); i++) {
		 if(c2>c1)
			other_commit = other_commit.parent;
		else
			tmp = tmp.parent;
	}
	var tmp2 = other_commit;

	//Get ready for the big O(n^2) #oh no that is the naive approach
	while(tmp) {
		while(tmp2) {
			if(tmp.equals(tmp2))
				return tmp;
			else
				tmp2 = tmp2.parent;
		}
		tmp = tmp.parent;
		tmp2 = other_commit;
	}
};

/** Make a git remote consisting of a graph and git objects
 * @param {GitGraph} gitgraph a gitgraph object to draw this remote on
 * @param {Array.<string,commit>} [branch_tips] a list of branch names and commits
 * usually taken as Array.from(GitRemote.branches)
 * @returns {GitRemote} a GitRemote object
 */
function GitRemote(url, gitgraph, branch_tips) {
	this.url = url;
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
	 * @throws an error if this hash doesn't exist or multiple exist
	 */
	hasCommit: function(hash) {
		var result = this.sha1LookUp(hash);
		if(result instanceof Commit) {
			return result;
		}
	},
	/** Return the object referenced by a sha1 as long as this is a 
	 * unique (possibly shortened) sha1.
	 * @param {string} hash the hash to be looked up
	 * @returns {Commit|Tree|Blob} the git object with the given sha1
	 * @throws an error if this hash doesn't exist or multiple exist
	 */
	sha1LookUp: function(hash) {
		var keys = Object.keys(this.objects).filter(function(obj) { return obj.indexOf(hash)===0; });
		//XXX differs from git by giving long sha1 in hints
		if(keys.length>1) {
			var errmess = 'error: short sha1 '+hash+' is ambiguous\nhint: The candidates are:';
			for(var i = 0; i<keys.length; i++) {
				errmess += '\nhint: '+keys[i];
			}
			throw new Error(errmess);
		} else if(keys.length===0) {
			throw new Error('error: pathspec `'+hash+'` did not match any file(s) known to git.');
		} else {
			return this.objects[keys[0]];
		}
	},
	commitLookUp: function(input) {
		if(this.branches.hasOwnProperty(input)) {
			return this.branches[input];
		} else {
			return this.sha1LookUp(input);
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
	this.graph = gitgraph;
	this.currentPath = this.root; //Pathhandler.current will point to this in Josh.js

	this.modified_files = {removed: {}, added: {}, changed: {}};
	this.staged_files = {removed: {}, added: {}, changed: {}};
	this.head = undefined; //This will be a string either representing the sha1 of a commit or the branch name

	if (fs_children !== undefined) {
		buildfs(this.root, fs_children);
	}
}
GitFileSystem.prototype = Object.create(GitRemote.prototype);

GitFileSystem.prototype.mv = function(args, flags) {
	if(args.length!==2) {
		throw new Error('Error: mv must be called with two args');
	}
	this.cp(args, null);
	this.rm([args[0]]);
};

GitFileSystem.prototype.cp = function(args, flags) {
	if(args.length!==2) {
		throw new Error('Error: cp must be called with two args');
	}
	var newOne = this.getNode(args[0]).copy();
	this.add([args[1]], null, newOne);
};

/** Remove a file or directory at the given path(s). Functions as 'rm'
 *  and 'rmdir'
 * @param {Array} args the file(s) to be removed
 * @param {Object} flags options passed
 * @returns {string} output to the terminal
 */
GitFileSystem.prototype.rm = function(args, flags) {
	for(var i=0; i<args.length; i++) {
		var splitPath = args[i].split('/');
		var name = splitPath.pop();
		var parent_dir = getNode(splitPath.join('/'));
		if(flags && (flags.rmdir || flags.recursive)) {
			if(flags.rmdir && Object.keys(parent_dir.content[name].content).length===0)
				parent_dir.remove(name);
			else if(flags.rmdir)
				return 'rmdir: failed to remove `'+args[i]+'`: Directory not empty';
			else //flags.recursive
				parent_dir.remove(name);
		} else {
			if(parent_dir.content[name] instanceof File)
				parent_dir.remove(name);
			else
				return 'rm: cannot remove `'+args[i]+'`: Is a directory';
		}
	}
};

/** Add a file at the given path (basically touch)
 * @param {Array} args the file(s) to be made
 * @param {Object} flags options passed with touch
 * @param {File|Directory} [file=new File()|new Directory()] allow other functions to use this as a helper
 * @returns {string} output to the terminal
 */
GitFileSystem.prototype.add = function(args, flags, file) {
	for(var i=0; i<args.length; i++) {
		//Remove the file from modified files lists
		var container;
		if(this.modified_files.removed.hasOwnProperty(args[i])) {
			container = this.modified_files.removed;
		} else if(this.modified_files.modified.hasOwnProperty(args[i])) {
			container = this.modified_files.modified;
		} else if(this.modified_files.added.hasOwnProperty(args[i])) {
			container = this.modified_files.added;
		}
		if(container) {
			delete container[args[i]];
		}

		//add the file to its parent dir
		var splitPath = args[i].split('/');
		var name = splitPath.pop();
		var parent_dir = getNode(splitPath.join('/'));
		if(flags && flags.mkdir) {
			parent_dir.add(name, 'dir');
		} else if(flags) {
			parent_dir.add(name);
		} else if(file) {
			file.name = name;
			parent_dir.add(file);
		}

		//Add this file to the correct modified files list
		if(!this.headHad(args[i])) {
			this.modified_files.added[args[i]] = parent_dir.content[name];
		} else if(!this.headHad(args[i],parent_dir.content[name])) {
			this.modified_files.modified[args[i]] = parent_dir.content[name];
		}
	}
};

/** Return whether the current head has a certain path and if it's the 
 * specified item provided
 * @param {string} path the path to check for the existence of
 * @param {File|Directory} [item] item to check if the commit equals
 * @returns {boolean} if the head had the given path (and possibly item)
 */
GitFileSystem.prototype.headHad = function(path, item) {
	var tmp = this.getHead().root;
	path = path.split('/');
	for(var i = 0; i< path.length; i++) {
		if(!tmp.content.hasOwnProperty(path[i])) {
			return false;
		} else {
			tmp = tmp.content[path[i]];
		}
	}
	return item?this.compare(item, tmp):true;
};

/** Retrieve the head commit
 * @returns {Commit} The current commit
 */
GitFileSystem.prototype.getHead = function() {
	if(typeof(this.head)===string) {
		return this.commitLookUp(this.head);
	} else {
		throw new Error('Error: Head not set');
	}
};

/** make a new remote with the given name and optionally another remote to copy
 * @param {string} remote_name name of the remote in this GitFileSystem
 * @param {string} remote_url a string representing the location of the remote
 */
GitFileSystem.prototype.addRemote = function(remote_name, remote_url) {
	if(typeof(remote_url)!=='string' || typeof(remote_name)!=='string')
		throw new Error('Remotes must be added with a name and reference to a remote');
	if (!(remote_name in this.remotes)) {
		this.remotes[remote_name] = remote;
	} else {
		throw new Error('fatal: remote '+remote_name+' already exists.');
	}
};

/** Remove a remote from the list of remotes
 * @param {string} remote_name name of the remote to remove
 */
GitFileSystem.prototype.removeRemote = function(remote_name) {
	if (remote_name in this.remotes) {
		delete this.remotes[remote_name];
	} else {
		throw new Error('Git Remote: Tried to remove a non-'+
			'existing remote from list of remotes');
	}
};

/** Create a repo at the target directory (should only be '/' for now)
 * @param {string} targetdir a string representing the path of the git repos root
 */
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

/** Stage a modified file and add the blob to the object list
 * @param {string} file the path of a file
 */
GitFileSystem.prototype.stage = function(file) {
	var container;
	if(this.modified_files.removed.hasOwnProperty(file)) {
		container = this.modified_files.removed;
	} else if(this.modified_files.added.hasOwnProperty(file)) {
		container = this.modified_files.added;
	} else if(this.modified_files.modified.hasOwnProperty(file)) {
		container = this.modified_files.modified;
	}
	if(container) {
		var obj = this.getNodeFromPath(file);
		if(obj instanceof Directory) {
			obj = obj.makeTree();
		} else if(obj instanceof File) {
			obj = obj.makeBlob();
		} else {
			throw new Error('Can only stage files and directories');
		}

		obj = obj.applyToRemote(this.objects);
		this.staged_files[file.path] = obj;

		var splitPath = file.split('/');
		delete container[splitPath[splitPath.length-1]];
	} else {
		throw new Error('File has not been modified since last commit');
	}
};

/** compare a FS object with a git object and return whether they're equal
 * @param {Blob|Tree} obj the git object for comparision
 * @param {File|Directory} file the FS object for comparision
 * @returns {boolean} whether the two objects are equal
 */
GitFileSystem.prototype.compare = function(obj, file) {
	if(file instanceof File && obj instanceof Blob) {
		return file.content===obj.content;
	} else if(file instanceof Directory && obj instanceof Tree) {
		return file.makeTree().equals(obj);
	} else if(file instanceof Directory && obj instanceof Commit) {
		return this.compare(obj.root, file);
	} else {
		throw new Error('Cannot compare these two objects');
	}
};

/** Remove the file(s) given by args
 */
GitFileSystem.prototype.removeAndStage = function(args, flags) {
	for(var i=0; i<args.length; i++) {
		var tmp = this.getNode(args[i]);
		if(tmp) {
			this.staged_files.removed[args[i]] = tmp; //Stage for removal
			var tmp2 = this.root;
			var splitPath = args[i].split('/');
			for(var l = 0; l<args.length-1; l++) {
				tmp2 = tmp2.content[args[l]];
			}
			tmp2.remove(splitPath[args[args.length-1]]);
		} else {
			//TODO throw an error
		}
	}
};

//TODO tonight
GitFileSystem.prototype.fetchFromRemotes = function(args, flags) {

};

/** Changes the name of a branch to the designated new name
 * @param {string} oldName the name of the branch you want to change the name of
 * @param {string} newName the name for the branch to take
 * @param {Object} [flags=undefined] pass options to this function
 */
GitFileSystem.prototype.renameBranch = function(oldName, newName, flags) {
	this.branches[newName] = this.branches[oldName];
	delete this.branches[oldName];
};

/** List the branches in this
 * @param {RegExp} expression restrict the output to branch names matching expression
 * @returns {string} A string listing the branches each on a new line
 */
GitFileSystem.prototype.listBranches = function(expression) {
	var result = "";
	for(var i in this.branches) {
		if(!expression || expression.exec(i))
			result+="\n"+i;
	}
	return result;
};

/** Returns the current branch name if a branch is checked out
 * @returns {string} the current branch name
 */
GitFileSystem.prototype.getCurrentBranch = function() {
	if(typeof(this.head)==='string' && this.branches.hasOwnProperty(this.head)) {
		return this.head;
	}
};

/** Updates the head and current branchtip(if a branch is checked out) to point to commit
 * @param {Commit} commit the commit that the head should now point to
 */
GitFileSystem.prototype.updateHead = function(commit) {
	var branchname = this.getCurrentBranch();
	if(branchname) {
		this.branches[branchname] = commit.hash;
	} else {
		this.head = commit.hash;
	}
};

//TODO tonight
GitFileSystem.prototype.setBranch = function(branchname) {
	var tmp = this.commitLookUp(branchname).root;
	var filetracker = this.root;

	for(var i in tmp.content) {
		if(tmp.content[i] instanceof Blob) {
			
		}
	}
};

/** Remove all untracked files 'git clean'
 * @param {Object} flags options supplied to git clean
 * @param {boolean} [flags.dryRun=false] negates flags.force
 * @param {boolean} [flags.force=true] not the default, but c'est la vie
 * @param {boolean} [flags.directories=false] remove directories too #not implemented
 * @returns {string} the output of git clean
 */
GitFileSystem.prototype.removeUntracked = function(flags) {
	function findByPath(path, parent, gfs) {
		path = path.split('/');
		var loc_result = gfs.getHead();
		for(var i = 0; i<path.length; i++) {
			if(i<path.length-1 || !parent)
				loc_result = loc_result.content[path[i]];
		}
		return loc_result;
	}
	function findDir(pathToFile, gfs) {
		var res = gfs.root;
		pathToFile = pathToFile.split('/');
		for(var i = 0; i<path.length-1; i++) {
			res = res.content[path[i]];
		}
		return res;
	}
	function filename(path) {
		var tmp = path.split('/');
		return tmp[tmp.length-1];
	}
	var tmp = this.root;
	var result = '';
	for(var i in this.modified_files) {
		if(!findByPath(i, this)) {
			if(flags.dryRun) {
				result += 'Would remove '+i+'\n';
			} else {
				result += 'Removing '+i+'\n';
				findDir(i, this).remove(filename(i));
				delete this.modified_files[i];
			}
		}
	}
	return result;
};

/** Stage trees, and make a commit then update the head to the new commit
 * @param {Object} flags options supplied to git commit
 * @param {string} flags.message the message for this commit
 * @returns {string} the output from 'git commit'
 */
//TODO add output
GitFileSystem.prototype.makeCommitFromStaged = function(flags) {
	function findByPath(path) {
		var loc_result = result;
		for(var i = 0; i<path.length-1; i++) {
			loc_result = loc_result.content[path[i]];
		}
		return loc_result;
	}
	var result = this.commitLookUp(this.head).copy();
	var output = '';
	var splitPath;
	for(var i in this.staged_files.removed) {
		splitPath = i.split('/');
		delete findByPath(splitPath)[splitPath[splitPath.length-1]];
		delete this.staged_files.removed[i];
	}
	for( i in this.staged_files.added) {
		splitPath = i.split('/');
		findByPath(splitPath)[splitPath[splitPath.length-1]] = new Blob(this.staged_files.modified[i].content).applyToRemote(this.objects);
		delete this.staged_files.added[i];
	}
	for(i in this.staged_files.modified) {
		splitPath = i.split('/');
		findByPath(splitPath)[splitPath[splitPath.length-1]] = new Blob(this.staged_files.modified[i].content).applyToRemote(this.objects);
		delete this.staged_files.modified[i];
	}
	result.message = flags.message;
	result.Hash();

	this.updateHead(result);
};

//XXX enhancement: show branch tips
/** Git log helper that outputs the current commit and parents up
 * @param {Object} flags options supplied to 'git log' #not currently used
 * @returns {string} output of 'git log'
 */
GitFileSystem.prototype.logOutput = function(flags) {
	var result = '';
	var tmp = this.getHead();
	while(tmp) {
		var tmpout = 'commit '+tmp.hash+'\n';
		if(tmp.mergeParent) {
			tmpout+='Merge: '+tmp.parent.hash+' '+tmp.mergeParent.hash+'\n';
		}
		tmpout+='Author: '+tmp.author+'\n';
		tmpout+='Date: '+tmp.creationTime+'\n';
		tmpout+='\n'+tmp.message+'\n';
		result = tmpout+result;
		tmp = tmp.parent;
	}
	return result;
};

//TODO tonight
GitFileSystem.prototype.merge = function(args, flags) {
	var asdf ='';
};

/** Helper for git_mv. Return value if any should be the output of git_mv
 * @param {Array} the path of the file to be moved and destination
 * @param {string} args[0] the file to be moved
 * @param {string} args[1] the destination for the file to be moved to
 * @returns {string} output for git_mv
 */
GitFileSystem.prototype.moveAndUpdate = function(args, flags) {
	if(args.length!==2) {
		throw new Error('Error: Git Sandbox only accepts two arguments for `git mv` currently');
	} else {
		this.cp(args[0], args[1]);
		this.removeAndStage(args[0]);
		this.stage(args[1]);
	}
};

//TODO tonight
GitFileSystem.prototype.pushToRemote = function(args, flags) {

};

/** Git reset helper currently only resets to HEAD without args nor flags
 * @param {Object} flags options supplied to 'git reset'
 */
GitFileSystem.prototype.reset = function(args, flags) {
	if(args.length<1) {
		var tmp = Object.keys(this.staged_files.removed);
		for(var i =tmp.length-1; i>=0; i--) {
			this.modified_files.removed[this.staged_files.removed[i]] = this.staged_files.removed[i];
			delete this.staged_files.removed[i];
		}
		tmp = Object.keys(this.staged_files.modified);
		for(i =tmp.length-1; i>=0; i--) {
			this.modified_files.modified[this.staged_files.modified[i]] = this.staged_files.modified[i];
			delete this.staged_files.modified[i];
		}
		tmp = Object.keys(this.staged_files.added);
		for(i =tmp.length-1; i>=0; i--) {
			this.modified_files.added[this.staged_files.added[i]] = this.staged_files.added[i];
			delete this.staged_files.added[i];
		}
	} else {
		throw new Error('Error: git reset currently does not accept arguments in git sandbox. Consider improving git sandbox by making a PR adding this functionality.');
	}
};

//TODO
//Maybe deltas should be stored too because this method is going to be ugly
/** Git revert helper. Not implemented yet
 * @param {Array} args hopefully just the commit to revert to
 * @param {Object} flags options supplied to 'git revert'
 * @returns {string} output from git revert
 */
GitFileSystem.prototype.undoCommit = function(args, flags) {
	if(args.length!==0) {
		throw new Error('Usage: git revert <commit>');
	}
	throw new Error('Git revert has not been implemented in git sandbox yet');
};

/** Git status helper
 * @returns {string} output from 'git status'
 */
GitFileSystem.prototype.showDiffFromHead = function() {
	var result = '';
	if(typeof(this.head)==='string') { 
		if(this.branches.hasOwnProperty(this.head)) {
			result += 'On branch '+this.head+'\n';
		} else {
			result += 'HEAD detached at '+this.head+'\n';
		}
	} else {
		throw new Error('Error: no head currently');
	}
	var tmp;
	var i;
	var staged = '';
	var notStaged = ''; //Changes not staged for commit:
	var untracked = ''; //Untracked files:

	//modified, new, deleted
	if(Object.keys(this.staged_files.removed)>0 || Object.keys(this.staged_files.added)>0 || Object.keys(this.staged_files.changed)>0) {
		staged = 'Changes to be committed:\n';
		tmp = Object.keys(this.staged_files.removed);
		for(i=0; i<tmp.length; i++) {
			staged+='\nDeleted: '+tmp[i];
		}
		tmp = Object.keys(this.staged_files.changed);
		for(i=0; i<tmp.length; i++) {
			staged+='\nModified: '+tmp[i];
		}
		tmp = Object.keys(this.staged_files.added);
		for(i=0; i<tmp.length; i++) {
			staged+='\nAdded: '+tmp[i];
		}
	}

	if(Object.keys(this.modified_files.removed)>0 || Object.keys(this.modified_files.added)>0 || Object.keys(this.modified_files.changed)>0) {
		var head = this.getHead();
		tmp = Object.keys(this.modified_files.removed);
		for(i=0; i<tmp.length; i++) {
			if(head.hadPath(this.modified_files.removed[i].path)) { //TODO add Commit.hadPath
				if(notStaged==='') {
					notStaged = 'Changes not staged for commit:\n';
				}
				notStaged += '\nDeleted: '+this.modified_files.removed[i].path;
			}
		}
		tmp = Object.keys(this.modified_files.added);
		for(i=0; i<tmp.length; i++) {
			if(head.hadPath(this.modified_files.added[i].path)) {
				if(untracked==='') {
					untracked = 'Untracked files:\n';
				}
				untracked += '\nAdded: '+this.modified_files.added[i].path;
			}
		}
		tmp = Object.keys(this.modified_files.changed);
		for(i=0; i<tmp.length; i++) {
			if(head.hadPath(this.modified_files.changed[i].path)) {
				if(notStaged==='') {
					notStaged = 'Changes not staged for commit:\n';
				}
				notStaged += '\nModified: '+this.modified_files.changed[i].path;
			}
		}
	}
	return result;
};

/** Rename a given remote to a given new name
 * @params {string} oldName the name of the old/current remote
 * @params {string} newName the new name for the remote
 */
GitFileSystem.prototype.renameRemote = function(oldName, newName) {
	this.remotes[newName] = this.remotes[oldName];
	delete this.remotes[oldName];
};
// XXX ENDPOINT XXX

/** needed by pathhandler for cd and ls, this function gets the node (file or 
 * directory) mentioned by path and runs callback with it.
 */
GitFileSystem.prototype.getNode = function(path, current) {
	current = current || this.currentPath;
	if(!path) {
		return current;
	}
	var target = path[0]=='/'?this.root:current;
	var splitpath = path.split('/');
	for (var i in splitpath) {
		if(i=='..') {
			if(target.parent) {
				target = target.parent;
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
	current = current || this.currentPath;
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
			target = target.content[i];
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
