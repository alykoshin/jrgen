//const _ = require('lodash')

const capitalize = (s) => s.charAt(0).toUpperCase() + s.slice(1)
const toCamel = (s, {lowerCase=false}={}) => {
  if (lowerCase) s = s.toLowerCase()
  return s
    // .replace(/([\.-_][a-z])/ig, (match,$1) => {
    //  return $1.toUpperCase()
    //    .replace('.', '')
    //    .replace('-', '')
    //    .replace('_', '');
    //});
    .replace(/([\-\_\.\ ])([a-z]?)/ig, (match,$1,$2)=>{/*console.log(`(${match})[${$1}][${$2}]`);*/return $2.toUpperCase();})
};
const getNameFromSchema = (schema, suffix) => {
  let name = schema?.info?.title ?? 'schema_info_title';
  //if (suffix) name += capitalize(suffix);
  //return name.replace(/[ \t]/g, '_');
  //console.log('getNameFromSchema:',name)
  name = toCamel(name, {lowerCase:true});
  name = capitalize(name);
  //console.log('getNameFromSchema:',name)
  return name + suffix;
}
const getMethodName = (schema, method) => {
  //console.log('method:', method);
  var methodName = "undefinedMethodName";
  if (schema.params) {
    //paramsType = getParamNameFromMethod(method, "RpcParams");
    //let name = method.replace(/\./g, "");
    let name = toCamel(method)
    //name = capitalize(name);
    methodName = name;
  }
  //console.log('methodName:', methodName);
  return methodName;
}
const getParamName = (schema, method) => {
  var paramsType = "?:undefined";
  if (schema.params) {
    //paramsType = getParamNameFromMethod(method, "RpcParams");
    //let name = method.replace(/\./g, "");
    let name = toCamel(method)
    name = capitalize(name);
    paramsType = ":" + name + "RpcParams";
  }
  return paramsType;
}
const getResultName = (schema, method) => {
  var resultType = "undefined";
  if (schema.result) {
    //let name = method.replace(/\./g, "");
    let name = toCamel(method)
    name = capitalize(name);
    resultType =  name + "RpcResult";
  }
  return resultType;
}

module.exports.Generator = class Generator {
  constructor() {
    this.fs = require("fs");
    this.path = require("path");
    this.json2ts = require("json-schema-to-typescript");
    this.utils = require(this.path.join(__dirname, "../../../", "utils.js"));

    this.templateDir = this.path.join(__dirname, "templates");
    this.templates = this.utils.loadTemplates(this.templateDir);
  }

  generate(schemas) {
    return new Promise((resolve, reject) => {
      var schema = this.utils.mergeSchemas(schemas);

      this.buildClient(schema).then(ts => {
        var artifacts = {};
        artifacts["RPCClient.ts"] = Buffer.from(
          this.templates["client.ts"],
          "utf-8"
        );



        //artifacts[schema.info.title + "Client.ts"] = Buffer.from(ts, "utf-8");
        artifacts[getNameFromSchema(schema, "Client.ts")] = Buffer.from(ts, "utf-8");



        resolve(artifacts);
      });
    });
  }

  buildClient(schema) {
    return new Promise((resolve, reject) => {
      var json2tsOptions = {
        bannerComment: "",
        style: {
          singleQuote: true
        }
      };

      var types = "";
      var methods = "";
      var promises = [];



      if (schema.methods) {



        Object.keys(schema.methods).forEach(key => {
          methods += this.buildRPCMethod(key, schema.methods[ key ]) + "\n";

          if (schema.methods[ key ].params) {
            var promise = this.json2ts.compile(
              schema.methods[ key ].params,


              //key.replace(/\./g, "") + "RpcParams.json",
              toCamel(key) + "RpcParams.json",

              json2tsOptions
            );
            promise.then(ts => {
              types += ts + "\n\n";
            });
            promises.push(promise);
          }

          if (schema.methods[ key ].result) {
            var promise = this.json2ts.compile(
              schema.methods[ key ].result,


              //key.replace(/\./g, "") + "RpcResult.json",
              toCamel(key) + "RpcResult.json",


              json2tsOptions
            );
            promise.then(ts => {
              types += ts + "\n\n";
            });
            promises.push(promise);
          }
        });



      } else {
        console.warn(`no schema.methods found for schema`, schema);
      }
      if(schema.definitions) {



        Object.keys(schema.definitions).forEach(key => {
          var promise = this.json2ts.compile(
            schema.definitions[key],
            key.replace(/\./g, "") + ".json",
            json2tsOptions
          );
          promise.then(ts => {
            types += ts + "\n\n";
          });
          promises.push(promise);
        });



      } else {
        console.warn(`no schema.definitions found for schema`, schema);
      }



      Promise.all(promises).then(() => {
        resolve(
          this.utils.populateTemplate(this.templates["base.ts"], {



            //TITLE: schema.info.title + "Client",
            TITLE: getNameFromSchema(schema, "Client"),



            METHODS: methods,
            TYPES: types
          })
        );
      });
    });
  }

  buildRPCMethod(method, schema) {

    //console.log(schema)
    //console.log(schema?.methods?.[method])

    const methodStr = getMethodName(schema, method);
    const paramsType = getParamName(schema, method);
    const resultType = getResultName(schema, method);

    return this.utils.populateTemplate(this.templates["method.ts"], {
      METHOD: method,
      //METHOD: methodStr,
      //NAME: method.replace(/\./g, "_"),
      NAME: methodStr,
      PARAMS_TYPE: paramsType,
      RESULT_TYPE: resultType,
      SUMMARY:  schema.summary,
      DESCRIPTION: schema.description,
    });
  }
};
