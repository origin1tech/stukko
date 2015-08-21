'use strict';

var fs = require('fs'),
    path = require('path'),
    basenameFilter, pathFilter,
    templates,
    typeMap,
    basePath;

basePath = './app';

// filter for excluding files.
basenameFilter = /^[^_](.+)\\.js$/;
pathFilter = /(index.js|components.js)/;

// component suffix map.
typeMap = {
    ctrl:   'controller',
    fact:   'factory',
    serv:   'service',
    dire:   'directive',
    filt:   'filter',
    valu:   'value',
    cons:   'constant',
    deco:   'decorator',
    sche:   'schema',
    hema:   'schema'
};

// templates
templates = {
    importFrom :                 'import {0} from {1};',        // import statement accepts: name & from path.
    exportStart :                '\n\nexport default {\n',      // open export default
    exportStop :                 '}',                           // close export default.
    componentStart :             '\t{0}: {\n',                  // component type accepts: controller, factory etc.
    componentStop :              '\n\t}',                       // close component.
    componentProperty :          '\t\t{0}: {1}'                 // component element accepts: name: name
};

// reads dir building array.
function loadDirs(dir) {
    var arr = fs.readdirSync(dir);
    return arr.filter(function(f){
        return !/\.[a-zA-Z0-9]+/.test(f);
    });
}

// simple string formatter
function stringFormat(str, formatters){
    var exp = /{(\d+)}/g,
        idx = 0;
    return str.replace(exp, function() {
        if(formatters[idx])
            return formatters[idx++];
    });
}

// converts string to a new
// regular expression.
function toRegExp(str){

    // if already regexp just return.
    if(str instanceof RegExp)
        return str;

    // if not a string need to
    // just return false so is ignored.
    if(typeof str !== 'string')
        return false;

    var exp, opts;

    // allow passing regexp options
    // in the string. options suffix
    // denoted by double colons.
    str = str.split('::');

    exp = str[0];
    opts = str[1] || '';

    // exp must have length
    if(!exp || !exp.length)
        return false;

    return new RegExp(exp, opts);
}

// simple object literal check
// careful not full proof but
// sufficient for this need.
function isPlainObject(obj) {
    var chkProto =  Object.prototype.toString.call(obj)  === '[object Object]';
    return (chkProto && (obj.constructor === {}.constructor));
}

// simple object extend method
// again not full proof but sufficient.
function extend(){
    var result,
        args = Array.prototype.slice.call(arguments);
    if(!args || !args.length)
        return {};
    args.forEach(function(obj){
        if(!result) {
            result = obj || {};
        }
        else {

            if(isPlainObject(obj)){
                for(var prop in obj){
                    if(obj.hasOwnProperty(prop)){
                        // if object extend
                        if(isPlainObject(obj[prop])){
                            result[prop] = extend(result[prop] || {}, obj[prop]);
                        }
                        else {
                            // always update if undefined.
                            if(result[prop] === undefined){
                                result[prop] = obj[prop];
                            }
                            else {
                                // if string ensure has length
                                if(typeof obj[prop] === 'string' && obj[prop].length){
                                    result[prop] = obj[prop];
                                }
                                else if(typeof obj[prop] !== 'string' && obj[prop] !== undefined){

                                    result[prop] = obj[prop];
                                }

                            }
                        }
                    }
                }
            }
        }
    });
    return (result || {});
}

// takes the token array
// returning an array of
// names that must be imported.
function getImportName(arr){

    var result = [];

    arr.forEach(function(el){
        if(!/as/.test(el)) {
            result.push(el);
        }
        else {
            // take last element
            // as it is our export name.
            el = el.trim().split(' ');
            result.push([el[0], el.pop()]);
        }
    });

    return result;
}

// normalize the export
// decorated line removing
// unneeded tokens/chars
// returning array of export names.
function normalizeExport(exp) {


    exp = exp.replace(/\s{2,}/g, ' ')
             .replace(/(\(|\)|;)/g, '')
             .trim();

    // checking for export {}.
    if(exp[exp.length -1] === '}'){

        exp = exp.substr(exp.indexOf('{'), exp.length -1)
                 .replace(/({|})/g, '')
                 .replace(/, /g, ',')
                 .trim()
                 .split(',');


    }

    // limit length when not export {}.
    else {

        // break the export out into
        // components so we can re-
        // arrange for defaults or as.
        var tmp = exp.replace(/({|})/g, '').trim().split(' ');
        exp = [];

        // we only need a length of 4
        // elements all other tokens can
        // be discarded.
        if(tmp.length > 4)
           tmp.splice(4, tmp.length - 4);

        // if default exists make sure
        // we decorate that the export
        // was a default as we'll need
        // to appropriately create the
        // import as a default type import.
        if(tmp[1] === 'default'){

            // when the third element is
            // a class, function
            if(tmp[2] === 'function' || tmp[2] === 'class'){
                exp.push(tmp[3] + ' as default');
            }

            // when 3rd element is not
            // function or class.
            else {

                exp.push(tmp[2] + ' as default');

            }
        }

        // handle direct export
        // of let and var
        else {

            exp.push(tmp[2]);

        }

    }

    return exp || [];

}

