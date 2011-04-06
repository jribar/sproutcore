/**
 * Nested Records and the Data Store(SC.Record) Unit Test
 *
 * @author Evin Grano
 */
/*global ok, equals, test, module */

// ..........................................................
// Basic Set up needs to move to the setup and teardown
//
var NestedRecord, store, storeKeys;

var initModels = function () {
  NestedRecord.Directory = SC.Record.extend({
    /** Child Record Namespace */
    nestedRecordNamespace: NestedRecord,
    name: SC.Record.attr(String),
    contents: SC.Record.toMany('SC.Record', { isNested: true })
  });

  NestedRecord.File = SC.Record.extend({
    name: SC.Record.attr(String),
    description: SC.Record.attr(String)
  });

};

// ..........................................................
// Basic SC.Record Stuff
//
module("Data Store Tests for Nested Records", {

  setup: function () {
    SC.RunLoop.begin();
    NestedRecord = SC.Object.create({
      store: SC.Store.create()
    });
    store = NestedRecord.store;
    initModels();

    storeKeys = store.loadRecords([NestedRecord.Directory, NestedRecord.File], [
      {
        type: 'Directory',
        name: 'Dir 1',
        guid: 1,
        contents: [
          {
            type: 'Directory',
            name: 'Dir 2',
            guid: 2,
            contents: [
              {
                type: 'File',
                guid: 3,
                name: 'File 1',
                description: 'Desc 1'
              },
              {
                type: 'File',
                guid: 4,
                name: 'File 2',
                description: 'Desc 2'
              } 
            ]
          }
        ]
      },
      {
        type: 'File',
        id: 5,
        name: 'File 3',
        description: 'Desc 3'
      }
    ]);
    SC.RunLoop.end();
  },

  teardown: function () {
    delete NestedRecord.Directory;
    delete NestedRecord.File;
    NestedRecord = null;
    store = null;
  }
});

test("Proper Initialization", function () {
  var first, second;
  equals(storeKeys.get('length'), 2, "number of primary store keys should be 2");


  // First
  SC.run(function() { first = store.materializeRecord(storeKeys[0]); });
  ok(SC.kindOf(first, SC.Record), "first record is a kind of a SC.Record Object");
  ok(SC.instanceOf(first, NestedRecord.Directory), "first record is a instance of a NestedRecord.Directory Object");

  // Second
  SC.run(function() { second = store.materializeRecord(storeKeys[1]); });
  ok(SC.kindOf(second, SC.Record), "second record is a kind of a SC.Record Object");
  ok(SC.instanceOf(second, NestedRecord.File), "second record is a instance of a NestedRecord.File Object");
});

test("Test that reset() clears out the store for re-use", function () {
  var isEmptyObject = function ( obj ) {
    var name;

    for (name in obj) {
      return false;
    }
    return true;
  };

  var parent, child;
  SC.run(function() { parent = store.materializeRecord(storeKeys[0]); });
  SC.run(function() { child = parent.get('contents').firstObject(); });

  ok(!isEmptyObject(store.parentRecords), "We expect there to be values in store.parentRecords");
  ok(!isEmptyObject(store.childRecords), "We expect there to be values in store.childRecords");

  store.reset();

  ok(isEmptyObject(store.parentRecords), "We expect there to no longer be any values in store.parentRecords");
  ok(isEmptyObject(store.childRecords), "We expect there to no longer be any values in store.childRecords");
});

test("Proper Status", function () {
  var first, second;

  // First
  SC.run(function() { first = store.materializeRecord(storeKeys[0]); });
  equals(first.get('status'), SC.Record.READY_CLEAN, 'first record has a READY_CLEAN State');

  // Second
  SC.run(function() { second = store.materializeRecord(storeKeys[1]); });
  equals(second.get('status'), SC.Record.READY_CLEAN, 'second record has a READY_CLEAN State');

  // Shallow property update.
  SC.run(function() { first.get('contents').objectAt(0).set('name', 'Dir 2 - Updated') });
  equals(first.get('status'), SC.Record.READY_DIRTY, 'first record has a READY_DIRTY State');
});

