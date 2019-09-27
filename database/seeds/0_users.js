const bcrypt = require("bcryptjs");

exports.seed = function(knex) {
  // Deletes ALL existing entries
  return knex("users")
    .del()
    .then(function() {
      // Inserts seed entries
      return knex("users").insert([
        { username: "one", password: bcrypt.hashSync("two", 12) },
        { username: "three", password: bcrypt.hashSync("four", 12) },
        { username: "five", password: bcrypt.hashSync("six", 12) }
      ]);
    });
};
