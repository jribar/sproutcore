/**
 * Nested Records and the Data Store(SC.Record) Unit Test
 *
 * @author Evin Grano
 */

// ..........................................................
// Basic Set up needs to move to the setup and teardown
//
var NestedRecord, store, storeKeys;

var initModels = function(){
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

  setup: function() {
    NestedRecord = SC.Object.create({
      store: SC.Store.create()
    });
    store = NestedRecord.store;
    initModels();
    SC.RunLoop.begin();
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

  teardown: function() {
    delete NestedRecord.Directory;
    delete NestedRecord.File;
    NestedRecord = null;
    store = null;
  }
});

test("Proper Initialization",function() {
  var first, second;
  equals(storeKeys.get('length'), 2, "number of primary store keys should be 2");

  // First
  first = store.materializeRecord(storeKeys[0]);
  ok(SC.kindOf(first, SC.Record), "first record is a kind of a SC.Record Object");
  ok(SC.instanceOf(first, NestedRecord.Directory), "first record is a instance of a NestedRecord.Directory Object");

  // Second
  second = store.materializeRecord(storeKeys[1]);
  ok(SC.kindOf(second, SC.Record), "second record is a kind of a SC.Record Object");
  ok(SC.instanceOf(second, NestedRecord.File), "second record is a instance of a NestedRecord.File Object");
});

test("Proper Status",function() {
  var first, second;

  // First
  first = store.materializeRecord(storeKeys[0]);
  equals(first.get('status'), SC.Record.READY_CLEAN, 'first record has a READY_CLEAN State');

  // Second
  second = store.materializeRecord(storeKeys[1]);
  equals(second.get('status'), SC.Record.READY_CLEAN, 'second record has a READY_CLEAN State');
});

test("Can Push onto child array",function() {
  var first, contents;

  // First
  first = store.materializeRecord(storeKeys[0]);
  first = first.get('contents').objectAt(0);
  contents = first.get('contents');
  equals(contents.get('length'), 2, "should have two items");
  contents.forEach(function(f){
    ok(SC.instanceOf(f, NestedRecord.File), "should be a NestedRecord.File");
    ok(f.get('name'), "should have a name property");
  });

  contents.pushObject({type: 'File', name: 'File 4', id: 12});

  equals(contents.get('length'), 3, "should have three items");
  contents.forEach(function(f){
    ok(SC.instanceOf(f, NestedRecord.File), "should be a NestedRecord.File");
    ok(f.get('name'), "should have a name property");
    equals(f.get('status'), SC.Record.READY_DIRTY, 'second record has a READY_CLEAN State');

  });

});

test("Use in Nested Store", function(){
  var nstore, dir, c, file,
      pk, id, nFile, nDir;

  // First, find the first file
  dir = store.find(NestedRecord.Directory, 1);
  ok(dir, "Directory id:1 exists");
  equals(dir.get('name'), 'Dir 1', "Directory id:1 has a name of 'Dir 1'");
  c = dir.get('contents');
  ok(c, "Content of Directory id:1 exists");
  dir = c.objectAt(0);
  ok(dir, "Directory id:2 exists");
  equals(dir.get('name'), 'Dir 2', "Directory id:2 has a name of 'Dir 2'");
  c = dir.get('contents');
  ok(c, "Content of Directory id:2 exists");
  file = c.objectAt(0);
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
  nFile.set('name', 'Change Name');
  equals(nFile.get('name'), 'Change Name', "Nested > File id:1 has changed the name to 'Changed Name'");
  equals(file.get('name'), 'File 1', "Base > File id:1 still has the name of 'File 1'");
  nDir = nstore.find(NestedRecord.Directory, 1);

  // Fourth, commit the changes
  nstore.commitChanges();
  nstore.destroy();
  nstore = null;
  equals(file.get('name'), 'Change Name', "Base > File id:1 has changed to name of 'Changed Name'");

  // Fifth, double check that the change exists
  dir = store.find(NestedRecord.Directory, 1);
  file = dir.get('contents').objectAt(0).get('contents').objectAt(0);
  equals(dir.get('status'), SC.Record.READY_DIRTY, 'Base > Directory id:1 has a READY_DIRTY State');
  equals(file.get('status'), SC.Record.READY_DIRTY, 'Base > File id:1 has a READY_DIRTY State');
  equals(file.get('name'), 'Change Name', "Base > File id:1 has actually changed to name of 'Changed Name'");

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
  //nRootDir.set('name', 'Directory 1'); // This will cause the parent record to lock before the child is initialized. [A]
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
  
  //nRootDir.set('name', 'Directory 1'); // This will cause the parent record to lock before the child is initialized. [B]

  // Second, change the name of the nested store and see what happens
  nFile.set('name', 'Change Name');
  nFile.set('description', 'Change Desc');
  equals(nFile.get('name'), 'Change Name', "Nested > File id:1 has changed the name to 'Changed Name'");
  equals(nFile.get('description'), 'Change Desc', "Nested > File id:1 has changed the description to 'Changed Desc'");
  equals(nFile.get('name'), nFile.readAttribute('name'), "Nested > File id:1 has updated the underlying data hash for name");
  equals(nFile.get('description'), nFile.readAttribute('description'), "Nested > File id:1 has updated the underlying data hash for description");
  equals(nRootDir.readOnlyAttributes().contents[0].contents[0].name, 'Change Name', "Nested > Parent Dir id: 1 has the updated name in it's data hash");
  equals(nRootDir.readOnlyAttributes().contents[0].contents[0].description, 'Change Desc', "Nested > Parent Dir id: 1 has the updated description in it's data hash");
  
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

