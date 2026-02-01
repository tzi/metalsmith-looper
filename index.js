const path = require('path');
const deep = require('deep-get-set');
const { Buffer } = require('node:buffer');

// Indexes
const indexes = {};

function getIndex(name, key) {
  if (!indexes[name]) {
    throw new Error(`Unknown index "${name}".`);
  }

  if (!indexes[name].values[key]) {
    indexes[name].values[key] = [];
  }
  return indexes[name].values[key];
}

// Utils functions
function isContent(file) {
  return file.$content;
}

function convertNameToPath(fileName) {
  if (!fileName.includes('.')) {
    if (fileName && !fileName.endsWith('/')) {
      fileName += '/';
    }
    fileName += 'index.html';
  }

  return fileName;
}

function removeExtension(fileName) {
  const path = convertNameToPath(fileName);

  return path.substr(0, path.lastIndexOf('.'));
}

// Files treatment functions
function loopFiles(files, callback) {
  Object.keys(files).find(function(fileName) {
    return callback(files[fileName], fileName, files);
  });
}

function removeFile(files, name) {
  delete files[name];
}

function moveFile(files, oldName, newName) {
  const file = files[oldName];
  file.$name = newName;
  files[newName] = file;
  delete files[oldName];
  return file;
}

function copyFile(files, sourceName, name, overrideData = {}) {
  const file = Object.assign({}, files[sourceName]);
  Object.keys(overrideData).forEach(function(key) {
    file[key] = overrideData[key];
  });
  file.$name = name;
  files[file.$name] = file;
}

function createFile(files, type, name, data= {}, contents = '') {
  const $name = `${type}/${name}`;
  const file = Object.assign(
      { layout: type + '.njk' },
      data,
      {
        contents: Buffer.from(contents),
        $name,
        $content: true,
        $type: type,
      }
  );
  files[file.$name] = file;
  return file;
}

function getFileExists(files, name) {
  return typeof files[name] !== 'undefined';
}

function moveAssetFiles(files, oldContentName, newContentName) {
  const contentId = removeExtension(oldContentName);

  loopFiles(files, function(asset, fileName, files) {
    if (isContent(asset)) {
      return false;
    }

    if (!asset.$name.startsWith(contentId + '/')) {
      return false;
    }

    const newAssetName = path.dirname(newContentName) + asset.$name.slice(contentId.length);
    if (asset.$name === newAssetName) {
      return false;
    }

    moveFile(files, asset.$name, newAssetName);
  });
}

function setFileType(file, type) {
  file.$type = type;
}

// File actions
function createFileActions(files, file, context) {
  context['uniqueRef'] = context['uniqueRef'] || {};
  let oldName = file.$name;

  function remove() {
    removeFile(files, file.$name);
  }

  function getAssetName(name) {
    return removeExtension(file.$name) + '/' + name;
  }

  function getAssetExists(name) {
    return getFileExists(files, getAssetName(name));
  }

  function copy(name, data = {}) {
    copyFile(files, oldName, name, data);
  }

  function copyAsset(name, copyName) {
    return copyFile(files, getAssetName(name), getAssetName(copyName));
  }

  function move(newName) {
    if (newName.endsWith('/')) {
      newName += 'index.html';
    }
    moveFile(files, oldName, newName);
    moveAssetFiles(files, oldName, newName);
    oldName = file.$name;
  }

  function moveAsset(oldName, newName) {
    return moveFile(files, getAssetName(oldName), getAssetName(newName));
  }

  function required(propName, defaultValue = null) {
    const value = deep(file, propName);
    if (typeof value === 'undefined') {
      if (defaultValue === null) {
        throw new Error(
            `"${file.$name}" should have a "${propName}" property.`
        );
      }
      deep(file, propName, defaultValue);
    }
  }

  function oneOf(propName, values) {
    const value = deep(file, propName);
    if (!values.includes(value)) {
      throw new Error(
          `"${file.$name}" "${propName}" do not match any acceptable values.`
      );
    }
  }

  function unique(propName) {
    if (!context['uniqueRef'][propName]) {
      context['uniqueRef'][propName] = {};
    }
    const key = file[propName];
    if (context['uniqueRef'][propName][key]) {
      throw new Error(
          `Duplicate "${propName}" between "${context['uniqueRef'][propName][key]}" and "${file.$name}".`
      );
    }
    context['uniqueRef'][propName][key] = file.$name;
  }

  function setType(type) {
    setFileType(file, type);
  }

  function addReference(propName, type) {
    const key = type + path.sep + file[propName] + '.html';
    if (!files[key]) {
      throw new Error(
          `Unknown "${file[propName]}" defined on "${file.$name}".`
      );
    }
    file[propName] = files[key];
  }

  function addIndex(name, key) {
    const values = getIndex(name, key);
    values.push(file);
  }

  function debug() {
    console.dir(file);
  }

  function debugAll() {
    console.dir(files);
  }

  return {
    getAssetExists,
    copy,
    copyAsset,
    remove,
    move,
    moveAsset,
    required,
    oneOf,
    unique,
    setType,
    addReference,
    addIndex,
    getIndex,
    debug,
    debugAll,
  };
}

