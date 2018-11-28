// const User = require('./User')


class Post {
  static setMapping(mapping) {
    mapping.forProperty('id').primary().increments();
    mapping.field('title', {type: 'string'});
    mapping.field('content', {type: 'text'});
    
    mapping.manyToOne('auther', {targetEntity: 'User', inversedBy: 'posts'})
    mapping.manyToMany('tags', {targetEntity: 'Tag', inversedBy: 'posts'})
  }
}

module.exports = Post;