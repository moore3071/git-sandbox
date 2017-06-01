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
		expect(dir2.parent).toBe(dir);
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

		dir.add(file1)
		dir.add(dir2)
		dir2.add(file2)

		expect(dir.content['tmp']).toBe(file1);
		expect(dir.content['home']).toBe(dir2);
		expect(dir.content['home'].content['confidential']).toBe(file2);
		expect(function() {
			dir2.add(file2)
		}).toThrowError('A file with this name already exists');

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
		expect(t2).toEqual(t3);
		expect(t2).not.toBe(t3);
		expect(t1).not.toEqual(t2);
	});
});

describe("commit methods", function() {
	//TODO: test constructor, add, remove, contains, and copy (currently add, remove, and contains are the same as Tree)

});

describe("Hashing", function() {
	//TODO: test that hashing is unique across blobs, trees, and commits

});
