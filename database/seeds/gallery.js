exports.seed = function(knex) {
  // Deletes ALL existing entries
  return knex("gallery")
    .del()
    .then(function() {
      // Inserts seed entries
      return knex("gallery").insert([
        {
          link:
            "https://monsterhunterworld.wiki.fextralife.com/file/Monster-Hunter-World/namielle-beta-plus-set-mhw-wiki-guide.png",
          description: "Namielle Armor Set",
          user_id: 1
        },
        {
          link:
            "https://monsterhunterworld.wiki.fextralife.com/file/Monster-Hunter-World/velkhana_alpha_plus_armor_set-mhw-wiki-guide.png",
          description: "Velkhana Armor Set",
          user_id: 1
        },
        {
          link:
            "https://monsterhunterworld.wiki.fextralife.com/file/Monster-Hunter-World/odogaron-alpha-plus-set1.png",
          description: "Odogaron Alpha Armor",
          user_id: 2
        }
      ]);
    });
};