test("Deep property update", function () {
  var first, second;

  // First
  SC.run(function() { first = store.materializeRecord(storeKeys[0]); });
  equals(first.get('status'), SC.Record.READY_CLEAN, 'first record has a READY_CLEAN State');

  // Deep property update.
  SC.run(function() { first.get('contents').objectAt(0).get('contents').objectAt(0).set('name', 'Dir 2 - Updated') });
  equals(first.get('status'), SC.Record.READY_DIRTY, 'first record has a READY_DIRTY State');
});

test("Can Push onto child array", function () {
  var first, contents;

  // First
  SC.run(function() {
    first = store.materializeRecord(storeKeys[0]);
    first = first.get('contents').objectAt(0);
    contents = first.get('contents');

    equals(contents.get('length'), 2, "should have two items");

    contents.forEach(function (f) {
      ok(SC.instanceOf(f, NestedRecord.File), "should be a NestedRecord.File");
      ok(f.get('name'), "should have a name property");
    });

    contents.pushObject({type: 'File', name: 'File 4', id: 12});

    equals(contents.get('length'), 3, "should have three items");

    contents.forEach(function (f) {
      ok(SC.instanceOf(f, NestedRecord.File), "should be a NestedRecord.File");
      ok(f.get('name'), "should have a name property");
      equals(f.get('status'), SC.Record.READY_DIRTY, 'second record has a READY_DIRTY State');
    });
  });

});

test("Use in Nested Store", function () {
  var nstore, dir, c, file,
      pk, id, nFile, nDir;

  // First, find the first file
  SC.run(function() { dir = store.find(NestedRecord.Directory, 1); });
  ok(dir, "Directory id:1 exists");
  equals(dir.get('name'), 'Dir 1', "Directory id:1 has a name of 'Dir 1'");
  c = dir.get('contents');
  ok(c, "Content of Directory id:1 exists");
  SC.run(function() {dir = c.objectAt(0);});
  ok(dir, "Directory id:2 exists");
  equals(dir.get('name'), 'Dir 2', "Directory id:2 has a name of 'Dir 2'");
  c = dir.get('contents');
  ok(c, "Content of Directory id:2 exists");
  SC.run(function() {file = c.objectAt(0);});
  ok(file, "File id:1 exists");
  equals(file.get('name'), 'File 1', "File id:1 has a name of 'File 1'");

  // Second, create nested store
  nstore = store.chain();
  SC.RunLoop.begin();
  pk = file.get('primaryKey');
  id = file.get(pk);
  nFile = nstore.find(NestedRecord.File, id);
  SC.RunLoop.end();
  ok(nFile, "Nested > File id:1 exists");
  equals(nFile.get('name'), 'File 1', "Nested > File id:1 has a name of 'File 1'");

  // Third, change the name of the nested store and see what happens
  SC.run(function(){nFile.set('name', 'Change Name');});
  equals(nFile.get('name'), 'Change Name', "Nested > File id:1 has changed the name to 'Changed Name'");
  equals(file.get('name'), 'File 1', "Base > File id:1 still has the name of 'File 1'");
  nDir = nstore.find(NestedRecord.Directory, 1);

  // Fourth, commit the changes
  SC.run(function(){
    nstore.commitChanges();
    nstore.destroy();
  });
  nstore = null;
  equals(file.get('name'), 'Change Name', "Base > File id:1 has changed to name of 'Changed Name'");

  // Fifth, double check that the change exists
  dir = store.find(NestedRecord.Directory, 1);
  SC.run(function() {
     file = dir.get('contents').objectAt(0).get('contents').objectAt(0);
  });
  equals(dir.get('status'), SC.Record.READY_DIRTY, 'Base > Directory id:1 has a READY_DIRTY State');
  equals(file.get('status'), SC.Record.READY_DIRTY, 'Base > File id:1 has a READY_DIRTY State');
  equals(file.get('name'), 'Change Name', "Base > File id:1 has actually changed to name of 'Changed Name'");

});

