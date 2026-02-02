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


### createItem( type, name, data, contents )

Create a new item in the files loop.


Loop API
------

### File API

#### move( newName )

Move the current file, and associated assets, to another destination.

#### copy( newName, data = {} )

Copy the current file to another destination and override some data.

#### remove( )

Remove the current from the sources to treat.

#### setType( newType )

Define the type of document, by default, the type of document is the source subfolder.


### Assets API

#### getAssetExists( name ): bool

Return if an asset exists or not.

#### moveAsset( oldName, newName )

Move an associated asset to another destination.

#### copyAsset( name, copyName )

Copy an associated asset to another destination.

#### removeAsset( name )

Remove an associated asset.


### Property API

#### required( propName, defaultValue )

Throw an error if the current file doesn't have a specific property.

#### shouldBeInteger( propName )

Throw an error if the current file has a specific property and it is not an integer.

#### oneOf( propName, values )

Throw an error if the current file property do not match any the given values.

#### unique( propName )

Throw an error if the current file has the same property value than another file.


### Index API

#### addReference( propName, referencedType )

Link another file according to a property value. 

#### addIndex( indexName, key )

Add the current file to a spacific index under a specific key.

#### getIndex( indexName )

Retrieve a specific index of files.


### Debug API

#### debug( )

Dump current file. 

#### debugAll( )

Dump all files in the loop.


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