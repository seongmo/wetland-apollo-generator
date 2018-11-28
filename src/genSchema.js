const fs = require('fs')
const path = require('path')
const R = require('ramda')
const shell = require('shelljs');
const pluralize = require('pluralize')
const prettier = require("prettier")



const inspectType = ({type, primary, relationship}) => (
  primary ? {type: 'primary'} :
  type ? {type: 'primitive', value: type } :
  relationship ? {type: 'relation', value: relationship.targetEntity, toMany: relationship.type.endsWith('ToMany'),  } :
  null
)

const typeMap = {
  integer:'Int', 
  string:'String', 
  text:'String', 
  float:'Float', 
  boolean:'Boolean', 
  date: 'Date',
  jsonb: 'Json',
}

const typeMapper = type => typeMap[type]

const inspectEntity = ({mapping}) => R.map(inspectType, mapping.getFields())


const toGqlType = ({type, value, toMany}) => (
  type === 'primary' ? 'ID' :
  type === 'primitive' ? typeMapper(value) :
  type === 'relation' ? (toMany ? `[${value}]` :  value) :
  null
)

const toGqlField = ([name, info]) => `${name}: ${toGqlType(info)}`
const toTypeDefs = (type, fields) => `type ${type} {
    ${R.map(toGqlField, R.toPairs(fields)).join('\n  ')}
  }`

const toGqlInput = ({type, value, toMany}) => (
  type === 'primary' ? 'ID' :
  type === 'primitive' ? typeMapper(value) :
  type === 'relation' ? (toMany ? `[${value}Input]` :  `${value}Input`) :
  null
)

const toGqlInputField = ([name, info]) => `${name}: ${toGqlInput(info)}`

const toTypeDefsInput = (type, fields) => `
  input ${type}Input {
    ${R.map(toGqlInputField, R.toPairs(R.filter(f=>f.type !== 'primary', fields))).join('\n  ')}
  }`

const toQuery = (type, fields) => `
  type Query {
    ${type.toLowerCase()}s(limit: Int, offset: Int): [${type}]
    ${type.toLowerCase()}(id: ID!): ${type}
  }`


const getMutaionInput = fields => {
  return R.toPairs(fields).map(([f,info]) => `${f}: ${toGqlInput(info)}`).join(', ')
}

const toMutaion = (type, fields) => `
  type Mutation {
    add${type}(input: ${type}Input!): ${type}
    update${type}(id: ID!, input: ${type}Input!): ${type}
    delete${type}(id: ID!): Int
  }`


const toResolvers = (type, fields) => {
  const lcType = type.toLowerCase() // TODO: Pluralize
  const plurType = pluralize(lcType)
  const relFields = R.keys(R.filter(f=>f.type==='relation', fields)).map(fn => `'${fn}'`).join()

  return `
  const getFieldNames = require('graphql-list-fields')

  function getPopulate (info, fields) {
    const rootFields = getFieldNames(info).map(f => f.replace(/\\..*$/,''))
    return fields.filter(rel => rootFields.includes(rel))
  }

  const resolvers = {
      Query: {
        ${lcType}: async (_, {id}, {withScope}, info) => {
          const populate = getPopulate(info, [${relFields}])
          return withScope(scope => scope.getRepository('${type}').findOne(id, {populate}))
        },
        ${plurType}: async (_, {limit, offset}, {withScope}, info) => {
          const populate = getPopulate(info, [${relFields}])
          return withScope(async scope => {
            const ${plurType} = await scope.getRepository('${type}').find(null,{populate, limit, offset})
            return ${plurType} || []
          })
        },
      },
      Mutation: {
        add${type}: async (_, {input}, {wetland, withScope}) => {
          return withScope(async (scope) => {
            let populator = wetland.getPopulator(scope)
            let ${lcType} = populator.assign(scope.getEntity('${type}'), input)
            await scope.persist(${lcType})
            return ${lcType}
          })
        },
        update${type}: async (_, {id, input}, {wetland, withScope}) => {
          return withScope(async scope => {
            const base = await scope.getRepository('${type}').findOne(id)
            if(!base) throw new Error('not found')
            const populator = wetland.getPopulator(scope)
            const ${lcType} = populator.assign(scope.getEntity('${type}'), input, base)
            return ${lcType}
          })
        },
        delete${type}: async (_, {id}, {wetland, withScope}) => {
          return withScope(async scope => {
            const ${lcType} = await scope.getReference('${type}', id)
            if(!${lcType}) throw new Error('not found')
            await scope.remove(${lcType})
            return 1
          })
        },
      }
    }

    module.exports = resolvers
  `
}

async function genSchema (wetland, outPath) {
  let manager = wetland.getManager();
  const entities = manager.getEntities()
  
  const data = R.map(inspectEntity, entities)
  // console.log(JSON.stringify(data, null, 2))

  const typeDefs = R.mapObjIndexed((fields, name) => ({
      // typeName: name,
      types: toTypeDefs(name, fields),
      inputs: toTypeDefsInput(name, fields),
      query: toQuery(name, fields),
      mutaion: toMutaion(name, fields),
    }), data)

  const resolvers = R.mapObjIndexed((fields, name) => toResolvers(name, fields), data)

  const typePath = path.resolve(outPath, 'types')
  // fs.mkdirSync('schema/types', { recursive: true })
  shell.mkdir('-p', typePath)

  R.toPairs(typeDefs).forEach(([typeName, defs]) => {
    const filename = `${typeName}.gql`
    const filePath = path.resolve(typePath, filename)
    const body = R.values(defs).join('\n\n')
    // console.log(filename)
    // console.log(filePath)
    const fmtBody = prettier.format(body, { parser: "graphql" })
    fs.writeFileSync(filePath, fmtBody)
    // console.log(fmtBody)
  })
  const filePath = path.resolve(typePath, 'common.gql')
  const body = `
    scalar Date
    scalar Json
  `
  const fmtBody = prettier.format(body, { parser: "graphql" })
  fs.writeFileSync(filePath, fmtBody)

  const resolversPath = path.resolve(outPath, 'resolvers')
  shell.mkdir('-p', resolversPath)
  R.toPairs(resolvers).forEach(([typeName, body]) => {
    const filename = `${typeName}.js`
    const filePath = path.resolve(resolversPath, filename)
    // const body = R.values(defs).join('\n\n')
    // console.log(filename)
    // console.log(filePath)
    const fmtBody = prettier.format(body, { semi: false, parser: "babylon" })
    fs.writeFileSync(filePath, fmtBody)
    // console.log(fmtBody)
  })
  // const typeDefs = R.mapObjIndexed(R.flip(toTypeDefs), data)
  // const typeDefs = R.juxt([getTypes, getInputs])(data)
  // console.log(typeDefs)
}

module.exports = genSchema
