

class Tag {
  static setMapping(mapping) {
    mapping.forProperty('id').primary().increments();
    mapping.field('name', {type: 'string', size: 40});
    
    mapping.manyToMany('posts', {targetEntity: 'Post', mappedBy: 'tags'})
  }

  beforeCreate() {
    // return validationSchema.validate(this)
  }
}

module.exports = Tag;