test("Store#pushRetrieve for parent updates the child records", function () {
  SC.RunLoop.begin()
  var parent = store.materializeRecord(storeKeys[0]),
    nr = parent.get('contents').firstObject(),
    newDataHash = {
      type: 'Directory',
      name: 'Dir 1 Changed',
      guid: 1,
      contents: [
        {
          type: 'Directory',
          name: 'Dir 2 Changed',
          guid: 2,
          contents: [
            {
              type: 'File',
              guid: 3,
              name: 'File 1'
            },
            {
              type: 'File',
              guid: 4,
              name: 'File 2'
            }
          ]
        }
      ]
    };

  parent = store.materializeRecord(storeKeys[0]);
  nr = parent.get('contents').get('firstObject');

  ok(nr, "Got nested record");
  equals(nr.get('name'), 'Dir 2', "Dir id:2 has correct name");

  store.pushRetrieve(null, null, newDataHash, storeKeys[0]);
  store.flush();
  SC.RunLoop.end()

  equals(parent.get('name'), 'Dir 1 Changed', 'Dir id:1 name was changed');
  equals(nr.get('name'), 'Dir 2 Changed', "Dir id:2 name was changed");
});

test("Store#pushRetrieve for parent updates the child records, even on different path", function () {
  SC.RunLoop.begin()
  var parent = store.materializeRecord(storeKeys[0]),
    nr = parent.get('contents').firstObject(),
    newDataHash = {
      type: 'Directory',
      name: 'Dir 1 Changed',
      guid: 1,
      contents: [
        {
          type: 'Directory',
          name: 'Dir 3',
          guid: 5,
          contents: [
            {
              type: 'File',
              guid: 6,
              name: 'File 6'
            },
            {
              type: 'File',
              guid: 7,
              name: 'File 7'
            }
          ]
        },
        {
          type: 'Directory',
          name: 'Dir 2 Changed',
          guid: 2,
          contents: [
            {
              type: 'File',
              guid: 3,
              name: 'File 1'
            },
            {
              type: 'File',
              guid: 4,
              name: 'File 2'
            }
          ]
        }
      ]
    };

  parent = store.materializeRecord(storeKeys[0]);
  nr = store.find(NestedRecord.Directory,2);

  ok(nr, "Got nested record");
  equals(nr.get('name'), 'Dir 2', "Dir id:2 has correct name");

  store.pushRetrieve(null, null, newDataHash, storeKeys[0]);
  store.flush();
  SC.RunLoop.end()

  equals(parent.get('name'), 'Dir 1 Changed', 'Dir id:1 name was changed');
  equals(nr.get('name'), 'Dir 2 Changed', "Dir id:2 name has changed");
});

test("Store#pushRetrieve for parent updates the child records, works on first object", function () {
  SC.RunLoop.begin()
  var parent = store.materializeRecord(storeKeys[0]),
    nr = parent.get('contents').firstObject(),
    newDataHash = {
      type: 'Directory',
      name: 'Dir 1 Changed',
      guid: 1,
      contents: [
        {
          type: 'Directory',
          name: 'Dir 3',
          guid: 5,
          contents: [
            {
              type: 'File',
              guid: 6,
              name: 'File 6'
            },
            {
              type: 'File',
              guid: 7,
              name: 'File 7'
            }
          ]
        },
        {
          type: 'Directory',
          name: 'Dir 2 Changed',
          guid: 2,
          contents: [
            {
              type: 'File',
              guid: 3,
              name: 'File 1'
            },
            {
              type: 'File',
              guid: 4,
              name: 'File 2'
            }
          ]
        }
      ]
    };

  parent = store.materializeRecord(storeKeys[0]);
  nr = parent.get('contents').firstObject();

  ok(nr, "Got nested record");
  equals(nr.get('name'), 'Dir 2', "Dir id:2 has correct name");

  store.pushRetrieve(null, null, newDataHash, storeKeys[0]);
  store.flush();
  SC.RunLoop.end()

  equals(parent.get('name'), 'Dir 1 Changed', 'Dir id:1 name was changed');
  equals(nr.get('name'), 'Dir 2 Changed', "First object name has changed");
});

