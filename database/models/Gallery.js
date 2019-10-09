const bookshelf = require("../bookshelf");

class Gallery extends bookshelf.Model {
  get tableName() {
    return "gallery";
  }

  users() {
    return this.belongsTo("User");
  }

  get hasTimestamps() {
    return true;
  }
}

module.exports = bookshelf.model("Gallery", Gallery);
