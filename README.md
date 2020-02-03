metalsmith-looper
======

A small plugin to iterate over metalsmith data.


Quick example
------

```js
const Metalsmith = require('metalsmith');
const looper = require('metalsmith-looper');

Metalsmith(__dirname)
    .metadata({})
    .source('./content')
    .destination('./docs')
    .use(looper(function({ loopContent }) {

        // Loop through HTML files
        loopContent(function(file, { move }) {

            // Move file and associated assets to another subfolder
            move('/root/' + file.$name);
        });
    }));
```

Looper API
------

### loopContent( callback )

Loop through every HTML files.


### loopOnType( callback )

Loop through every HTML files from a specific subfolder of the sources.


### createIndex( indexName, sortProp )

Create a new index to reference content file.


Loop API
------

### move( newName )

Move the current file, and associated assets, to another destination.


### remove( )

Remove the current from the sources to treat.


### required( propName )

Throw an error if the current file doesn't have a specific property.


### unique( propName )

Throw an error if the current file has the same property value than another file.


### setType( newType )

Define the type of document, by default, the type of document is the source subfolder.


### addReference( propName, referencedType )

Link another file according to a property value. 


### addIndex( indexName, key )

Add the current file to a spacific index under a specific key.


### getIndex( indexName )

Retrieve a specific index of files.


Template API
------


### $name

The relative path of the current file destination path.


### $type

The type of the current file.


### $indexes

An array that contains all indexes.


### $self

An object containing the current file.