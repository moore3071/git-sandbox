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

	it("the developer should be aware that testing is a thing and needs to"
	   + " be updated when the code is updated (this is mainly a note"
	   + " for myself and not a slant against other developers)", function() {
		var file = new Fs.File('tmp');
		expect(file).toEqual({ name: 'tmp', content: null});
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

		expect(dir.content.get('tmp')).toBe(file1);
		expect(dir.content.get('home')).toBe(dir2);
		expect(dir.content.get('home').content.get('confidential')).toBe(file2);
		expect(function() {
			dir2.add(file2)
		}).toThrowError('A file with this name already exists');

		expect( dir.content.get('tmp') ).toBe(file1);

		dir.remove('tmp');
		expect(function() {
			dir.remove('tmp')
		}).toThrowError('cannot remove a nonexisting file');

		expect(dir.content.get('tmp')).toBe(undefined);

		dir.remove('home');
	});
});

describe("blob methods", function() {

	it("should construct correctly using a string", function() {
		var b1  = new Fs.Blob('test content');
		expect(b1 instanceof Fs.Blob).toBe(true);
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
});

describe("tree methods", function() {

	it("should construct correctly using a string", function() {
		var b1  = new Fs.Tree();
		expect(b1 instanceof Fs.Tree).toBe(true);
	});

	//TODO: test add, remove, contains, and copy

});

describe("commit methods", function() {
	//TODO: test constructor, add, remove, contains, and copy (currently add, remove, and contains are the same as Tree)

});

describe("Hashing", function() {
	//TODO: test that hashing is unique across blobs, trees, and commits

});
