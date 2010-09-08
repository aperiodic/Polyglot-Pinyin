

function Transliterate(word_list, settings, response_callback) 
{
  const MAX_TRANSLITERATE_QUERY_LENGTH = 5;
  var transliteration_list = [];
  google.load("language", "1");

  send_transliteration_batch = function(word_list, word_list_length, response_callback, settings)
  {
    google.language.transliterate(word_list, "en", settings.getSetting("transliterate_target_language"), function (result)
    {
      for (var word_id in word_list) {
        transliteration_list.push({word:word_list[word_id], translation: result.transliterations[word_id].transliteratedWords[0]});
      }
      if (transliteration_list.length >= word_list_length) {
       response_callback(transliteration_list);
      }
    })
  }



  var i=0;
  var l=word_list.length;
  //Truncate really long pages so we don't inundate Google
  //with thousands of queries
  for (i = 0; i < l; i+= MAX_TRANSLITERATE_QUERY_LENGTH) {
    send_transliteration_batch(word_list.slice(i, i + MAX_TRANSLITERATE_QUERY_LENGTH), l, response_callback, settings);
  }
  send_transliteration_batch(word_list.slice(l - (l % MAX_TRANSLITERATE_QUERY_LENGTH)), l, response_callback, settings);


}