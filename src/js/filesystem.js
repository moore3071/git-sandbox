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
	setContent: function(content) { this.content = content; }
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
	if(parent_dir!==undefined && typeof(parent_dir)!==typeof(this))
		throw new Error('Directory parent must be a directory');
	this.name = name;
	this.parent = parent_dir;
	this.content = new Map();
}

Directory.prototype = {

	/** Add a file to the contents of this directory. Accepts a file object
	 * or a name for a new File.
	 * @param {string|File|Directory} file the file to be added to this
	 * directory
	 * @throws errors if the input isn't the correct type or content with
	 * this name already exists
	 */
	add: function(file) {
		if (typeof(file)===String) {
			file = new File(file);
		}
		if (file instanceof Directory || file instanceof File || file instanceof Tree) {
			if (this.content.has(file.name)) {
				throw new Error('A file with this name already exists');
			} else {
				this.content.set(file.name, file);
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
	}

};

/** Blobs are like files except they have a hash stored with them. Note that in
 * this implementation blobs' contents are stored as is and no deltas are used.
 * This is meant to be a useable guide and not an honest Git re-implementation
 * @param {string} name the name of the blob
 * @returns {Blob} A blob object with name of name
 */
function Blob(name) {
	File.call(this, name);
}
Blob.prototype = Object.create(File.prototype);
/** Copy a blob recursively so remotes don't interact with the blobs of others
 * @returns {Blob} A blob identical to this
 */
Blob.prototype.copy = function() {
	var result = new Blob(this.name);
	result.content = this.content;
	return result;
};
/** Return a hash of the blob using sha1.
 * @returns {string} hash of the object
 */
Blob.prototype.hash = function() {
	return sha1('blob: '+this.name+' '+this.content);
};

/** Trees are like directories except they accept blobs or trees as children and
 * don't have parents.
 * @param {string} name the name of the Tree
 * @returns {Tree} A tree with name of name
 */
function Tree(name) {
	if(typeof(name)!=='string') {
		throw new Error("File name must be a string");
	}
	this.name = name;
	this.content = new Map();
}
Tree.prototype = {
	/** Copy a tree recursively so remotes don't interact with the trees of others
	 * @returns {Tree} A tree identical to this
	 */
	copy: function() {
		var result = new Tree(this.name);
		for (var i in Object.keys(this.content)) {
			result.content.i = this.content.i.copy();
		}
	},
	/** Adds a blob or tree to this tree's contents if a blob or tree with 
	 * the input's hash doesn't exist.
	 * @param {Tree|Blob} input the Tree or Blob to be added to content
	 * @throws an error if the arguments aren't a tree or blob
	 * @returns {boolean} whether the Tree or Blob was added correctly
	 */
	add: function(input) {
		if (typeof(input)!==Blob && typeof(input)!==Tree) {
			throw new Error('contents must be a blob or tree');
		} else if(this.content.has(input.hash)) {
			throw new Error('content with this hash already exists');
		} else {
			this.content.set(input.hash, input);
		}
	},
	/** Removes a Blob or Tree from this tree's contents
	 * @param {String} hash the hash of the Tree or Blob to be removed
	 * @returns {boolean} whether the Tree or Blob was removed correctly
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
		var contentsHash = 'tree: '+this.name+' ';
		for (var i in this.content.values()) {
			contentsHash += i.hash();
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
 * @param {string} name the name of the commit
 * @param {string} parent the parent commit that this commit will point to
 * @param {string} [secondary_merge_parent=null] a second parent commit if this
 * is a merge commit
 * @param {Date} [time=Date.now()] the time the commit was made
 * @returns {Commit} A commit with the specified features
 */
function Commit(name, parent, secondary_merge_parent, time) {
	Directory.call(this, name, parent);
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


//XXX
/** Make a git remote consisting of a graph and git objects
 * @param {GitGraph} gitgraph a gitgraph object to draw this remote on
 * @param {Array.<string,commit>} [branch_tips] a list of branch names and commits
 * usually taken as Array.from(GitRemote.branches)
 * @returns a GitRemote object
 */
function GitRemote(gitgraph, branch_tips) {
	this.graph = gitgraph;
	for (var i in branch_tips) {
		this.loadhistoryFromCommit(branch_tips[i],i);
	}
}
GitRemote.prototype = {
	branches: new Map(),
	//FIXME finish
	/** Load in history from a commit, also can be used to update a branch
	 * @param {Commit} head the commit to load history from
	 * @param {string} branchname the name of the branch
	 * @param {boolean} options.create load only if this branchname doesn't already exist
	 * @param {boolean} options.update beep boop filler
	 */
	loadhistoryFromCommit: function(head, branchname, options) {
		result.head = head.copy();

		this.branches.set(branchname, head);
	},
	hasCommit: function(hash) {
		
	}
};


function GitFileSystem(fs_children, gitgraph) {
	this.root = new Directory('', null);
	this.root.path = '/';
	this.remotes = new Map();

	if (fs_children !== undefined) {
		//TODO
		function buildfs(root, fs) {
			for (var i in Object.keys(fs)) {
				
			}
		}
	}
}
GitFileSystem.prototype = Object.create(GitRemote.prototype);

GitFileSystem.prototype.newRemote = function(old_remote, remote_name) {
	var copied_remote = typeof(old_remote) === undefined ? this : old_remote;
	if (!(remote_name in this.remotes)) {
		this.remotes[remote_name] = copied_remote;
		return true;
	} else {
		try {
			throw new Error('Git Remote: Tried to add a remote '+
				'with an existing name');
		} catch(e) {
			console.log(e.name + ': ' + e.message);
		}
	}
	return false;
};
GitFileSystem.prototype.removeRemote = function(remote_name) {
	if (remote_name in this.graphs) {
		delete this.remotes.remote_name;
		return true;
	} else {
		try {
			throw new Error('Git Remote: Tried to remove a non-'+
				'existing remote from list of remotes');
		} catch(e) {
			console.log(e.name + ': ' + e.message);
		}
	}
	return false;
};

exports.File = File;
exports.Directory = Directory;
exports.Blob = Blob;
exports.Tree = Tree;
exports.Commit = Commit;
