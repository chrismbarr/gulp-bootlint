/*
 * gulp-bootlint
 * https://github.com/tschortsch/gulp-bootlint
 *
 * Copyright (c) 2015 Juerg Hunziker
 * Licensed under the MIT license.
 */

'use strict';
var gutil = require('gulp-util');
var PluginError = gutil.PluginError;
var through = require('through2');
var chalk = require('chalk');
var Log = require('log');
var merge = require('merge');
var bootlint = require('bootlint');

// consts
var PLUGIN_NAME = 'gulp-bootlint';

function gulpBootlint(options) {
    var hasError = false,
        hasWarning = false,
        log, stream;

    options = merge({
        stoponerror: false,
        stoponwarning: false,
        loglevel: 'error',
        disabledIds: []
    }, options);

    log = new Log(options.loglevel);

    // creating a stream through which each file will pass
    stream = through.obj(function (file, enc, cb) {
        var errorCount = 0,
            warningCount = 0;

        if (file.isNull()) {
            return cb(null, file);
        }

        if (file.isStream()) {
            this.emit('error', new PluginError(PLUGIN_NAME, 'Streams are not supported!'));
            return cb();
        }

        var reporter = function (lint) {
            var isError = (lint.id[0] === 'E'),
                isWarning = (lint.id[0] === 'W'),
                lintId = (isError) ? chalk.bgRed.white(lint.id) : chalk.bgYellow.white(lint.id),
                errorElementsAvailable = false;

            if (lint.elements) {
                lint.elements.each(function (_, element) {
                    var errorLocation = element.startLocation,
                        message = file.path + ':' + (errorLocation.line + 1) + ':' + (errorLocation.column + 1) + ' ' + lintId + ' ' + lint.message;
                    if(isError) {
                        log.error(message);
                    } else {
                        log.warning(message);
                    }
                    errorElementsAvailable = true;
                });
            }
            if (!errorElementsAvailable) {
                var message = file.path + ': ' + lintId + ' ' + lint.message;
                if(isError) {
                    log.error(message);
                } else {
                    log.warning(message);
                }
            }

            if(isError) {
                ++errorCount;
                hasError = true;
            }
            if(isWarning) {
                ++warningCount;
                hasWarning = true;
            }
            file.bootlint.success = false;
            file.bootlint.issues.push(lint);
        };

        log.debug(chalk.gray('Linting file ' + file.path));
        file.bootlint = { success: true, issues: [] };
        bootlint.lintHtml(file.contents.toString(), reporter, options.disabledIds);

        if(errorCount > 0 || warningCount > 0) {
            log.debug(chalk.red(errorCount + ' lint error(s) and ' + warningCount + ' lint warning(s) found in file ' + file.path));
        } else {
            log.debug(chalk.green(file.path + ' is lint free!'));
        }

        return cb(null, file);
    }, function(cb) {
        if((hasError && options.stoponerror) || (hasWarning && options.stoponwarning)) {
            this.emit('error', new PluginError(PLUGIN_NAME, 'Lint errors found!'));
        }

        return cb();
    });

    return stream;
};

// exporting the plugin
module.exports = gulpBootlint;