test("Store#pushRetrieve for parent updates the child records, on paths nested more than 2 levels", function () {
  SC.RunLoop.begin()
  var parent = store.materializeRecord(storeKeys[0]),
    nr = parent.get('contents').firstObject().get('contents').firstObject(),
    newDataHash = {
      type: 'Directory',
      name: 'Dir 1 Changed',
      guid: 1,
      contents: [
        {
          type: 'Directory',
          name: 'Dir 3',
          guid: 5,
          contents: [
            {
              type: 'File',
              guid: 6,
              name: 'File 6'
            },
            {
              type: 'File',
              guid: 7,
              name: 'File 7'
            }
          ]
        },
        {
          type: 'Directory',
          name: 'Dir 2 Changed',
          guid: 2,
          contents: [
            {
              type: 'File',
              guid: 3,
              name: 'File 1 Changed'
            },
            {
              type: 'File',
              guid: 4,
              name: 'File 2'
            }
          ]
        }
      ]
    };

  ok(nr, "(deep walk) Got nested record");
  equals(nr.get('name'), 'File 1', "(deep walk) File id:3 has correct name");

  parent = store.materializeRecord(storeKeys[0]);
  nr = store.find(NestedRecord.File,3);

  ok(nr, "Got nested record");
  equals(nr.get('name'), 'File 1', "File id:3 has correct name");

  store.pushRetrieve(null, null, newDataHash, storeKeys[0]);
  store.flush();
  SC.RunLoop.end()

  equals(parent.get('name'), 'Dir 1 Changed', 'Dir id:1 name was changed');
  equals(nr.get('name'), 'File 1 Changed', "File id:3 name has changed");
});

test("Use in Nested Store With lockOnRead: NO", function(){
  var nstore, dir, c, file,
      pk, id, nFile, nDir, nRootDir;
  
  // First, create nested store and find the file
  nstore = store.chain().set('lockOnRead', NO);
  SC.RunLoop.begin();
  nRootDir = nDir = nstore.find(NestedRecord.Directory, 1);
  SC.RunLoop.end();
  ok(nDir, "Directory id:1 exists"); 
  equals(nDir.get('name'), 'Dir 1', "Directory id:1 has a name of 'Dir 1'");
  c = nDir.get('contents');
  ok(c, "Content of Directory id:1 exists");
  nDir = c.objectAt(0);
  ok(nDir, "Directory id:2 exists"); 
  equals(nDir.get('name'), 'Dir 2', "Directory id:2 has a name of 'Dir 2'");
  c = nDir.get('contents');
  ok(c, "Content of Directory id:2 exists");
  nFile = c.objectAt(0);
  ok(nFile, "Nested > File id:1 exists"); 
  equals(nFile.get('name'), 'File 1', "Nested > File id:1 has a name of 'File 1'");
  equals(nFile.get('description'), 'Desc 1', "Nested > File id:1 has a description of 'File 1'");
  
  // Second, change the name of the nested store and see what happens
  nFile.set('name', 'Change Name');
  nFile.set('description', 'Change Desc');
  equals(nFile.get('name'), 'Change Name', "Nested > File id:1 has changed the name to 'Changed Name'");
  equals(nFile.get('description'), 'Change Desc', "Nested > File id:1 has changed the description to 'Changed Desc'");
  equals(nFile.get('name'), nFile.readAttribute('name'), "Nested > File id:1 has updated the underlying data hash for name");
  equals(nFile.get('description'), nFile.readAttribute('description'), "Nested > File id:1 has updated the underlying data hash for description");
  equals(nRootDir.readOnlyAttributes().contents[0].contents[0].name, 'Change Name', "Nested > Parent Dir id: 1 has the updated name in it's data hash");
  equals(nRootDir.readOnlyAttributes().contents[0].contents[0].description, 'Change Desc', "Nested > Parent Dir id: 1 has the updated description in it's data hash");
  
  // Verify that changes haven't been made to the record in the root store
  dir = store.find(NestedRecord.Directory, 1);
  file = dir.get('contents').objectAt(0).get('contents').objectAt(0);
  ok(file, "File id:1 exists"); 
  equals(file.get('name'), 'File 1', "File id:1 has a name of 'File 1'");
  equals(file.get('description'), 'Desc 1', "File id:1 has a description of 'Desc 1'");
  
  // Third, commit the changes
  nstore.commitChanges();
  nstore.destroy();
  nstore = null;

  // Fourth, load the record in the root store and verify changes have been made.
  dir = store.find(NestedRecord.Directory, 1);
  file = dir.get('contents').objectAt(0).get('contents').objectAt(0);
  equals(dir.get('status'), SC.Record.READY_DIRTY, 'Base > Directory id:1 has a READY_DIRTY State');
  equals(file.get('status'), SC.Record.READY_DIRTY, 'Base > File id:1 has a READY_DIRTY State');
  equals(file.get('name'), 'Change Name', "Base > File id:1 has actually changed to name of 'Changed Name'");
  equals(file.get('description'), 'Change Desc', "Base > File id:1 has actually changed to description of 'Changed Desc'");
  
});

