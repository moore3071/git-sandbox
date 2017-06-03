var Fs = require('../src/js/filesystem');

describe("File methods", function() {

	it("should create a file only when fed a string", function() {
		var file = new Fs.File('tmp');
		expect(file).toBeDefined();
		expect(file.setContent).toBeDefined();
	});

	it("should throw an exception if a non string is passed", function() {
		var constructorError = "File name must be a string";
		expect(function() {new Fs.File(true);}).toThrowError(Error, constructorError);
		expect(function() {new Fs.File();}).toThrowError(constructorError);
		expect(function() {new Fs.File(5);}).toThrowError(constructorError);
		expect(function() {new Fs.File({});}).toThrowError(constructorError);
	});

	it("should set the content to the given argument to setContent", function() {
		var contentString = 'this is the content';
		var file = new Fs.File('tmp');
		file.setContent(contentString);
		expect(file.content).toBe(contentString);
	});

	it("Should turn into a valid blob that is dependent on content", function() {
		var file = new Fs.File('tmp');
		var b1 = file.makeBlob();
		var b2 = file.makeBlob();
		file.setContent("test");
		var b3 = file.makeBlob();

		expect(b1).toEqual(b2);
		expect(b1).not.toEqual(b3);
	});

	it("the developer should be aware that testing is a thing and needs to"
	   + " be updated when the code is updated (this is mainly a note"
	   + " for myself and not a slant against other developers)", function() {
		var file = new Fs.File('tmp');
		expect(file).toEqual({ name: 'tmp', content: undefined});
	});
});

describe("Directory methods", function() {

	it("should create a directory when fed a string or two", function() {
		var dir = new Fs.Directory('/');
		expect(dir).toBeDefined();
		var dir2 = new Fs.Directory('home', dir);
		expect(dir2).toBeDefined();
		expect(dir.content.home).toBe(dir2);
	});

	it("should throw errors if the constructor doesn't use correct params", function() {
		var constructorError1 = 'Directory name must be a string';
		var constructorError2 = 'Directory parent must be a directory';
		var dir1 = new Fs.Directory('');
		expect( function() {
			new Fs.Directory();
		}).toThrowError(constructorError1);
		//One argument non-string
		expect( function() {
			new Fs.Directory(5);
		}).toThrowError(constructorError1);
		//One argument a directory
		expect( function() {
			new Fs.Directory(dir1);
		}).toThrowError(constructorError1);
		expect( function() {
			new Fs.Directory('', 1);
		}).toThrowError(constructorError2);
		expect( function() {
			new Fs.Directory(true,true);
		}).toThrowError(constructorError1);
	});

	it("should allow for adding and removing files and directories", function() {
		var dir = new Fs.Directory('');
		var file1 = new Fs.File('tmp');
		var file2 = new Fs.File('confidential');
		var dir2 = new Fs.Directory('home', dir);
		var b1 = new Fs.Blob('test content');

		dir.add(file1)
		dir2.add(file2)
		dir2.add('blank_file');
		dir2.add(b1);

		expect(dir.content['tmp']).toBe(file1);
		expect(dir.content['home']).toBe(dir2);
		expect(dir.content['home'].content['confidential']).toBe(file2);
		expect(dir2.content['blank_file']).toEqual(new Fs.File('blank_file'));
		expect(dir2.content[b1.hash]).toBe(b1);
		expect(function() {
			dir2.add(file2);
		}).toThrow();
		expect(function() {
			dir2.add('blank_file');
		}).toThrow();
		expect(function() {
			dir2.add(b1);
		}).toThrow();
		expect(function() {
			dir2.add(true);
		}).toThrow();

		expect( dir.content['tmp'] ).toBe(file1);

		dir.remove('tmp');
		expect(function() {
			dir.remove('tmp')
		}).toThrowError('cannot remove a nonexisting file');

		expect(dir.content['tmp']).toBe(undefined);

		dir.remove('home');
	});
});

describe("blob methods", function() {

	it("should construct correctly using a string", function() {
		var b1  = new Fs.Blob('test content');
		expect(b1 instanceof Fs.Blob).toBe(true);
		var b2 = new Fs.Blob('');
		var b3 = new Fs.Blob();
		expect(b2).toEqual(b3);
		expect(b2).not.toEqual(b1);
		expect(b2.hash).not.toEqual(undefined);
	});

	it("should not build with a non-string arg", function() {
		var constructorError = "Blobs can only be constructed with strings";
		expect(function() {
			new Fs.Blob(true);
		}).toThrowError(constructorError);
		expect(function() {
			new Fs.Blob([]);
		}).toThrowError(constructorError);
		expect(function() {
			new Fs.Blob({});
		}).toThrowError(constructorError);
		expect(function() {
			new Fs.Blob(3);
		}).toThrowError(constructorError);
		expect(function() {
			new Fs.Blob(true);
		}).toThrowError(constructorError);
	});

	it("should create an identical blob when copied", function() {
		var b1 = new Fs.Blob('LICENSE.md');
		var copy = b1.copy();
		expect(b1).toEqual(copy);
		expect(b1).not.toBe(copy);
	});
	//Apply to remote will be tested in git remote
});

