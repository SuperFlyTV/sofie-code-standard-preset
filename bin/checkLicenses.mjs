#! /usr/bin/env node
'use strict'
import meow from 'meow'
import { readPackageUpSync } from 'read-package-up'
import path from 'path'
import checker from 'license-checker'

const cli = meow(
	`
    Usage
      $ sofie-licensecheck
	  $ sofie-licensecheck --allowPackages "package-name@1.2.3;other-package@1.2.3"

    Options
	  --debug  Show full packages list
	  --allowPackages Semi-colon separated list of packages to ignore (eg cycle@1.0.3;underscore@1.12.0)
	  --allowList Which default list of licenses to use. Possible values: "MIT", "none". Defaults to "MIT"
	  --allowLicenses Semi-colon separated list of licenses to allow in addition to the default list (eg GPL-3.0-only;MIT)
`,
	{
		importMeta: import.meta,
		flags: {
			debug: {
				type: 'boolean',
			},
			allowPackages: {
				type: 'string',
			},
		},
	},
)

// This is so that when used in a private project it validates
const pkgInfo = readPackageUpSync()
const projectNameAndVersion = `${pkgInfo.packageJson.name}@${pkgInfo.packageJson.version}`

const allowLists = {
	MIT: 'MIT;BSD;ISC;Apache-2.0;CC0;CC-BY-3.0;CC-BY-4.0;Unlicense;Artistic-2.0;Python-2.0;BlueOak-1.0.0',
	none: '',
	// TODO - Add allowList with a list for GPL projects
}

const useAllowList = cli.flags.allowList || 'MIT'
let allowList = ''
if (useAllowList === 'none') {
	allowList = allowLists.none
} else if (useAllowList === 'MIT') {
	allowList = allowLists.MIT
} else {
	console.error(`Invalid argument value: --allowList: ${useAllowList} (possible values: "MIT", "none")`)
	process.exit(1)
}
if (cli.flags.allowLicenses) {
	allowList += `;${cli.flags.allowLicenses}`
}

let excludePackages = projectNameAndVersion
if (cli.flags.allowPackages) {
	excludePackages += `;${cli.flags.allowPackages}`
}

if (cli.flags.debug) {
	console.log('CLI flags', cli.flags)
	console.log('excludePackages', excludePackages)
	console.log('allowList', allowList)
}

checker.init(
	{
		start: path.resolve('.'),
		onlyAllow: allowList,
		excludePackages: excludePackages,
		summary: !cli.flags.debug,
	},
	(err, packages) => {
		if (err) {
			//Handle error
			console.error(err)
			process.exit(1)
		} else {
			if (cli.flags.debug) {
				console.log(packages)
			}
			process.exit(0)
		}
	},
)