test("Use in Nested Store With lockOnRead: NO to Test Propagating Changes From Root to Nested Store", function(){
  var nstore, dir, c, file,
      pk, id, nFile, nDir;
  
  // First, find the first file
  dir = store.find(NestedRecord.Directory, 1);
  file = dir.get('contents').objectAt(0).get('contents').objectAt(0);
  equals(file.get('name'), 'File 1', "File id:1 has a name of 'File 1'");
  
  // Second, create nested store
  nstore = store.chain().set('lockOnRead', NO);
  SC.RunLoop.begin();
  nDir = nstore.find(NestedRecord.Directory, 1);
  SC.RunLoop.end();
  
  // Third, let's prove the base case by changing the name of the root directory in the root store and see what happens
  dir.set('name', 'Change Name');
  equals(dir.get('name'), 'Change Name', "Base > Dir id:1 has changed the name to 'Changed Name'");
  equals(nDir.get('name'), 'Change Name', "Nested > Dir id:1 has changed the name to 'Changed Name'");
  equals(dir.readAttribute('name'), 'Change Name', "Base > Dir id:1 has changed the attribute name to 'Changed Name'");
  equals(nDir.readAttribute('name'), 'Change Name', "Nested > Dir id:1 has changed the attribute name to 'Changed Name'");

  // Fourth, let's get the file in the nested store
  nFile = nDir.get('contents').objectAt(0).get('contents').objectAt(0);
  ok(nFile, "Nested > File id:1 exists"); 
  equals(nFile.get('name'), 'File 1', "Nested > File id:1 has a name of 'File 1'");

  // Fifth, lets change the name of the file in the root store and see what happens
  file.set('name', 'Change Name');
  //nFile.allPropertiesDidChange();
  equals(file.get('name'), 'Change Name', "Base > File id:1 has changed the name to 'Changed Name'");
  equals(nFile.get('name'), 'Change Name', "Nested > File id:1 has changed the name to 'Changed Name'");
  equals(file.readAttribute('name'), 'Change Name', "Base > File id:1 has changed the attribute name to 'Changed Name'");
  equals(nFile.readAttribute('name'), 'Change Name', "Nested > File id:1 has changed the attribute name to 'Changed Name'");

  // Sixth, commit the changes and see if it changes
  store.commitRecords();
  equals(nFile.get('name'), 'Change Name', "Nested > File id:1 has changed the name to 'Changed Name'");
  
  // Seventh, double check that the change exists in the child stores
  nDir = nstore.find(NestedRecord.Directory, 1);
  nFile = nDir.get('contents').objectAt(0).get('contents').objectAt(0);
  equals(nFile.get('name'), 'Change Name', "Nested > File id:1 has actually changed to name of 'Changed Name'");
  equals(nFile.readAttribute('name'), 'Change Name', "Nested > File id:1 has changed the attribute name to 'Changed Name'");
});