describe("tree methods", function() {

	it("should construct correctly using a string", function() {
		var b1  = new Fs.Tree();
		expect(b1 instanceof Fs.Tree).toBe(true);
	});

	//TODO: test remove

	it("should create an identical tree when copied", function() {
		var t1 = new Fs.Tree();
		var t2 = t1.copy();
		var b1 = new Fs.Blob('test');
		t1.add('tmp', b1);
		var t3 = t1.copy();

		expect(t1.contains(b1.hash)).toBeTruthy();
		expect(t2.contains(b1.hash)).not.toBeTruthy();
		expect(t2).not.toEqual(t3);
		expect(t2).not.toBe(t3);
		expect(t1).not.toEqual(t2);
		expect(t1).toEqual(t3);
	});
});

describe("commit methods", function() {
	//TODO: test constructor, add, remove, contains, and copy (currently add, remove, and contains are the same as Tree)
	it("should construct with any mix of the available options", function() {
		var c1 = new Fs.Commit();
		var c2 = new Fs.Commit({'message': 'beep'});
		var c3 = new Fs.Commit({'parent': c2});
		var c4 = new Fs.Commit({'secondary_merge_parent': c3});
		var c5 = new Fs.Commit({'time': new Date('December 16, 1991')});
		var c6 = new Fs.Commit({'root': new Fs.Tree()});

		expect(c1 instanceof Fs.Commit).toBe(true);
		expect(c2 instanceof Fs.Commit).toBe(true);
		expect(c3 instanceof Fs.Commit).toBe(true);
		expect(c4 instanceof Fs.Commit).toBe(true);
		expect(c5 instanceof Fs.Commit).toBe(true);
		expect(c6 instanceof Fs.Commit).toBe(true);

		//Each commit should be unique
		var commits = [c1,c2,c3,c4,c5,c6];
		expect((new Set(commits)).size).toEqual(commits.length);
	});

	it("should fail if using the wrong type for any of the arguments", function() {
		expect(function() { new Fs.Commit({'message': true});}).toThrow();
		expect(function() { new Fs.Commit({'parent': true});}).toThrow();
		expect(function() { new Fs.Commit({'secondary_merge_parent': true});}).toThrow();
		expect(function() { new Fs.Commit({'time': true});}).toThrow();
		expect(function() { new Fs.Commit({'root': true});}).toThrow();
	});
	
	it("should create an identical commit when copying, and near identical when copying contents", function() {
		var t1 = new Fs.Tree();
		var b1 = new Fs.Blob('#New project');
		var c1 = new Fs.Commit({'message': 'Init commit', 'root': t1});
		var t2 = t1.copy();
		t2.add('README.md',b1);
		var c2 = new Fs.Commit({'message': 'added a readme', 'root': t2, 'parent': c1});
		var c3 = c1.copy();
		var c4 = c1.copyContents();

		expect(c1).toEqual(c3);
		expect(c1).not.toEqual(c2);
		expect(c1).toEqual(c4);
		expect(c1).not.toBe(c3);
		expect(c2.parent).toBe(c1);

	});

	it("should correctly identify equality and deep equality", function() {
		var t1 = new Fs.Tree();
		var b1 = new Fs.Blob('#New project');
		var c1 = new Fs.Commit({'message': 'Init commit', 'root': t1});
		var t2 = t1.copy();
		t2.add('README.md',b1);
		expect(t2.hash).not.toEqual(t1.hash);
		var c2 = new Fs.Commit({'message': 'added a readme', 'root': t2, 'parent': c1});
		var c3 = new Fs.Commit({'message': 'added a readme', 'root': t2});
		var c4 = c1.copyContents();
		
		expect(c1.equals(c2)).toBe(false);
		expect(c2.equals(c3)).toBe(true);
		expect(c1.equals(c4)).toBe(true);
		expect(c2.deepequals(c3)).toBe(false);
		expect(c1.deepequals(c4)).toBe(true);
	});
});

