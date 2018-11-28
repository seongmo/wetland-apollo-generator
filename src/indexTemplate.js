module.exports =  `const path = require('path')
const { ApolloServer } = require('apollo-server')
const { mergeTypes, mergeResolvers, fileLoader } = require('merge-graphql-schemas')
const {Wetland} = require('wetland')


const config = require('./wetland')
const wetland = new Wetland({
  ...config,
  // debug: true
});

const typesArray = fileLoader(path.join(__dirname, './src/types'), { recursive: true })
const resolversArray = fileLoader(path.join(__dirname, './src/resolvers'))
const typeDefs = mergeTypes(typesArray, { all: true })
const resolvers = mergeResolvers(resolversArray)


const server = new ApolloServer({ 
  typeDefs, 
  resolvers,
  context: () => {
    const withScope = async handler => {
      let scope = wetland.getManager()
      const result = await handler(scope)
      await scope.flush()
      return result
    }
    
    return {
      wetland,
      withScope,
    }
  }
})

const {PORT=5000} = process.env

server.listen(PORT).then(({ url }) => {
  console.log(\`🚀  Server ready at \${url}\`)
})`