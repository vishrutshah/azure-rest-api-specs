// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License. See License.txt in the project root for license information.

'use strict';

const exec = require('child_process').exec,
    execSync = require('child_process').execSync,
    util = require('util'),
    utils = require('../test/util/utils'),
    _ = require('lodash');

/**
 * @class
 */
class MomentOfTruth {
    constructor(options) {
        this.linterCmd = `autorest --azure-arm=true --message-format=json --input-file=`;
    }

    getLinterResult(swaggerPath) {
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
    }
}

module.exports = MomentOfTruth;
let samerIdea = new MomentOfTruth();
let swaggersToProcess = utils.getFilesChangedInPR();
let targetBranch = utils.getTargetBranch();
let sourceBranch = utils.getSourceBranch();

// swaggerToProcess = ['/Users/vishrut/git-repos/rest-repo-reorg/azure-rest-api-specs/arm-storage/2016-01-01/swagger/storage.json'];
_(swaggersToProcess).each(function (swagger) {
    samerIdea.getLinterResult(swagger).then((result) => {
        console.log(result);
    });
});

// Checkout the target branch
try {
    console.log(`targetBranch = ${targetBranch}`);
    console.log(execSync(`git checkout ${targetBranch}`, { encoding: 'utf8' }));
    console.log(execSync('git branch', { encoding: 'utf8' }));
    console.log(execSync('git log -2', { encoding: 'utf8' }));
} catch (err) {
    console.log(`An error occurred while getting the current branch ${util.inspect(err, { depth: null })}.`);
}

console.log(`>>>>>>>>>>>>>>>>>>Do it again on the target branch files>>>>>>>>>>>>>>>>>>`);

_(swaggersToProcess).each(function (swagger) {
    samerIdea.getLinterResult(swagger).then((result) => {
        console.log(result);
    });
});