describe("Hashing", function() {
	//TODO: test that hashing is unique across blobs, trees, and commits
	it("Should differentiate blobs hashes", function(){
		var b1 = new Fs.Blob();
		var b2 = new Fs.Blob('test');
		var b3 = b1.copy();

		expect(b1.hash).toEqual(b3.hash);
		expect(b1.hash).not.toEqual(b2.hash);
		expect(b1.hash).toEqual(b1.Hash());
		expect(b2.hash).toEqual(b2.Hash());
		expect(b3.hash).toEqual(b3.Hash());
	});

	it("should differentiate tree hashes", function(){
		var b1 = new Fs.Blob();
		var t1 = new Fs.Tree();
		var t2 = t1.copy();
		var t3 = t1.copy();
		t3.add('test', b1);
		var t4 = t3.copy();
		var t5 = new Fs.Tree();
		t5.add('beep', b1);

		expect(t1.hash).toEqual(t2.hash);
		expect(t1.hash).not.toEqual(t3.hash);
		expect(t1.hash).not.toEqual(t5.hash);
		expect(t3.hash).toEqual(t4.hash);
		expect(t3.hash).not.toEqual(t5.hash);
		expect(t1.hash).toEqual(t1.Hash());
		expect(t2.hash).toEqual(t2.Hash());
		expect(t3.hash).toEqual(t3.Hash());
		expect(t4.hash).toEqual(t4.Hash());
		expect(t5.hash).toEqual(t5.Hash());
	});

	it("should differentiate commit hashes", function() {
		var t1 = new Fs.Tree();
		var b1 = new Fs.Blob('#New project');
		var c1 = new Fs.Commit({'message': 'Init commit', 'root': t1});
		var t2 = t1.copy();
		t2.add('README.md',b1);
		expect(t2.hash).not.toEqual(t1.hash);
		var c2 = new Fs.Commit({'message': 'added a readme', 'root': t2, 'parent': c1});
		var c3 = new Fs.Commit({'message': 'added a readme', 'root': t2});
		var c4 = c1.copyContents();

		expect(c1.hash).not.toEqual(c2.hash);
		expect(c2.hash).toEqual(c3.hash);
		expect(c1.hash).toEqual(c4.hash);
		expect(c1.hash).toEqual(c1.Hash());
		expect(c2.hash).toEqual(c2.Hash());
		expect(c3.hash).toEqual(c3.Hash());
		expect(c4.hash).toEqual(c4.Hash());

	});
});

describe("Git Remote methods", function() {
	it("should be able to construct with no arguments", function() {
		var gr1 = new Fs.GitRemote();
		var b1 = new Fs.Blob('#My Awesome Project\n\nThis does something awesome!');
		var t1 = new Fs.Tree();
		var c1 = new Fs.Commit({'message': 'Init commit', 'root': t1});
		var t2 = new Fs.Tree();
		t2.add('README.md', b1);
		var c2 = new Fs.Commit({'message': 'Added a readme', 'root': t2, 'parent': c1});
		gr1.loadHistoryFromCommit(c2, 'master');

		expect(gr1.branches.master).toEqual(c2);
	});

	it("should be able to construct with an object of branchnames and corresponding commits", function() {
		var t1 = new Fs.Tree();
		var c1 = new Fs.Commit({'message': 'Init commit', 'root': t1});
		var b1 = new Fs.Blob('#Cool repo');
		var t2 = new Fs.Tree();
		t2.add('READDME.md', b1);
		var c2 = new Fs.Commit({'message': 'added a readme', 'root': t2, 'parent': c1});
		var b2 = new Fs.Blob('#Awesome repo');
		var t3 = new Fs.Tree();
		t3.add('README.md', b2);
		var c3 = new Fs.Commit({'message': 'changed title in readme', 'root': t3, 'parent': c2});
		var b3 = new Fs.Blob('MIT License 2017');
		var t4 = new Fs.Tree();
		t4.add('README.md', b1);
		t4.add('LICENSE.md', b3);
		var c4 = new Fs.Commit({'message': 'Added a license file', 'root': t4, 'parent': c2});

		var gr1 = new Fs.GitRemote(null, {'master': c3, 'license': c4});
	});
});

describe("Git File System", function() {
	it("should construct with either an fs object or no args", function() {
		var gf1 = new Fs.GitFileSystem();

		var fs = {
			'home': {
				'user1': {
					'note': {
						'content': 'why is this fs here?'
					}
				}
			}
		};

		var gf2 = new Fs.GitFileSystem(fs);

		expect(gf2.root.content.home).toBeDefined();

		expect(gf2.root.content.home.content.user1).toBeDefined();

		expect(gf2.root.content.home.content.user1.path).toEqual('/home/user1');
	});
});
