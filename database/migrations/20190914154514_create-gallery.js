exports.up = function(knex) {
  return knex.schema.createTable("gallery", table => {
    table.increments();
    table.string("link").notNullable();
    table.string("description");
    table
      .integer("user_id")
      .references("id")
      .inTable("users");
    table.timestamps(true, true);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable("gallery");
};
