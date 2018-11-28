// const yup = require('yup')

// const validationSchema = yup.object().shape({
//   phone: yup.string().min(3).max(14).required(),
//   password: yup.string().min(8).max(100).required()
// })

class User {
  static setMapping(mapping) {
    mapping.forProperty('id').primary().increments()
    mapping.field('name', {type: 'string', size: 40})
    mapping.field('password', {type: 'string', defaultTo:'12341234'})
    mapping.field('phone', {type: 'string' })
    mapping.field('detail', {type: 'string', nullable: true})
    
    mapping.oneToMany('posts', {targetEntity: 'Post', mappedBy: 'auther'})
  }

  beforeCreate() {
    // return validationSchema.validate(this)
  }
}

module.exports = User;