// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License. See License.txt in the project root for license information.

'use strict';

const exec = require('child_process').exec,
    execSync = require('child_process').execSync,
    util = require('util'),
    utils = require('../test/util/utils'),
    _ = require('underscore');

let swaggersToProcess = utils.getFilesChangedInPR();
let targetBranch = utils.getTargetBranch();
let sourceBranch = utils.getSourceBranch();
let linterCmd = `autorest --azure-arm=true --message-format=json --input-file=`;
let gitCheckoutCmd = `git checkout ${targetBranch}`;
let gitLogCmd = `git log -3`;

//executes promises sequentially by chaining them.
function executePromisesSequentially(promiseFactories) {
    let result = Promise.resolve();
    promiseFactories.forEach(function (promiseFactory) {
        result = result.then(promiseFactory);
    });
    return result;
};

function runTools(swagger) {
    console.log(`Processing "${swagger}":`);
    return getLinterResult(swagger).then(function (linterErrors) {
        console.log(linterErrors);
        return;
    });
};


function getLinterResult(swaggerPath) {
    if (swaggerPath === null || swaggerPath === undefined || typeof swaggerPath.valueOf() !== 'string' || !swaggerPath.trim().length) {
        throw new Error('swaggerPath is a required parameter of type "string" and it cannot be an empty string.');
    }

    let self = this;
    let cmd = self.linterCmd + swaggerPath;

    return new Promise((result) => {
        exec(cmd, { encoding: 'utf8', maxBuffer: 1024 * 1024 * 64 }, (err, stdout, stderr) => {
            let jsonResult = [];
            let resultString = stderr;
            if (resultString.indexOf('{') !== -1) {
                resultString = "[" + resultString.substring(resultString.indexOf('{')).trim().replace(/\}\n\{/g, "},\n{") + "]";
                //console.log('>>>>>> Trimmed Result...');
                //console.log(resultString);
                try {
                    jsonResult = JSON.parse(resultString);
                    //console.log('>>>>>> Parsed Result...');
                    //console.dir(resultObject, {depth: null, colors: true});
                } catch (e) {
                    console.log(`An error occurred while executing JSON.parse() on the linter output for ${swaggerPath}:`);
                    console.dir(resultString);
                    console.dir(e, { depth: null, colors: true });
                }
            }
            result(jsonResult);
        });
    });
};

console.log(swaggersToProcess);

//main function
function runScript() {
    let promiseFactories = _(swaggersToProcess).map(function (swagger) {
        return function () { return runTools(swagger); };
    });
    executePromisesSequentially(promiseFactories).then(() => {
        execSync(`${gitCheckoutCmd}`, { encoding: 'utf8' });
        execSync(`${gitLogCmd}`, { encoding: 'utf8' });
        return executePromisesSequentially(promiseFactories);
    });
}

runScript();
