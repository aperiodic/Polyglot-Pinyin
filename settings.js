

function Settings() {
  this.default_settings = {
    "transliterate":0,
    "pinyin":0,
    "probability":10,
    "minimum_length":4,
    "join_short": 1,
    "joined_probability":8,
    "color_translated":1,
    "translation_color":"660000",
    "color_changed_only": 1,
    "start_enabled": 1,
    "join_adjacent": 1,
    "parenthesize_original": 0,
    "starting_language":"en",
    "target_language":"fr",
    "transliterate_target_language":"ar"
  }


  this.reset_settings = function reset_settings(name)
  {
    for (setting in this.default_settings)
    {
      localStorage[setting] = this.default_settings[setting];
    }
  }
  

  this.getSetting = function(name) 
  {
    if (localStorage[name] === undefined)
    {
      return this.default_settings[name];
    }
    else
    {
      return localStorage[name];
    }
  }

  this.getSettings = function()
  {
    var return_array = {};
    for (name in this.default_settings)
    {
      return_array[name] = this.getSetting(name);
    } 
    return return_array;
  }
}