function createPluginActions(files) {
  function loop(filter, callback) {
    const context = {};
    return loopFiles(files, function(file, fileName, files) {
      // If key has been changed since the start of the loop
      if (!file) {
        return false;
      }

      if (!filter(file, fileName)) {
        return false;
      }

      const actions = createFileActions(files, file, context);
      const result = callback(file, actions);
      if (files[file.$name] !== file) {
        actions.move(file.$name);
      }

      return result;
    });
  }

  function createItem(type, name, data = {}, contents = '') {
    return createFile(files, type, name, data, contents);
  }

  function createIndex(name, sortProp, reversed = false) {
    indexes[name] = {
      sortProp,
      reversed,
      values: {}
    };
  }

  return {
    loopContent: function(callback) {
      return loop(isContent, callback);
    },
    loopOnType: function(type, callback) {
      return loop(file => file.$type === type, callback);
    },
    createIndex,
    createItem,
  };
}

// Global
function looper(plugin) {
  // Return a Metalsmith plugin
  return function(files, metalsmith, done) {
    // Add default value as a prop of file
    Object.keys(files).find(function(fileName) {
      const file = files[fileName];
      file.$name = fileName;
      if (fileName.endsWith('.html')) {
        file.$content = true;
        file.$type = looper.slicePath(fileName, 0, 1);
        file.layout = file.layout || file.$type + '.njk';
      }
      if (fileName.endsWith('.json')) {
        const contentFileName = fileName.replace('.json', '.html');
        if (files[contentFileName]) {
          Object.entries(JSON.parse(file.contents.toString())).forEach(
              function([key, data]) {
                files[contentFileName][key] = data;
              }
          );
        }
        delete files[fileName];
      }
    });

    // User callback
    const actions = createPluginActions(files);
    plugin(actions);

    // Normalize file name as a cross-OS path
    Object.values(files).find(function(file) {
      const filePath = path.normalize(convertNameToPath(file.$name));
      delete files[file.$name];
      files[filePath] = file;
    });

    // Sort indexes
    const sortIndexes = {};
    Object.keys(indexes).forEach(function(name) {
      const index = indexes[name];
      const propName = index.sortProp;
      const sign = Boolean(index.reversed) * -2 + 1;
      sortIndexes[name] = {};
      Object.keys(index.values).forEach(function(key) {
        sortIndexes[name][key] = index.values[key].sort(function(a, b) {
          return sign * (a[propName] - b[propName]);
        });
      });
    });

    // Fill object with useful values
    Object.values(files).find(function(file) {
      file.$indexes = sortIndexes;
      file.$self = file;
    });

    done();
  };
}

looper.removeExtension = removeExtension;

// Exposed utils
looper.slicePath = function(fileName, start, end) {
  return fileName
      .split(path.sep)
      .slice(start, end)
      .join(path.sep);
};

module.exports = looper;