// expects export to be
// in single line in form of:
// export default ComponentSuffix.
function getTokens(file) {

    if(!fs.existsSync(file))
        return undefined;

    // should be only one row
    // with export token.
    var rows;

    rows = fs.readFileSync(file).toString()
             .split('\n').filter(function(r){
        return /^export/.test(r);
    });

    if(!rows || !rows.length)
        return undefined;

    var filteredRows = [];

    rows.forEach(function (r) {
        var normalized = normalizeExport(r);

        // ensure no dups.
        normalized.forEach(function(n) {
            if(filteredRows.indexOf(n) === -1){
                filteredRows.push(n);
            }
        });
    });

    return filteredRows;


}

// walk files returning tree
// of directory & files by filter
function getTree(dir) {
    var results = [];
    var list = fs.readdirSync(dir)
        .sort(function(a,b) {
            if(b.dir > a.dir)
                return -1;
            if(a.dir > b.dir)
                return 1;
            return 0;
        });
    if(list && list.length){
        list.forEach(function(file) {
            file = dir + '/' + file;
            var stat = fs.statSync(file);
            if (stat && stat.isDirectory()){
                results = results.concat(getTree(file));
            } else {
                var basename = path.basename(file);
                if(/\.js$/.test(file)){
                    // test for filters.
                    if(basenameFilter && basenameFilter.test(basename))
                        return;
                    if(pathFilter && pathFilter.test(file))
                        return;
                    // filter passed return conf.
                    var tokens = getTokens(file);
                    if(tokens)
                        results.push({ dir: dir, file: file, tokens: tokens });
                }
            }
        });
    }
    return results;
}

// builds a type map using
// defined suffixes.
function buildTypeMap(types) {
    var obj = {};
    types = types || {};
    Object.keys(types).forEach(function(t){
        var type = types[t],
            suffix = type.suffix;
        if(suffix){
            // if not array convert to array.
            if(!(suffix instanceof Array)){
                if(suffix.indexOf(',') === -1)
                    suffix = [suffix];
                else
                    suffix = suffix.replace(/ /g, '').split(',');
            }
            // iterate array adding to map.
            suffix.forEach(function(s) {
                if(!obj[s])
                    obj[s] = t;
            });
        }
    });
    return obj;
}

