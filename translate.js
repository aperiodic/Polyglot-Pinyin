function Translate(word_list, settings, response_callback) {
  const MAX_REQUEST_LENGTH = 240;
  const REFERER_URL = "http://code.google.com/p/chrome-polyglot/";
  //Ask Google what a bunch of words mean
  send_translation_batch = function(uri, word_sublist, word_list_length, response_callback, settings)
  {
    var xhr = new XMLHttpRequest();
    xhr.open("GET", uri, true);
    xhr.setRequestHeader("referrer", REFERER_URL);
    xhr.onreadystatechange = function() {
      if (xhr.readyState == 4) {  
        var response = JSON.parse(xhr.responseText.replace(/,{2,}/, ","));
        if (uri.indexOf("translate.google.com") < 0) {
          if (response.responseData == null)
          {
            alert(response.responseDetails);
          }

          if (response.responseData.length === undefined) {
            translation_list.push({word:word_sublist[0], translation: response.responseData.translatedText});
          }
          else {
            for (var i = 0; i < response.responseData.length; i++)
            { 
              translation_list.push({word:word_sublist[i], translation: response.responseData[i].responseData.translatedText});
            }
          }
          if (translation_list.length >= word_list_length)
          {
            response_callback(translation_list);
          }
        } else {
          if (response[0] == null) {
            alert(response.responseDetails);
            return;
          }
          
          for (var i = 0; i < response[0].length; i++) {
            var forms = response[0][i];
            var hanzi = forms[0].substring(0, forms[0].length - 1);
            var pinyin = forms[2].substring(0, 1).toLowerCase() + forms[2].substring(1, forms[2].length - 1);
            translation_list.push({
              word: word_sublist[i],
              translation: hanzi + " (" + pinyin + ")"
            });
          }
          if (translation_list.length >= word_list_length) {
            response_callback(translation_list);
          }
        }
      }
    }
    xhr.send();
  }

  var translation_list = [];
  var i;
  var l=word_list.length;
  var slice_start = 0;
  var xhr = new XMLHttpRequest();
  var uri;
  //Truncate really long pages so we don't inundate Google
  //with thousands of queries
  
  var target_lang = settings.getSetting("target_language");
  if ((target_lang == "zh-CN" || target_lang == "zh-TW") && settings.getSetting("show_pinyin") == "1") {
    var base_uri =  "http://translate.google.com/translate_a/t?client=t&"
    base_uri += "sl=" + settings.getSetting("starting_language") 
    base_uri += "&tl=" + target_lang + "&text=";
    uri = base_uri;
    for (i = 0; i < l;i++) {
      //This next case should never actually happen, but if it 
      //does we don't want to bug Google w/ empty requests
      if (word_list[i].length < 1) {
        translation_list.push({word:"", translation:""});
        continue;
      }
      if (uri.length + encodeURIComponent(word_list[i]).length + 4 > MAX_REQUEST_LENGTH) {
        send_translation_batch(uri, word_list.slice(slice_start, i), l, response_callback, settings);
        slice_start = i;
        uri = base_uri;
      }
      uri += encodeURIComponent(word_list[i]) + ".%20";
    }
    send_translation_batch(uri, word_list.slice(slice_start), l, response_callback, settings);
    
  } else {
    var base_uri =  "http://ajax.googleapis.com/ajax/services/language/translate?";
    base_uri += "langpair=" + settings.getSetting("starting_language") + "%7C" + target_lang;
    base_uri += "&v=1.0";  
    uri = base_uri;
    for (i = 0; i < l;i++) {
      //This next case should never actually happen, but if it 
      //does we don't want to bug Google w/ empty requests
      if (word_list[i].length < 1) {
        translation_list.push({word:"", translation:""});
        continue;
      }
      if (uri.length + encodeURIComponent(word_list[i]).length > MAX_REQUEST_LENGTH) {
        send_translation_batch(uri, word_list.slice(slice_start, i), l, response_callback, settings);
        slice_start = i;
        uri = base_uri;
      }
      uri += "&q=" + encodeURIComponent(word_list[i]);
    }

    send_translation_batch(uri, word_list.slice(slice_start), l, response_callback, settings);
  }
}