test("Use in Nested Store With lockOnRead: NO and Reset Nested Store Instead of Commiting Changes", function(){
  var nstore, dir, c, file,
      pk, id, nFile, nDir, nRootDir;

  // First, load the file
  dir = store.find(NestedRecord.Directory, 1);
  file = dir.get('contents').objectAt(0).get('contents').objectAt(0);
  ok(file, "File id:1 exists"); 
  equals(file.get('name'), 'File 1', "File id:1 has a name of 'File 1'");
  
  // Second, create nested store and find the file
  nstore = store.chain().set('lockOnRead', NO);
  SC.RunLoop.begin();
  nRootDir = nDir = nstore.find(NestedRecord.Directory, 1);
  SC.RunLoop.end();
  nFile = nDir.get('contents').objectAt(0).get('contents').objectAt(0);
  ok(nFile, "Nested > File id:1 exists"); 
  equals(nFile.get('name'), 'File 1', "Nested > File id:1 has a name of 'File 1'");
  
  // Third, change the name of the nested store and see what happens
  nFile.set('name', 'Change Name');
  nFile.set('description', 'Change Desc');
  equals(nFile.get('name'), 'Change Name', "Nested > File id:1 has changed the name to 'Changed Name'");
  equals(nFile.get('name'), nFile.readAttribute('name'), "Nested > File id:1 has updated the underlying data hash for name");
  equals(nRootDir.readOnlyAttributes().contents[0].contents[0].name, 'Change Name', "Nested > Parent Dir id: 1 has the updated name in it's data hash");
  equals(nFile.get('description'), 'Change Desc', "Nested > File id:1 has changed the description to 'Changed Desc'");
  equals(nFile.get('description'), nFile.readAttribute('description'), "Nested > File id:1 has updated the underlying data hash for description");
  equals(nRootDir.readOnlyAttributes().contents[0].contents[0].description, 'Change Desc', "Nested > Parent Dir id: 1 has the updated description in it's data hash");
  
  // Fourth, destroy the store, and create a new store
  nstore.discardChanges();
  nstore.destroy();
  nstore = store.chain();
  SC.RunLoop.begin();
  nDir = nstore.find(NestedRecord.Directory, 1);
  nFile = nDir.get('contents').objectAt(0).get('contents').objectAt(0);
  SC.RunLoop.end();

  // Fifth, load the record in the root store and verify changes have not been been made.
  dir = store.find(NestedRecord.Directory, 1);
  file = dir.get('contents').objectAt(0).get('contents').objectAt(0);
  equals(dir.get('status'), SC.Record.READY_CLEAN, 'Base > Directory id:1 has a READY_CLEAN State');
  equals(file.get('status'), SC.Record.READY_CLEAN, 'Base > File id:1 has a READY_CLEAN State');
  equals(nDir.get('status'), SC.Record.READY_CLEAN, 'Nested > Directory id:1 has a READY_CLEAN State');
  equals(nFile.get('status'), SC.Record.READY_CLEAN, 'Nested > File id:1 has a READY_CLEAN State');
  equals(file.get('name'), 'File 1', "Base > File id:1 has not actually changed name.");
  equals(nFile.get('name'), 'File 1', "Nested > File id:1 has not actually changed name.");
  equals(dir.readOnlyAttributes().contents[0].contents[0].name, 'File 1', "Base > Parent Dir id: 1 has not actually changed name in the data hash");
  equals(nDir.readOnlyAttributes().contents[0].contents[0].name, 'File 1', "Nested > Parent Dir id: 1 has not actually changed name in the data hash");
  equals(file.get('description'), 'Desc 1', "Base > File id:1 has not actually changed description.");
  equals(nFile.get('description'), 'Desc 1', "Nested > File id:1 has not actually changed description.");
  equals(dir.readOnlyAttributes().contents[0].contents[0].description, 'Desc 1', "Base > Parent Dir id: 1 has not actually changed description in the data hash");
  equals(nDir.readOnlyAttributes().contents[0].contents[0].description, 'Desc 1', "Nested > Parent Dir id: 1 has not actually changed description in the data hash");
  
});