// generate exports components files.
function genExports(conf, done) {

    var dirs, basePath, directoryFilter, directoryFilterType;

    conf = conf || {};
    conf.types = conf.types || {};
    conf.templates = conf.templates || {};
    conf.typeMap = conf.typeMap || {};

    // build type map and extend with
    // defaults to get final map.
    typeMap = extend({}, typeMap, buildTypeMap(conf.types));

    // extend the templates.
    templates = extend({}, templates, conf.templates);

    dirs = loadDirs(conf.directory);
    basePath = conf.directory;
    
    // file name filter expression.
    basenameFilter = toRegExp(conf.basenameFilter || basenameFilter);
    
    // path filter expression.
    pathFilter = toRegExp(conf.pathFilter || pathFilter);
    
    // array, csv string, or string regexp
    directoryFilter = conf.directoryFilter;

    // the type of dir filter
    // to include or exclude the list.
    directoryFilterType = conf.directoryFilterType;

    // if string convert to regexp.
    if(directoryFilter && typeof directoryFilter === 'string' && directoryFilter.indexOf(',') !== -1) {
        // if commas split and prepare
        // string for regexp creation.
        directoryFilter = directoryFilter.split(',');
        // join and create optional string for exp.
        directoryFilter = '(' + directoryFilter.join('|') + ')';
    }

    // if an array assume array of
    // string folder names to be filtered.
    if(directoryFilter instanceof Array)
        directoryFilter = '(' + directoryFilter.join('|') + ')';

    // finally create the area filter expression.
    directoryFilter = toRegExp(directoryFilter);

    // checks if a top level direcctory
    // should be included in output.
    function isIncluded(dir){

        if(!directoryFilter && !directoryFilterType)
            return true;



        if(directoryFilterType === 'include' && directoryFilter.test(dir))
            return true;

        if(directoryFilterType === 'exclude' && !directoryFilter.test(dir))
            return true;

        return false;

    }

    // normalize using either default
    // configuration or a custom config
    // provided in the parser configuration
    // from your package.json.
    function normalizeConf(nameType, nameKey) {

        var replacer, map, typeConf, mapConf;

        // check for config for the provided
        // type using nameType as selector.
        typeConf = conf.types[nameType];

        // check if contains a map for multiple
        // map configurations.
        map = (typeConf && typeConf.map);

        // if map exists then get the map config.
        // using the detailed nameKey.
        mapConf = (map && map[nameKey]);

        // confiures for the provided
        // config, sets prefix, casing etc.
        function configure(c) {

            // only convert to regexp if
            // is a string.
            if(c.replacer !== undefined){
                replacer = c.replacer;
                if(!(replacer instanceof RegExp))
                    replacer = new RegExp(replacer);
            }

            // if replacer exists replace.
            if(replacer)
                nameKey = nameKey.replace(replacer, '');

            // prefix the name key.
            if(c.prefix)
                nameKey = "'" + c.prefix +  nameKey + "'";

            // make name key lower.
            if(c.lowercase)
                nameKey = nameKey.toLowerCase();

            // capitalize the name key.
            if(c.capitalize)
                nameKey = nameKey.charAt(0) + nameKey.slice(1);

            // change name key to the
            // custom "as" name specified.
            if(c.as)
                nameKey = c.as;

        }
        
        // configure using the defined type
        // config or the map config.

        if(mapConf)
            configure(mapConf);

        if(typeConf)
            configure(typeConf);

        // return the normalized nameKey.
        return nameKey;

    }

    dirs.forEach(function(dir){

        // check if area dir should be
        // processed or ignored.
        if(!isIncluded(dir))
            return;


        dir = path.join(basePath, dir);

        var savepath = path.join(dir, 'components.js'),
            tree = getTree(dir),
            imports = [],
            content;

        // generate component map.
        // the component map is used
        // to build collection of
        // components for a give type.
        var compMap = {};

        // iterate tree
        tree.forEach(function(c) {

            var relPath = "'" + c.file.replace(dir, '.').replace('.js', '') + "'",
                tmpImports = [],
                filename = relPath.split('/').pop().replace(/'/g, '');

            // itearate each token
            // normalizing config.
            c.tokens.forEach(function(t) {

                var name,
                    nameType,
                    tmpImportArr,
                    defByType,
                    nameKey;

                // split into an array.
                t = t.split(' ');

                // set the initial nameType.
                nameType = t[0];

                // if undefined then we set
                // the nameType to default
                // so that it is added to
                // that collection instead of
                // making a "default" component group.
                if(nameType == 'undefined')
                    nameType = 'default';

                // check if as.
                if(t.indexOf('as') !== -1){

                    if(t[0] == 'undefined' || (t[2] && t[2] !== 'default'))
                        name = t[2];

                    // if default is type then
                    // there the import doesn't have a
                    // name ex: export default function mymethod()
                    // instead it was passed as anonymous
                    // ex: export default function ()
                    // in this case we set the import to the filename.
                    if (nameType === 'default')
                        name = filename;

                }

                // otherwise only one arg just set
                // to first arg as name.
                else {
                    name = t[0];
                }

                tmpImportArr = [];

                // the name being undefined
                // can happen when there is a
                // default export that is
                // decorated or points to a
                // class, func etc.
                // ex: export default MyClass.
                // in this case we set the name
                // to the nameType before it is
                // normalized.
                if(name === undefined) {
                    defByType = true;
                    name = nameType;
                }

                // convert names with "-" to camel case.
                if(name.indexOf('-')){
                    name = name.split('-');
                    var tmpImportNameStr = '';
                    name.forEach(function(n,idx) {
                        if(idx === 0){
                            tmpImportNameStr += n;
                        } else {
                            tmpImportNameStr += (n.charAt(0).toUpperCase() + n.slice(1));
                        }
                    });
                    name = tmpImportNameStr;
                }


                // add the name to temp imports.
                tmpImportArr.push(name);

                // parse the name getting the
                // name type by extracting the
                // suffix from the nameType value.
                if(nameType !== 'default'){
                    var len = nameType.length,
                        origNameType = nameType;
                    nameType = nameType.slice(len -4).toLowerCase();
                    nameType = typeMap[nameType];

                    // this happens when you have
                    // an unknown/mapped type.
                    if(nameType === undefined){

                        // check if unmapped types
                        // are enabled
                        if(conf.unmapped !== false){

                            nameType = origNameType;

                            // becuase this is any
                            // unknown type we don't
                            // want to ouput nested
                            // within itself so we
                            // add the type to the configs
                            // and specify nested false.
                            conf.types[nameType] = { nested: false };

                        }
                    }

                }

                // check for typed components
                // where the component map matches
                // the nameType.
                if(nameType){

                    // when we create the import
                    // statement we need to know if
                    // the import is imported using
                    // a default alias
                    // ex: import MyName from path
                    // rather than
                    // ex: import { MyName, OtherName } from path.
                    if(nameType === 'default' || defByType)
                        tmpImportArr.push('default');

                    // add to temp imports.
                    tmpImports.push(tmpImportArr);

                    var tmpName = name === 'default' ? nameType : name;

                    // check if needs to be normalized.
                    nameKey = normalizeConf(nameType, tmpName);

                    // ensure map has default array.
                    compMap[nameType] = compMap[nameType] || [];

                    // ensure default compoents don't
                    // have extra prefixed tabs.
                    var compPropTemplate = templates.componentProperty;

                    if(nameType === 'default')
                        compPropTemplate = compPropTemplate.replace(/^\t/, '');

                    // add the component.
                    compMap[nameType].push(stringFormat(compPropTemplate, [nameKey, name]));

                }

            });

            // checks if is import type of default.
            var hasDefault = tmpImports.filter(function(i){
                return i[1] && i[1] === 'default';
            });

            //if(tmpImports.length > 1 && hasDefault.length > 0)
            //    throw new Error('Import statement using "default" could NOT be created, ' +
            //        'the import collection is invalid.');

            if(hasDefault && hasDefault.length) {
                var importName = tmpImports[0];
                tmpImports = importName.shift();
            } else {
                tmpImports = '{ ' +  tmpImports.join(', ') + ' }';
            }

            imports.push(stringFormat(templates.importFrom, [tmpImports, relPath]));

        });

        ///////////////////////////////////////////
        ///////////// BUILD TEMPLATE //////////////
        ///////////////////////////////////////////

        // add message.
        content = '/**\n* AUTO GENERATED FILE\n* Do not edit this file it\n* will be overwritten.\n*/\n\n';

        // add the imports.
        content += imports.join('\n');

        // add export statement
        content += templates.exportStart;

        // iteate each component type
        // adding its components.
        var compKeys = Object.keys(compMap);

        var defaultContent = '',  // untyped default content.
            typedContent = '';    // content that is typed.

        compKeys.forEach(function(c, i) {

            if(c === 'default')
                return;

            var stopAppend = ',\n';

            // if the last element
            // we don't need comma.
            if(i+1 === compKeys.length)
                stopAppend = '\n';

            var type = conf.types[c];

            // when a defined type exists but
            // has a configuration where nested
            // is false do NOT nest the
            // declaration within an object
            // of its type
            // ex: sometype: { mycomp: mycomp }
            // instead add to the default collection
            // so that the component will be
            // decorated on the top level of
            // export default { mycomp: mycomp }
            if(type && type.nested === false){

                compMap.default = compMap.default || [];
                compMap.default = compMap.default.concat(compMap[c]);
                // delete for good measure.

            }

            // add component that was statically
            // imported from the static export
            // ex: export { MyCtrl, MyFact }
            // then imported
            // ex: import { MyCtrl, MyFact } from '/some/path'.
            else {
                // add the component to
                // the typed component string.
                typedContent += templates.componentStart.replace('{0}', c);
                typedContent += compMap[c].join(',\n');
                typedContent += (templates.componentStop + stopAppend);
            }

        });

        // re-export types that were
        // imported using default.
        if(compMap.default){

            // ensure all default map
            // declarations have only one
            // begining tab character.
            // we need to do this because
            // any types that have "nested": false
            // may have been added after the fact.
            compMap.default.forEach(function(def, i) {
               compMap.default[i] = def.replace(/^\t\t/, '\t');
            });

            defaultContent += compMap.default.join(',\n');
            defaultContent += ',\n';

        }

        // if no typed components
        // then remote the last comma.
        if(!typedContent.length)
            defaultContent = defaultContent.replace(/(,|,\n)$/, '\n');

        // always remove last comma
        // the typedContent string.
        typedContent = typedContent.replace(/(,|,\n)$/, '');


        // add default and
        // typed inner content.
        content += defaultContent;
        content += typedContent;

        // close out the content.
        content += templates.exportStop;

        // write out the file.
        fs.writeFileSync(savepath, content, 'utf8');

    });

    // if callback is function call.
    if(typeof done === 'function')
        done();
}

module.exports = {
    getTree: getTree,
    getTokens: getTokens,
    genExports: genExports
};