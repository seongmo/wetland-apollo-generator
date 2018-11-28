#! /usr/bin/env node
const fs = require('fs')
const path = require('path')
const {Wetland} = require('wetland')
const shell = require('shelljs')
const genSchema = require('./genSchema')
const indexJs = require('./indexTemplate')

const usage = `
wetland-apollo-gen entityPath
`

const argv = require('minimist')(process.argv.slice(2))
const entityPath = argv.i || argv._[0]
if(!entityPath) {
  console.log(usage)
}
const wetland = new Wetland({
  entityPath: path.resolve(process.cwd(), 'entities')
})

fs.writeFileSync('index.js', indexJs)
if(!fs.existsSync('package.json')) {
  shell.exec('npm init -y',{silent:true})
}
console.log('install dependencies')
shell.exec('npm i apollo-server graphql graphql-list-fields merge-graphql-schemas wetland yup')
// shell.exec('touch ')
const pkgPath = path.resolve(process.cwd(), 'package.json')
// console.log(pkgPath);
const package = require(pkgPath)
package.scripts = {start: 'node index.js', ...package.scripts, }
// console.log(package);
fs.writeFileSync(pkgPath, JSON.stringify(package, null, 2))

shell.mkdir('-p', 'src')
shell.cd('src')
// shell.mkdir('-p', 'src/resolvers')




genSchema(wetland, process.cwd())

console.log('done');
process.exit()